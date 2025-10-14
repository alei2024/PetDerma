// pages/community/community.js
const app = getApp();
const {
  processImageList,
  processImageUrl,
} = require("../../utils/image-loader");

// 使用和帖子图片相同的处理方式
function processAvatarUrl(avatarObj) {
  if (!avatarObj) return "/images/user_default.png";

  // 使用成功的图片处理工具
  const processedUrl = processImageUrl(avatarObj);

  if (processedUrl) {
    return processedUrl;
  }
  return "/images/user_default.png";
}
Page({
  data: {
    searchKeyword: "",
    postList: [],
    originalPostList: [], // 存储原始帖子数据，用于本地搜索
    isRefreshing: false,
    isLoadingMore: false,
    hasMore: true,
    currentPage: 1,
    pageSize: 10,
    isLoading: false, // 防止重复加载
    showUserMenuModal: false,
    // 删除了帖子菜单相关数据
    isSearching: false, // 是否在搜索状态
    // 图像搜索相关
    searchImage: "", // 搜索图片路径
    isImageSearchMode: false, // 是否为图像搜索模式
    searchImageData: null, // 搜索图片的base64数据
  },

  // 检查用户是否已登录
  checkLoginStatus: function () {
    const app = getApp();
    const token = wx.getStorageSync("token") || app.globalData.token;
    const userInfo = wx.getStorageSync("userInfo") || app.globalData.userInfo;

    console.log("🔍 检查登录状态:", {
      hasLogin: app.globalData.hasLogin,
      hasToken: !!token,
      hasUserInfo: !!userInfo,
      token: token ? token.substring(0, 20) + "..." : "null",
    });

    return (
      app.globalData.hasLogin &&
      token &&
      token !== "test-token" &&
      userInfo &&
      userInfo.id
    );
  },

  // 显示登录提示
  showLoginPrompt: function (action = "进行此操作") {
    wx.showModal({
      title: "需要登录",
      content: `请先登录后再${action}`,
      confirmText: "去登录",
      cancelText: "取消",
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: "/pages/user/user",
          });
        }
      },
    });
  },

  onLoad: function () {
    this.loadPosts();
  },

  onShow: function () {
    // 检查是否需要刷新社区数据
    const app = getApp();
    if (app.globalData.needRefreshCommunity) {
      app.globalData.needRefreshCommunity = false;
      this.refreshPostList();
    } else {
      // 正常加载数据
      this.loadPosts();
    }
  },

  // 加载帖子数据
  async loadPosts() {
    // 防止重复加载
    if (this.data.isLoading) {
      console.log("正在加载中，跳过重复请求");
      return;
    }

    this.setData({ isLoading: true });
    wx.showLoading({ title: "加载中..." });
    try {
      const res = await app.request({
        url: `/api/posts?page=${this.data.currentPage}&pageSize=${this.data.pageSize}`,
        requireAuth: false, // 获取帖子列表不需要认证
      });

      if (res.data && res.data.success) {
        const posts = res.data.data.posts || [];
        const pagination = res.data.data.pagination || {};

        // 处理帖子数据
        const processedPosts = this.processPostsData(posts);

        if (this.data.currentPage === 1) {
          this.setData({
            postList: processedPosts,
            originalPostList: processedPosts, // 存储原始数据用于本地搜索
            hasMore:
              posts.length === this.data.pageSize ||
              (pagination.total || 0) > posts.length,
            isSearching: false, // 重置搜索状态
          });
        } else {
          // 去重合并：使用Map来确保ID唯一
          const existingIds = new Set(
            this.data.postList.map((post) => post._id || post.id)
          );
          const uniqueNewPosts = processedPosts.filter(
            (post) => !existingIds.has(post._id || post.id)
          );

          const newPostList = [...this.data.postList, ...uniqueNewPosts];
          const newOriginalList =
            this.data.currentPage === 1
              ? processedPosts
              : [...this.data.originalPostList, ...uniqueNewPosts];

          this.setData({
            postList: newPostList,
            originalPostList: newOriginalList,
            hasMore:
              posts.length === this.data.pageSize ||
              (pagination.total || 0) > newPostList.length,
          });
        }
      } else {
        wx.showToast({ title: "获取帖子失败", icon: "none" });
        // 显示空状态
        this.setData({
          postList: [],
          hasMore: false,
        });
      }
    } catch (e) {
      console.error("加载帖子失败:", e);
      wx.showToast({ title: "网络异常", icon: "none" });
      // 显示空状态
      this.setData({
        postList: [],
        hasMore: false,
      });
    } finally {
      wx.hideLoading();
      this.setData({ isLoading: false });
    }
  },

  // 搜索输入
  onSearchInput: function (e) {
    this.setData({
      searchKeyword: e.detail.value,
    });
  },

  // 执行搜索
  onSearch: function () {
    this.doSearch();
  },

  // 搜索按钮点击
  doSearch: function () {
    // 如果是图像搜索模式
    if (this.data.isImageSearchMode) {
      this.performImageSearch();
      return;
    }

    // 文字搜索逻辑
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) {
      wx.showToast({ title: "请输入搜索关键词", icon: "none" });
      return;
    }

    wx.showLoading({ title: "搜索中..." });

    // 重置分页和设置搜索状态
    this.setData({
      currentPage: 1,
      hasMore: true,
      isSearching: true,
    });

    app
      .request({
        url: `/api/posts?search=${encodeURIComponent(keyword)}&page=1&limit=${
          this.data.pageSize
        }`,
        requireAuth: false, // 搜索帖子不需要认证
      })
      .then((res) => {
        if (res.data && res.data.success) {
          const posts = res.data.data.posts || [];
          const pagination = res.data.data.pagination || {};

          // 处理搜索结果
          const processedPosts = this.processPostsData(posts);

          this.setData({
            postList: processedPosts,
            hasMore:
              posts.length === this.data.pageSize ||
              (pagination.total || 0) > posts.length,
          });

          if (posts.length === 0) {
            wx.showToast({ title: "未找到相关帖子", icon: "none" });
          } else {
            wx.showToast({
              title: `找到 ${pagination.count || posts.length} 个结果`,
              icon: "none",
            });
          }
        } else {
          wx.showToast({ title: "搜索失败", icon: "none" });
          // 搜索失败时使用本地过滤
          this.localSearch(keyword);
        }
      })
      .catch((e) => {
        console.error("搜索失败:", e);
        wx.showToast({ title: "网络异常", icon: "none" });
        // 网络异常时使用本地过滤
        this.localSearch(keyword);
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  // 处理帖子数据的通用方法
  processPostsData(posts) {
    return posts.map((post, index) => {
      // 确保每个帖子都有唯一的ID，添加时间戳和索引避免重复
      const uniqueId =
        post._id ||
        post.id ||
        `post_${Date.now()}_${index}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

      return {
        ...post,
        // 确保唯一ID字段 - 优先使用MongoDB的_id
        _id: uniqueId,
        id: uniqueId,
        // 使用新的图片处理工具 - 社区页面只显示前3张
        images: processImageList((post.images || []).slice(0, 3)),
        // 保存所有图片用于预览
        allImages: processImageList(post.images || []),
        // 保存原始图片数量用于显示
        totalImageCount: (post.images || []).length,
        // 处理用户信息显示
        username: post.authorId?.nickName || "匿名用户",
        userAvatar: processAvatarUrl(post.authorId?.avatar),
        // 格式化时间
        postTime: app.formatTime(new Date(post.createdAt || Date.now())),
        // 统一字段名称
        collectCount: post.favoriteCount || 0,
      };
    });
  },

  // 本地搜索（备用方案）
  localSearch(keyword) {
    // 如果没有原始数据，重新加载
    if (!this.originalPostList || this.originalPostList.length === 0) {
      console.log("⚠️ 没有原始数据，重新加载帖子");
      this.loadPosts();
      return;
    }

    const filteredPosts = this.originalPostList.filter((post) => {
      const keywordLower = keyword.toLowerCase();

      // 搜索帖子内容
      const contentMatch =
        post.content && post.content.toLowerCase().includes(keywordLower);

      // 搜索标签
      const tagMatch =
        post.tags &&
        post.tags.some((tag) => tag.toLowerCase().includes(keywordLower));

      // 搜索用户名
      const usernameMatch =
        post.username && post.username.toLowerCase().includes(keywordLower);

      // 搜索标题
      const titleMatch =
        post.title && post.title.toLowerCase().includes(keywordLower);

      return contentMatch || tagMatch || usernameMatch || titleMatch;
    });

    this.setData({
      postList: filteredPosts,
      hasMore: false,
    });

    if (filteredPosts.length === 0) {
      wx.showToast({ title: "未找到相关帖子", icon: "none" });
    } else {
      wx.showToast({
        title: `找到 ${filteredPosts.length} 个结果`,
        icon: "none",
      });
    }
  },

  // 清除搜索
  clearSearch: function () {
    this.setData({
      searchKeyword: "",
      currentPage: 1,
      isSearching: false,
      // 同时清除图像搜索
      searchImage: "",
      searchImageData: null,
      isImageSearchMode: false,
    });

    // 如果有原始数据，直接恢复；否则重新加载
    if (this.data.originalPostList && this.data.originalPostList.length > 0) {
      this.setData({
        postList: this.data.originalPostList,
        hasMore: true,
      });
    } else {
      this.loadPosts();
    }
  },

  // 下拉刷新
  onRefresh: function () {
    this.setData({
      isRefreshing: true,
      currentPage: 1,
    });

    this.loadPosts().then(() => {
      this.setData({ isRefreshing: false });
    });
  },

  // 加载更多
  loadMore: function () {
    if (!this.data.hasMore || this.data.isLoadingMore) return;

    this.setData({
      isLoadingMore: true,
      currentPage: this.data.currentPage + 1,
    });

    this.loadPosts().then(() => {
      this.setData({ isLoadingMore: false });
    });
  },

  // 显示用户菜单
  showUserMenu: function () {
    if (!this.checkLoginStatus()) {
      this.showLoginPrompt("查看个人内容");
      return;
    }
    this.setData({
      showUserMenuModal: true,
    });
  },

  // 跳转我的收藏
  goToMyCollections: function () {
    if (!this.checkLoginStatus()) {
      this.showLoginPrompt("查看我的收藏");
      return;
    }
    wx.navigateTo({
      url: "/pages/community/my-collections/my-collections",
    });
    this.hideUserMenu();
  },

  // 跳转我的评论
  goToMyComments: function () {
    if (!this.checkLoginStatus()) {
      this.showLoginPrompt("查看我的评论");
      return;
    }
    wx.navigateTo({
      url: "/pages/community/my-comments/my-comments",
    });
    this.hideUserMenu();
  },

  // 跳转我的发布
  goToMyPosts: function () {
    if (!this.checkLoginStatus()) {
      this.showLoginPrompt("查看我的发布");
      return;
    }
    wx.navigateTo({
      url: "/pages/community/my-posts/my-posts",
    });
    this.hideUserMenu();
  },

  // 隐藏用户菜单
  hideUserMenu: function () {
    this.setData({
      showUserMenuModal: false,
    });
  },

  // 显示帖子菜单
  // 删除了帖子菜单相关方法

  // 头像加载错误处理
  onAvatarError: function (e) {
    const defaultAvatar =
      e.currentTarget.dataset.default || "/images/user_default.png";
    const failedUrl = e.currentTarget.src || e.detail?.src || "unknown";

    console.log("❌ 头像加载失败:");
    console.log("  失败URL:", failedUrl);
    console.log("  使用默认头像:", defaultAvatar);

    // 更新数据中的头像URL
    const index = e.currentTarget.dataset.index;
    if (
      typeof index !== "undefined" &&
      this.data.posts &&
      this.data.posts[index]
    ) {
      const updateKey = `posts[${index}].userAvatar`;
      this.setData({
        [updateKey]: defaultAvatar,
      });
    }
  },

  // 查看帖子详情
  viewPostDetail: function (e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/community/detail/detail?id=${postId}`,
    });
  },

  // 发布帖子
  createPost: function () {
    if (!this.checkLoginStatus()) {
      this.showLoginPrompt("发布帖子");
      return;
    }
    wx.navigateTo({
      url: "/pages/community/post/post",
      events: {
        // 监听发帖成功事件
        postPublished: (data) => {
          // 立即刷新帖子列表
          this.refreshPostList();
        },
      },
    });
  },

  // 刷新帖子列表
  refreshPostList: function () {
    this.setData({
      currentPage: 1,
      postList: [],
      originalPostList: [], // 清除缓存的原始数据
      hasMore: true,
    });
    this.loadPosts();
  },

  // 切换点赞
  toggleLike: function (e) {
    if (!this.checkLoginStatus()) {
      this.showLoginPrompt("点赞");
      return;
    }
    const postId = e.currentTarget.dataset.id;

    // 先更新本地UI
    const postList = this.data.postList.map((post) => {
      if (post.id === postId || post._id === postId) {
        return {
          ...post,
          isLiked: !post.isLiked,
          likeCount: post.isLiked ? post.likeCount - 1 : post.likeCount + 1,
        };
      }
      return post;
    });

    this.setData({ postList });

    // 然后发送请求到服务器
    app
      .request({
        url: `/api/interactions/posts/${postId}/like`,
        method: "POST",
      })
      .then((res) => {
        if (res.success) {
          // 发送WebSocket事件
          this.sendWebSocketEvent("like_post", {
            postId: postId,
            isLiked: res.data.liked,
            likeCount: res.data.likeCount,
          });
        }
      })
      .catch((e) => {
        console.error("点赞操作失败:", e);
        // 请求失败时回滚UI状态
        this.loadPosts();
      });
  },

  // 切换收藏
  toggleCollect: function (e) {
    if (!this.checkLoginStatus()) {
      this.showLoginPrompt("收藏");
      return;
    }
    const postId = e.currentTarget.dataset.id;

    // 先更新本地UI
    const postList = this.data.postList.map((post) => {
      if (post.id === postId || post._id === postId) {
        return {
          ...post,
          isCollected: !post.isCollected,
          favoriteCount: post.isCollected
            ? (post.favoriteCount || post.collectCount || 0) - 1
            : (post.favoriteCount || post.collectCount || 0) + 1,
        };
      }
      return post;
    });

    this.setData({ postList });

    // 然后发送请求到服务器
    app
      .request({
        url: `/api/interactions/posts/${postId}/favorite`,
        method: "POST",
      })
      .then((res) => {
        if (res.success) {
          // 发送WebSocket事件
          this.sendWebSocketEvent("favorite_post", {
            postId: postId,
            isFavorited: res.data.favorited,
            favoriteCount: res.data.favoriteCount,
          });
        }
      })
      .catch((e) => {
        console.error("收藏操作失败:", e);
        // 请求失败时回滚UI状态
        this.loadPosts();
      });
  },

  // 显示评论
  showComments: function (e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/community/detail/detail?id=${postId}&tab=comments`,
    });
  },

  // 转发帖子
  sharePost: function (e) {
    if (!this.checkLoginStatus()) {
      this.showLoginPrompt("转发");
      return;
    }
    const postId = e.currentTarget.dataset.id;

    // 先更新本地UI
    const postList = this.data.postList.map((post) => {
      if (post.id === postId || post._id === postId) {
        return {
          ...post,
          shareCount: (post.shareCount || 0) + 1,
        };
      }
      return post;
    });

    this.setData({ postList });

    // 发送转发请求到服务器
    app
      .request({
        url: `/api/interactions/posts/${postId}/share`,
        method: "POST",
        data: { comment: "" },
      })
      .then(() => {
        wx.showToast({ title: "转发成功", icon: "success" });
      })
      .catch((e) => {
        console.error("转发操作失败:", e);
        // 请求失败时回滚UI状态
        this.loadPosts();
      });
  },

  // 预览图片
  previewImage: function (e) {
    const urls = e.currentTarget.dataset.urls;
    const current = e.currentTarget.dataset.current;

    console.log("🖼️ 社区页面图片预览调试:");
    console.log("预览图片列表:", urls);
    console.log("当前图片:", current);

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      wx.showToast({
        title: "图片列表为空",
        icon: "none",
      });
      return;
    }

    // 过滤出有效的图片路径
    const validUrls = urls.filter(
      (url) => url && typeof url === "string" && url.trim() !== ""
    );
    const currentUrl = validUrls.includes(current) ? current : validUrls[0];

    wx.previewImage({
      urls: validUrls,
      current: currentUrl,
      success: () => {
        console.log("社区页面图片预览成功");
      },
      fail: (error) => {
        console.error("社区页面图片预览失败:", error);
        wx.showToast({
          title: "图片预览失败",
          icon: "none",
        });
      },
    });
  },

  // 举报帖子
  reportPost: function () {
    this.hidePostMenu();
    wx.showToast({
      title: "举报成功",
      icon: "success",
    });
  },

  // 隐藏帖子
  hidePost: function () {
    this.hidePostMenu();
    wx.showToast({
      title: "已隐藏",
      icon: "success",
    });
  },

  // 发送WebSocket事件
  sendWebSocketEvent: function (eventType, data) {
    try {
      const app = getApp();
      const socket = app.globalData.socket;

      if (socket && app.globalData.socketConnected) {
        console.log(`📡 发送WebSocket事件: ${eventType}`, data);

        const message = JSON.stringify({
          type: eventType,
          payload: data,
          timestamp: Date.now(),
        });

        socket.send({
          data: message,
          success: () => {
            console.log(`✅ WebSocket事件发送成功: ${eventType}`);
          },
          fail: (error) => {
            console.error(`❌ WebSocket事件发送失败: ${eventType}`, error);
          },
        });
      } else {
        console.log("⚠️ WebSocket未连接，跳过事件发送");
      }
    } catch (error) {
      console.error("❌ 发送WebSocket事件失败:", error);
    }
  },

  // 图像搜索相关方法

  // 开始图像搜索
  startImageSearch: function () {
    const self = this;

    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      sizeType: ["compressed"],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        console.log("📷 选择图片成功:", tempFilePath);

        // 显示加载提示
        wx.showLoading({
          title: "处理图片中...",
          mask: true,
        });

        // 读取图片为base64
        wx.getFileSystemManager().readFile({
          filePath: tempFilePath,
          encoding: "base64",
          success: (fileRes) => {
            wx.hideLoading();

            // 设置图像搜索模式
            self.setData({
              searchImage: tempFilePath,
              searchImageData: fileRes.data,
              isImageSearchMode: true,
              searchKeyword: "", // 清空文字搜索
            });

            wx.showToast({
              title: "图片已选择",
              icon: "success",
              duration: 1500,
            });
          },
          fail: (error) => {
            wx.hideLoading();
            console.error("读取图片失败:", error);
            wx.showToast({
              title: "图片处理失败",
              icon: "none",
            });
          },
        });
      },
      fail: (error) => {
        console.error("选择图片失败:", error);
        if (error.errMsg !== "chooseMedia:fail cancel") {
          wx.showToast({
            title: "选择图片失败",
            icon: "none",
          });
        }
      },
    });
  },

  // 清除图像搜索
  clearImageSearch: function () {
    this.setData({
      searchImage: "",
      searchImageData: null,
      isImageSearchMode: false,
    });

    // 如果没有文字搜索，恢复原始帖子列表
    if (!this.data.searchKeyword) {
      this.setData({
        postList: this.data.originalPostList,
        isSearching: false,
      });
    }
  },

  // 执行图像搜索
  performImageSearch: function () {
    if (!this.data.searchImageData) {
      wx.showToast({
        title: "请先选择图片",
        icon: "none",
      });
      return;
    }

    wx.showLoading({
      title: "图像搜索中...",
      mask: true,
    });

    const app = getApp();

    // 调用后端图像相似度检测API
    app
      .request({
        url: "/api/posts/image-search",
        method: "POST",
        data: {
          image: this.data.searchImageData,
          page: 1,
          limit: this.data.pageSize,
        },
        requireAuth: false,
      })
      .then((res) => {
        wx.hideLoading();

        if (res.data && res.data.success) {
          const posts = res.data.data.posts || [];
          const processedPosts = this.processPostsData(posts);

          this.setData({
            postList: processedPosts,
            hasMore: posts.length === this.data.pageSize,
            isSearching: true,
            currentPage: 1,
          });

          if (posts.length === 0) {
            wx.showToast({
              title: "未找到相似图片",
              icon: "none",
            });
          } else {
            wx.showToast({
              title: `找到 ${posts.length} 个相似结果`,
              icon: "none",
            });
          }
        } else {
          wx.showToast({
            title: res.data?.message || "搜索失败",
            icon: "none",
          });
        }
      })
      .catch((error) => {
        wx.hideLoading();
        console.error("图像搜索失败:", error);
        wx.showToast({
          title: "搜索失败，请重试",
          icon: "none",
        });
      });
  },
});
