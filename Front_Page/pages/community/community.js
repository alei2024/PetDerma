// pages/community/community.js
const app = getApp();
const {
  processImageList,
  processImageUrl,
} = require("../../utils/image-loader");

// 使用和帖子图片相同的处理方式
function processAvatarUrl(avatarObj) {
  if (!avatarObj) return "/images/user_default.png";

  console.log("🔍 社区页面处理头像对象:", avatarObj);

  // 使用成功的图片处理工具
  const processedUrl = processImageUrl(avatarObj);

  if (processedUrl) {
    console.log("✅ 社区页面头像URL处理成功:", processedUrl);
    return processedUrl;
  }

  console.log("⚠️ 社区页面头像处理失败，使用默认头像");
  return "/images/user_default.png";
}
Page({
  data: {
    searchKeyword: "",
    postList: [],
    isRefreshing: false,
    isLoadingMore: false,
    hasMore: true,
    currentPage: 1,
    pageSize: 10,
    showUserMenuModal: false,
    showPostMenuModal: false,
    currentPostId: null,
  },

  // 跳转到测试页面
  goToTest: function () {
    wx.navigateTo({
      url: "/pages/debug/community-test",
    });
  },

  onLoad: function () {
    this.loadPosts();
  },

  onShow: function () {
    // 检查是否需要刷新社区数据
    const app = getApp();
    if (app.globalData.needRefreshCommunity) {
      console.log("🔄 检测到需要刷新社区数据");
      app.globalData.needRefreshCommunity = false;
      this.refreshPostList();
    } else {
      // 正常加载数据
      this.loadPosts();
    }
  },

  // 加载帖子数据
  async loadPosts() {
    wx.showLoading({ title: "加载中..." });
    try {
      const res = await app.request({
        url: `/api/posts?page=${this.data.currentPage}&pageSize=${this.data.pageSize}`,
      });

      if (res.data && res.data.success) {
        const posts = res.data.data.posts || [];
        const pagination = res.data.data.pagination || {};

        // 处理帖子数据，确保图片路径和用户信息正确
        const processedPosts = posts.map((post) => ({
          ...post,
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
          // 确保ID字段
          id: post._id || post.id,
        }));

        if (this.data.currentPage === 1) {
          this.setData({
            postList: processedPosts,
            hasMore:
              posts.length === this.data.pageSize ||
              (pagination.total || 0) > posts.length,
          });
        } else {
          this.setData({
            postList: [...this.data.postList, ...processedPosts],
            hasMore:
              posts.length === this.data.pageSize ||
              (pagination.total || 0) >
                this.data.postList.length + posts.length,
          });
        }
      } else {
        wx.showToast({ title: "获取帖子失败", icon: "none" });
        // 如果API请求失败，使用备用的mock数据
        this.useMockData();
      }
    } catch (e) {
      console.error("加载帖子失败:", e);
      wx.showToast({ title: "网络异常", icon: "none" });
      // 网络异常时使用备用的mock数据
      this.useMockData();
    } finally {
      wx.hideLoading();
    }
  },

  // 当API请求失败时使用的备用mock数据
  useMockData() {
    const mockPosts = [
      {
        id: "p001",
        username: "宠物达人小李",
        userAvatar: "/images_dogcat/三花猫.png",
        postTime: "2小时前",
        content:
          "我家猫咪最近出现了一些皮肤问题，有经验的朋友可以帮忙看看吗？主要是脖子和腋下有红斑，还有一些脱毛的情况。已经用了医生开的药膏，但效果不是很明显。",
        images: ["/images_dogcat/三花猫.png", "/images_dogcat/布偶猫.png"],
        tags: ["皮肤病", "求助", "猫咪"],
        likeCount: 12,
        commentCount: 8,
        collectCount: 5,
        isLiked: false,
        isCollected: false,
      },
      {
        id: "p002",
        username: "汪星人家长",
        userAvatar: "/images_dogcat/法斗.png",
        postTime: "5小时前",
        content:
          "分享一下我家狗狗治疗真菌感染的经验！经过两个月的治疗，终于完全康复了。主要用的是酮康唑洗液和口服药，配合营养补充。",
        images: ["/images_dogcat/法斗.png"],
        tags: ["真菌感染", "治疗经验", "狗狗"],
        likeCount: 28,
        commentCount: 15,
        collectCount: 12,
        isLiked: false,
        isCollected: true,
      },
      {
        id: "p003",
        username: "宠物医生王",
        userAvatar: "/images_dogcat/金毛.png",
        postTime: "昨天",
        content:
          "最近接诊了很多皮肤病案例，提醒各位宠物主人一定要注意宠物的日常卫生，保持环境干燥，定期检查宠物皮肤状况。",
        images: ["/images_dogcat/金毛.png"],
        tags: ["医生建议", "预防", "皮肤病"],
        likeCount: 45,
        commentCount: 22,
        collectCount: 30,
        isLiked: true,
        isCollected: true,
      },
      {
        id: "p004",
        username: "猫咪爱好者",
        userAvatar: "/images_dogcat/英短.png",
        postTime: "3天前",
        content:
          "英短猫常见的皮肤问题及护理方法分享。英短猫因为毛发浓密，容易出现毛囊炎等问题，日常梳理和适当的饮食调节非常重要。",
        images: ["/images_dogcat/英短.png", "/images_dogcat/美短.png"],
        tags: ["英短", "护理", "皮肤问题"],
        likeCount: 68,
        commentCount: 35,
        collectCount: 42,
        isLiked: false,
        isCollected: false,
      },
      {
        id: "p005",
        username: "狗狗训练师",
        userAvatar: "/images_dogcat/萨摩耶.png",
        postTime: "1周前",
        content:
          "记录一下我家边牧的康复过程。从发现皮肤问题到完全治愈用了3个月时间，期间换了2家医院，最终在专业的宠物皮肤科治好了。",
        images: ["/images_dogcat/边牧.png", "/images_dogcat/哈士奇.png"],
        tags: ["康复记录", "皮肤科", "边牧"],
        likeCount: 35,
        commentCount: 18,
        collectCount: 25,
        isLiked: true,
        isCollected: false,
      },
    ];

    this.setData({
      postList: mockPosts,
      hasMore: false,
    });
  },

  // 搜索输入
  onSearchInput: function (e) {
    this.setData({
      searchKeyword: e.detail.value,
    });
  },

  // 执行搜索
  onSearch: function () {
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) return;

    wx.showLoading({ title: "搜索中..." });

    app
      .request({
        url: `/api/posts?search=${encodeURIComponent(keyword)}`,
      })
      .then((res) => {
        if (res.data && res.data.success) {
          const filteredPosts = res.data.data.posts || [];
          this.setData({
            postList: filteredPosts,
            hasMore: false,
          });
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

  // 本地搜索（备用方案）
  localSearch(keyword) {
    const filteredPosts = this.data.postList.filter(
      (post) =>
        post.content.includes(keyword) ||
        post.tags.some((tag) => tag.includes(keyword)) ||
        post.username.includes(keyword)
    );

    this.setData({
      postList: filteredPosts,
      hasMore: false,
    });
  },

  // 清除搜索
  clearSearch: function () {
    this.setData({
      searchKeyword: "",
      currentPage: 1,
    });
    this.loadPosts();
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
    this.setData({
      showUserMenuModal: true,
    });
  },

  // 跳转我的收藏
  goToMyCollections: function () {
    wx.navigateTo({
      url: "/pages/community/my-collections/my-collections",
    });
    this.hideUserMenu();
  },

  // 跳转我的评论
  goToMyComments: function () {
    wx.navigateTo({
      url: "/pages/community/my-comments/my-comments",
    });
    this.hideUserMenu();
  },

  // 跳转我的发布
  goToMyPosts: function () {
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
  showPostMenu: function (e) {
    const postId = e.currentTarget.dataset.id;
    this.setData({
      showPostMenuModal: true,
      currentPostId: postId,
    });
  },

  // 隐藏帖子菜单
  hidePostMenu: function () {
    this.setData({
      showPostMenuModal: false,
      currentPostId: null,
    });
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
    wx.navigateTo({
      url: "/pages/community/post/post",
      events: {
        // 监听发帖成功事件
        postPublished: (data) => {
          console.log("✅ 收到发帖成功通知:", data);
          // 立即刷新帖子列表
          this.refreshPostList();
        },
      },
    });
  },

  // 刷新帖子列表
  refreshPostList: function () {
    console.log("🔄 刷新帖子列表");
    this.setData({
      currentPage: 1,
      postList: [],
      hasMore: true,
    });
    this.loadPosts();
  },

  // 切换点赞
  toggleLike: function (e) {
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
      .catch((e) => {
        console.error("点赞操作失败:", e);
        // 请求失败时回滚UI状态
        this.loadPosts();
      });
  },

  // 切换收藏
  toggleCollect: function (e) {
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
});
