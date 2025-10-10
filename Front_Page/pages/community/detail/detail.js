// pages/community/detail/detail.js
const app = getApp();
const {
  processImageList,
  processImageUrl,
} = require("../../../utils/image-loader");

// 使用和帖子图片相同的处理方式
function processAvatarUrl(avatarObj) {
  if (!avatarObj) return "/images/user_default.png";

  console.log("🔍 处理头像对象:", avatarObj);

  // 使用成功的图片处理工具
  const processedUrl = processImageUrl(avatarObj);

  if (processedUrl) {
    console.log("✅ 头像URL处理成功:", processedUrl);
    return processedUrl;
  }

  console.log("⚠️ 头像处理失败，使用默认头像");
  return "/images/user_default.png";
}

Page({
  data: {
    postId: "",
    postDetail: null,
    comments: [],
    commentList: [], // 用于WXML显示的评论列表
    newComment: "",
    currentTab: "content",
    isLoading: false,
    commentInputFocus: false,
    isRefreshing: false,
    pageSize: 10,
    currentPage: 1,
    hasMoreComments: true,
    // 评论输入相关
    showCommentInput: false,
    commentContent: "",
    commentImageList: [],
    replyToUser: "", // 回复的用户名
    replyToCommentId: "", // 回复的评论ID
  },

  onLoad: function (options) {
    // 接收从社区页面传递过来的MongoDB _id参数
    const postId = options.id || "";
    this.setData({
      postId: postId,
      currentTab: options.tab || "content",
    });

    if (postId) {
      this.fetchPostDetail(postId);
    }
  },

  onShow: function () {
    // 页面显示时刷新数据
    if (this.data.postId) {
      this.fetchPostDetail(this.data.postId);
      if (this.data.currentTab === "comments") {
        this.loadComments();
      }
    }

    // 启动WebSocket事件监听和轮询备用
    this.setupWebSocketListeners();
    this.startPolling();
  },

  onHide: function () {
    // 页面隐藏时清理监听器和停止轮询
    this.removeWebSocketListeners();
    this.stopPolling();
  },

  onUnload: function () {
    // 页面卸载时清理监听器和停止轮询
    this.removeWebSocketListeners();
    this.stopPolling();
  },

  // 设置WebSocket事件监听
  setupWebSocketListeners: function () {
    try {
      // 从全局 app 获取 WebSocket 连接
      const app = getApp();
      let socket = null;

      // 尝试获取 WebSocket 连接
      if (app.globalData && app.globalData.socket) {
        socket = app.globalData.socket;
      }

      if (socket && socket.connected) {
        console.log("📡 设置WebSocket事件监听");

        // 加入帖子房间（用于接收该帖子的实时更新）
        socket.emit("join_post", { postId: this.data.postId });

        // 监听实时事件
        socket.on("post_liked", this.handlePostLiked.bind(this));
        socket.on("post_favorited", this.handlePostFavorited.bind(this));
        socket.on("post_commented", this.handlePostCommented.bind(this));
      } else {
        console.log("⚠️ WebSocket未连接，使用轮询模式");
      }
    } catch (error) {
      console.error("❌ WebSocket设置失败:", error);
      console.log("🔄 使用轮询模式作为备用方案");
    }
  },

  // 移除WebSocket事件监听
  removeWebSocketListeners: function () {
    try {
      // 从全局 app 获取 WebSocket 连接
      const app = getApp();
      let socket = null;

      if (app.globalData && app.globalData.socket) {
        socket = app.globalData.socket;
      }

      if (socket) {
        console.log("📡 移除WebSocket事件监听");

        // 离开帖子房间
        socket.emit("leave_post", { postId: this.data.postId });

        // 移除事件监听
        socket.off("post_liked", this.handlePostLiked);
        socket.off("post_favorited", this.handlePostFavorited);
        socket.off("post_commented", this.handlePostCommented);
      }
    } catch (error) {
      console.error("❌ 移除WebSocket监听失败:", error);
    }
  },

  // 处理点赞事件
  handlePostLiked: function (data) {
    if (data.postId === this.data.postId) {
      console.log("📨 收到点赞事件:", data);
      this.setData({
        "postDetail.likeCount": data.likeCount || 0,
      });
      // 停止轮询，因为WebSocket已提供实时更新
      this.stopPolling();
    }
  },

  // 处理收藏事件
  handlePostFavorited: function (data) {
    if (data.postId === this.data.postId) {
      console.log("📨 收到收藏事件:", data);
      this.setData({
        "postDetail.favoriteCount": data.favoriteCount || 0,
      });
      this.stopPolling();
    }
  },

  // 处理评论事件
  handlePostCommented: function (data) {
    if (data.postId === this.data.postId) {
      console.log("📨 收到评论事件:", data);
      this.setData({
        "postDetail.commentCount": data.commentCount || 0,
      });
      // 如果当前在评论标签页，刷新评论列表
      if (this.data.currentTab === "comments") {
        this.loadComments();
      }
      this.stopPolling();
    }
  },

  // 启动轮询更新（WebSocket备用方案）
  startPolling: function () {
    // 清除之前的定时器
    this.stopPolling();

    // 检查WebSocket连接状态
    try {
      const app = getApp();
      let socket = null;

      if (app.globalData && app.globalData.socket) {
        socket = app.globalData.socket;
      }

      if (socket && socket.connected) {
        console.log("📡 WebSocket已连接，使用实时更新");
        return; // WebSocket正常时不启动轮询
      }
    } catch (error) {
      console.error("❌ 检查WebSocket状态失败:", error);
    }

    console.log("🔄 WebSocket未连接，启动轮询备用方案");
    // 每30秒轮询一次更新点赞数、评论数
    this.pollingTimer = setInterval(() => {
      if (this.data.postId) {
        this.refreshPostStats();
      }
    }, 30000); // 30秒轮询一次
  },

  // 停止轮询
  stopPolling: function () {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  },

  // 刷新帖子统计数据（点赞数、评论数等）
  refreshPostStats: function () {
    if (!this.data.postId) return;

    app
      .request({
        url: `/api/posts/${this.data.postId}`,
        method: "GET",
      })
      .then((res) => {
        if (res.data && res.data.success && res.data.data) {
          const updatedPost = res.data.data;
          // 只更新统计数据，不重新渲染整个页面
          this.setData({
            "postDetail.likeCount": updatedPost.likeCount || 0,
            "postDetail.commentCount": updatedPost.commentCount || 0,
            "postDetail.favoriteCount": updatedPost.favoriteCount || 0,
            "postDetail.shareCount": updatedPost.shareCount || 0,
          });
          console.log("📊 帖子统计数据已更新");
        }
      })
      .catch((err) => {
        console.error("刷新帖子统计失败:", err);
      });
  },

  // 使用MongoDB _id获取帖子详情
  fetchPostDetail: function (postId) {
    if (!postId) return;

    wx.showLoading({ title: "加载中..." });
    this.setData({ isLoading: true });

    // 使用真实的MongoDB _id调用API获取详情
    app
      .request({
        url: `/api/posts/${postId}`,
      })
      .then((res) => {
        if (res.data && res.data.success) {
          // 处理API返回的数据结构：{post, userInteractions}
          const apiData = res.data.data || {};
          const post = apiData.post || {};
          const userInteractions = apiData.userInteractions || {};

          console.log("📊 API返回的帖子数据:", post);
          console.log("👤 用户交互数据:", userInteractions);

          // 格式化帖子数据，确保UI正常显示
          const formattedPost = {
            // 确保使用MongoDB的_id
            _id: post._id || post.id,
            // 保持原始的authorId结构，确保WXML能正确访问
            authorId: {
              nickName: post.authorId?.nickName || "匿名用户",
              avatar: {
                url: processAvatarUrl(post.authorId?.avatar),
              },
            },
            // 帖子内容和元数据
            content: post.content || "",
            images: processImageList(post.images || []),
            tags: post.tags || [],
            likeCount: post.likeCount || 0,
            commentCount: post.commentCount || 0,
            favoriteCount: post.favoriteCount || 0,
            shareCount: post.shareCount || 0,
            // 使用userInteractions中的状态数据
            isLiked: userInteractions.isLiked || false,
            isFavorited: userInteractions.isFavorited || false,
            isShared: userInteractions.isShared || false,
            // 格式化时间显示
            postTime: app.formatTime(new Date(post.createdAt || Date.now())),
          };

          this.setData({
            postDetail: formattedPost,
          });

          // 帖子详情加载成功后，自动加载评论
          this.loadComments();
        } else {
          wx.showToast({ title: "获取帖子详情失败", icon: "none" });
          // 如果API请求失败，使用备用的mock数据
          this.useMockDetailData(postId);
        }
      })
      .catch((e) => {
        console.error("获取帖子详情失败:", e);
        wx.showToast({ title: "网络异常", icon: "none" });
        // 网络异常时使用备用的mock数据
        this.useMockDetailData(postId);
      })
      .finally(() => {
        wx.hideLoading();
        this.setData({ isLoading: false });
      });
  },

  // 当API请求失败时使用的备用mock数据
  useMockDetailData(postId) {
    // 根据传入的postId返回对应的mock数据
    const mockDetails = {
      p001: {
        id: postId, // 使用传入的ID，可能是MongoDB的_id
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
      p002: {
        id: postId,
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
      p003: {
        id: postId,
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
      p004: {
        id: postId,
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
      p005: {
        id: postId,
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
    };

    // 如果找不到对应的mock数据，使用默认数据
    const mockPost = mockDetails[postId] || {
      id: postId,
      username: "匿名用户",
      userAvatar: "/images/user_default.png",
      postTime: "未知时间",
      content: "该帖子详情无法加载",
      images: [],
      tags: [],
      likeCount: 0,
      commentCount: 0,
      collectCount: 0,
      isLiked: false,
      isCollected: false,
    };

    this.setData({
      postDetail: mockPost,
    });
  },

  // 加载评论
  loadComments: function () {
    if (!this.data.postId || this.data.isLoading) return;

    console.log("🔄 开始加载评论...");
    console.log("📍 帖子ID:", this.data.postId);
    console.log("📄 当前页码:", this.data.currentPage);
    console.log("📊 页面大小:", this.data.pageSize);

    wx.showLoading({ title: "加载评论..." });
    this.setData({ isLoading: true });

    const requestUrl = `/api/interactions/posts/${this.data.postId}/comments?page=${this.data.currentPage}&limit=${this.data.pageSize}`;
    console.log("🌐 请求URL:", requestUrl);

    app
      .request({
        url: requestUrl,
      })
      .then((res) => {
        if (res.data && res.data.success) {
          const comments = res.data.data.comments || [];

          console.log("📝 获取到的评论数据:", comments);

          // 格式化评论数据，确保数据结构与WXML匹配
          const formattedComments = comments.map((comment) => {
            console.log(
              `🔍 处理评论 ${comment._id}，原始回复数据:`,
              comment.replies
            );

            // 格式化回复数据
            const formattedReplies = (comment.replies || []).map((reply) => ({
              id: reply._id || reply.id,
              content: reply.content || "",
              username: reply.authorId?.nickName || "匿名用户",
              replyTo: reply.replyTo?.nickName || "",
              replyTime: app.formatTime(
                new Date(reply.createdAt || Date.now())
              ),
            }));

            console.log(
              `📝 评论 ${comment._id} 格式化后回复数据:`,
              formattedReplies
            );

            return {
              id: comment._id || comment.id,
              content: comment.content || "",
              // 保持原始的authorId结构，确保WXML能正确访问
              authorId: {
                nickName: comment.authorId?.nickName || "匿名用户",
                avatar: {
                  url: processAvatarUrl(comment.authorId?.avatar),
                },
              },
              // 兼容字段
              username: comment.authorId?.nickName || "匿名用户",
              userAvatar: processAvatarUrl(comment.authorId?.avatar),
              commentTime: app.formatTime(
                new Date(comment.createdAt || Date.now())
              ),
              likeCount: comment.stats?.likes || 0,
              isLiked: comment.userInteraction?.isLiked || false, // 从用户交互数据获取
              // 回复相关数据
              replies: formattedReplies,
              totalReplies: comment.totalReplies || 0,
            };
          });

          if (this.data.currentPage === 1) {
            this.setData({
              commentList: formattedComments,
            });
          } else {
            this.setData({
              commentList: [...this.data.commentList, ...formattedComments],
            });
          }

          // 检查是否还有更多评论
          this.setData({
            hasMoreComments: formattedComments.length === this.data.pageSize,
          });

          console.log("✅ 评论加载完成，数量:", formattedComments.length);
        } else {
          console.error("❌ 评论API返回失败:", res.data);
          wx.showToast({ title: "加载评论失败", icon: "none" });
          // 如果API请求失败，使用备用的mock数据
          this.useMockCommentsData();
        }
      })
      .catch((e) => {
        console.error("❌ 加载评论失败:", e);
        wx.showToast({ title: "网络异常", icon: "none" });
        // 网络异常时使用备用的mock数据
        this.useMockCommentsData();
      })
      .finally(() => {
        wx.hideLoading();
        this.setData({ isLoading: false });
      });
  },

  // 当API请求失败时使用的备用mock评论数据
  useMockCommentsData() {
    const mockComments = [
      {
        id: "c001",
        content:
          "我家猫咪之前也有类似的情况，建议去做个皮屑检查，确定是真菌还是螨虫。",
        username: "猫咪专家",
        userAvatar: "/images_dogcat/美短.png",
        commentTime: "1小时前",
      },
      {
        id: "c002",
        content: "请问用的是什么药膏呢？我家狗狗也有类似问题。",
        username: "狗狗主人",
        userAvatar: "/images_dogcat/柯基.png",
        commentTime: "2小时前",
      },
      {
        id: "c003",
        content: "保持皮肤干燥很重要，尽量不要让猫咪去潮湿的地方。",
        username: "宠物护理师",
        userAvatar: "/images_dogcat/萨摩耶.png",
        commentTime: "3小时前",
      },
    ];

    this.setData({
      comments: mockComments,
      hasMoreComments: false,
    });
  },

  // 切换标签
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tab,
      currentPage: 1,
      comments: [],
      hasMoreComments: true,
    });

    if (tab === "comments") {
      this.loadComments();
    }
  },

  // 输入评论
  onCommentInput: function (e) {
    this.setData({
      newComment: e.detail.value,
    });
  },

  // 发布评论
  submitComment: function () {
    const content = this.data.newComment.trim();
    if (!content || !this.data.postId) return;

    wx.showLoading({ title: "发布中..." });

    app
      .request({
        url: `/api/posts/${this.data.postId}/comments`,
        method: "POST",
        data: {
          content: content,
        },
      })
      .then((res) => {
        if (res.data && res.data.success) {
          wx.showToast({ title: "评论成功", icon: "success" });
          this.setData({
            newComment: "",
            commentInputFocus: false,
            currentPage: 1,
          });
          // 重新加载评论
          this.loadComments();
          // 刷新帖子详情以更新评论数
          this.fetchPostDetail(this.data.postId);
        } else {
          wx.showToast({ title: "评论失败", icon: "none" });
        }
      })
      .catch((e) => {
        console.error("发布评论失败:", e);
        wx.showToast({ title: "网络异常", icon: "none" });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  // 点赞帖子
  likePost: function () {
    if (!this.data.postId || !this.data.postDetail) return;

    const postDetail = this.data.postDetail;
    const newIsLiked = !postDetail.isLiked;

    // 先更新本地UI
    this.setData({
      "postDetail.isLiked": newIsLiked,
      "postDetail.likeCount": newIsLiked
        ? postDetail.likeCount + 1
        : postDetail.likeCount - 1,
    });

    // 然后发送请求到服务器
    app
      .request({
        url: `/api/interactions/posts/${this.data.postId}/like`,
        method: "POST",
      })
      .catch((e) => {
        console.error("点赞操作失败:", e);
        // 请求失败时回滚UI状态
        this.setData({
          "postDetail.isLiked": !newIsLiked,
          "postDetail.likeCount": newIsLiked
            ? postDetail.likeCount
            : postDetail.likeCount + 1,
        });
      });
  },

  // 收藏帖子
  collectPost: function () {
    if (!this.data.postId || !this.data.postDetail) return;

    const postDetail = this.data.postDetail;
    const newIsCollected = !postDetail.isCollected;

    // 先更新本地UI
    this.setData({
      "postDetail.isCollected": newIsCollected,
      "postDetail.collectCount": newIsCollected
        ? postDetail.collectCount + 1
        : postDetail.collectCount - 1,
    });

    // 然后发送请求到服务器
    app
      .request({
        url: `/api/interactions/posts/${this.data.postId}/collect`,
        method: "POST",
      })
      .catch((e) => {
        console.error("收藏操作失败:", e);
        // 请求失败时回滚UI状态
        this.setData({
          "postDetail.isCollected": !newIsCollected,
          "postDetail.collectCount": newIsCollected
            ? postDetail.collectCount
            : postDetail.collectCount + 1,
        });
      });
  },

  // 转发帖子（每次点击都增加计数）
  sharePost: function () {
    if (!this.data.postDetail || !this.data.postDetail._id) return;

    const postId = this.data.postDetail._id;
    const postDetail = this.data.postDetail;

    wx.showLoading({ title: "转发中..." });

    // 先更新本地UI，每次点击都+1
    const updatedPost = {
      ...postDetail,
      shareCount: (postDetail.shareCount || 0) + 1,
    };

    this.setData({
      postDetail: updatedPost,
    });

    // 发送转发请求到服务器
    app
      .request({
        url: `/api/interactions/posts/${postId}/share`,
        method: "POST",
        data: {
          comment: "", // 转发评论，可以为空
        },
      })
      .then((res) => {
        if (res.data && res.data.success) {
          console.log("✅ 转发成功:", res.data);

          // 更新本地状态（使用服务器返回的准确数据）
          const finalPost = {
            ...this.data.postDetail,
            shareCount: res.data.data.shareCount || 0,
          };

          this.setData({
            postDetail: finalPost,
          });

          wx.showToast({
            title: "转发成功",
            icon: "success",
            duration: 1500,
          });

          // 显示分享菜单
          setTimeout(() => {
            wx.showShareMenu({
              withShareTicket: true,
            });
          }, 1000);
        } else {
          console.error("❌ 转发失败:", res.data);
          // 请求失败时回滚UI状态
          const rollbackPost = {
            ...this.data.postDetail,
            shareCount: postDetail.shareCount, // 恢复原始计数
          };
          this.setData({
            postDetail: rollbackPost,
          });
          wx.showToast({
            title: res.data?.message || "转发失败",
            icon: "none",
          });
        }
      })
      .catch((error) => {
        console.error("❌ 转发请求失败:", error);
        // 请求失败时回滚UI状态
        const rollbackPost = {
          ...this.data.postDetail,
          shareCount: postDetail.shareCount, // 恢复原始计数
        };
        this.setData({
          postDetail: rollbackPost,
        });
        wx.showToast({
          title: "网络错误，请重试",
          icon: "none",
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  // 预览图片 - 简化版本
  previewImage: function (e) {
    const urls = e.currentTarget.dataset.urls;
    const current = e.currentTarget.dataset.current;

    console.log("🖼️ 图片预览调试信息:");
    console.log("预览图片列表:", urls);
    console.log("当前图片:", current);

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      wx.showToast({
        title: "图片列表为空",
        icon: "none",
      });
      return;
    }

    // 过滤有效的图片URL
    const validUrls = urls.filter(
      (url) => url && typeof url === "string" && url.trim() !== ""
    );

    if (validUrls.length === 0) {
      wx.showToast({
        title: "没有有效的图片",
        icon: "none",
      });
      return;
    }

    // 确定当前图片
    const currentUrl = validUrls.includes(current) ? current : validUrls[0];

    console.log("✅ 有效图片数量:", validUrls.length);
    console.log("✅ 当前预览图片:", currentUrl);

    // 直接尝试预览
    wx.previewImage({
      urls: validUrls,
      current: currentUrl,
      success: () => {
        console.log("✅ 图片预览成功");
      },
      fail: (error) => {
        console.error("❌ 图片预览失败:", error);
        // 如果预览失败，尝试Base64方案
        this.fallbackToBase64Preview();
      },
    });
  },

  // Base64备用预览方案
  fallbackToBase64Preview: async function () {
    try {
      console.log("🔄 启动Base64备用预览方案");

      wx.showLoading({
        title: "加载图片中...",
        mask: true,
      });

      const postImages = this.data.postDetail.images || [];
      const base64Urls = [];
      const maxConcurrent = 3; // 限制并发请求数量

      // 分批处理图片，避免同时发起太多请求
      for (let i = 0; i < postImages.length; i += maxConcurrent) {
        const batch = postImages.slice(i, i + maxConcurrent);
        const batchPromises = batch.map(async (imageObj) => {
          if (typeof imageObj === "object" && imageObj._id) {
            try {
              const response = await new Promise((resolve, reject) => {
                wx.request({
                  url: `${app.globalData.baseUrl}/api/images/${imageObj._id}/base64`,
                  method: "GET",
                  timeout: 8000, // 增加超时时间
                  success: resolve,
                  fail: reject,
                });
              });

              if (response.data && response.data.success) {
                return response.data.data.dataUrl;
              }
            } catch (error) {
              console.error("获取Base64失败:", imageObj._id, error);
            }
          }
          return null;
        });

        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            base64Urls.push(result.value);
          }
        });
      }

      wx.hideLoading();

      console.log("✅ Base64图片获取完成，成功数量:", base64Urls.length);

      if (base64Urls.length > 0) {
        wx.previewImage({
          urls: base64Urls,
          current: base64Urls[0],
          success: () => {
            console.log("✅ Base64预览成功");
            wx.showToast({
              title: "图片加载成功",
              icon: "success",
              duration: 1000,
            });
          },
          fail: (error) => {
            console.error("❌ Base64预览失败:", error);
            wx.showModal({
              title: "预览失败",
              content: "图片预览功能暂时不可用，请稍后重试",
              showCancel: false,
            });
          },
        });
      } else {
        wx.showModal({
          title: "加载失败",
          content: "无法加载图片，请检查网络连接后重试",
          showCancel: false,
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error("❌ Base64备用方案失败:", error);
      wx.showModal({
        title: "加载失败",
        content: "图片加载失败，请稍后重试",
        showCancel: false,
      });
    }
  },

  // 跳转到用户主页
  goToUserPage: function (e) {
    const userId = e.currentTarget.dataset.userId;
    wx.navigateTo({
      url: `/pages/user/profile/profile?id=${userId}`,
    });
  },

  // 下拉刷新
  onRefresh: function () {
    this.setData({
      isRefreshing: true,
      currentPage: 1,
    });

    this.fetchPostDetail(this.data.postId).then(() => {
      if (this.data.currentTab === "comments") {
        this.loadComments();
      }
      this.setData({ isRefreshing: false });
    });
  },

  // 加载更多评论
  loadMoreComments: function () {
    if (!this.data.hasMoreComments || this.data.isLoading) return;

    this.setData({
      currentPage: this.data.currentPage + 1,
    });

    this.loadComments();
  },

  // 关注用户
  followUser: function () {
    wx.showToast({
      title: "关注成功",
      icon: "success",
    });
  },

  // 举报帖子
  reportPost: function () {
    wx.showToast({
      title: "举报成功",
      icon: "success",
    });
  },

  // 点赞功能
  toggleLike: function () {
    if (!this.data.postDetail || !this.data.postDetail._id) return;

    const postId = this.data.postDetail._id;
    const isLiked = this.data.postDetail.isLiked;

    wx.showLoading({ title: isLiked ? "取消点赞..." : "点赞中..." });

    app
      .request({
        url: `/api/interactions/posts/${postId}/like`,
        method: "POST",
      })
      .then((res) => {
        if (res.data && res.data.success) {
          // 更新本地状态
          const updatedPost = {
            ...this.data.postDetail,
            isLiked: res.data.data.liked,
            likeCount: res.data.data.likeCount || 0,
          };

          this.setData({
            postDetail: updatedPost,
          });

          wx.showToast({
            title: res.data.data.liked ? "点赞成功" : "取消点赞",
            icon: "success",
            duration: 1000,
          });
        } else {
          wx.showToast({
            title: res.data?.message || "操作失败",
            icon: "none",
          });
        }
      })
      .catch((error) => {
        console.error("点赞失败:", error);
        wx.showToast({
          title: "网络错误，请重试",
          icon: "none",
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  // 收藏功能
  onFavoriteTap: function () {
    if (!this.data.postDetail || !this.data.postDetail._id) return;

    const postId = this.data.postDetail._id;
    const isFavorited = this.data.postDetail.isFavorited;

    wx.showLoading({ title: isFavorited ? "取消收藏..." : "收藏中..." });

    app
      .request({
        url: `/api/interactions/posts/${postId}/favorite`,
        method: "POST",
      })
      .then((res) => {
        if (res.data && res.data.success) {
          // 更新本地状态
          const updatedPost = {
            ...this.data.postDetail,
            isFavorited: res.data.data.favorited,
            favoriteCount: res.data.data.favoriteCount || 0,
          };

          this.setData({
            postDetail: updatedPost,
          });

          wx.showToast({
            title: res.data.data.favorited ? "收藏成功" : "取消收藏",
            icon: "success",
            duration: 1000,
          });
        } else {
          wx.showToast({
            title: res.data?.message || "操作失败",
            icon: "none",
          });
        }
      })
      .catch((error) => {
        console.error("收藏失败:", error);
        wx.showToast({
          title: "网络错误，请重试",
          icon: "none",
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  // 显示评论输入框
  showCommentInput: function () {
    this.setData({
      showCommentInput: true,
      commentContent: "",
    });
  },

  // 隐藏评论输入框
  hideCommentInput: function () {
    this.setData({
      showCommentInput: false,
      commentContent: "",
      replyToUser: "",
    });
  },

  // 评论输入
  onCommentInput: function (e) {
    this.setData({
      commentContent: e.detail.value,
    });
  },

  // 评论图片功能已移除

  // 评论点赞功能
  toggleCommentLike: function (e) {
    const commentId = e.currentTarget.dataset.id;
    if (!commentId) return;

    console.log("🔄 评论点赞操作，评论ID:", commentId);

    // 找到对应的评论
    const commentList = this.data.commentList || [];
    const commentIndex = commentList.findIndex(
      (comment) => comment.id === commentId
    );

    if (commentIndex === -1) {
      console.error("❌ 未找到对应的评论");
      return;
    }

    const comment = commentList[commentIndex];
    const isLiked = comment.isLiked;

    // 先更新本地UI
    const updatedCommentList = [...commentList];
    updatedCommentList[commentIndex] = {
      ...comment,
      isLiked: !isLiked,
      likeCount: isLiked
        ? (comment.likeCount || 0) - 1
        : (comment.likeCount || 0) + 1,
    };

    this.setData({
      commentList: updatedCommentList,
    });

    wx.showLoading({ title: isLiked ? "取消点赞..." : "点赞中..." });

    // 发送请求到服务器
    app
      .request({
        url: `/api/interactions/comments/${commentId}/like`,
        method: "POST",
      })
      .then((res) => {
        if (res.data && res.data.success) {
          console.log("✅ 评论点赞成功:", res.data);

          // 更新本地评论状态（使用服务器返回的准确数据）
          const finalCommentList = [...this.data.commentList];
          finalCommentList[commentIndex] = {
            ...finalCommentList[commentIndex],
            isLiked: res.data.data.liked,
            likeCount: res.data.data.likeCount || 0,
          };

          this.setData({
            commentList: finalCommentList,
          });

          wx.showToast({
            title: res.data.data.liked ? "点赞成功" : "取消点赞",
            icon: "success",
            duration: 1000,
          });
        } else {
          console.error("❌ 评论点赞失败:", res.data);
          // 请求失败时回滚UI状态
          this.setData({
            commentList: commentList, // 恢复原始状态
          });
          wx.showToast({
            title: res.data?.message || "操作失败",
            icon: "none",
          });
        }
      })
      .catch((error) => {
        console.error("❌ 评论点赞请求失败:", error);
        // 请求失败时回滚UI状态
        this.setData({
          commentList: commentList, // 恢复原始状态
        });
        wx.showToast({
          title: "网络错误，请重试",
          icon: "none",
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  // 回复评论
  replyComment: function (e) {
    const commentId = e.currentTarget.dataset.id;
    const username = e.currentTarget.dataset.username;

    console.log("🔄 回复评论，评论ID:", commentId, "用户名:", username);

    this.setData({
      showCommentInput: true,
      commentContent: "",
      replyToUser: username,
      replyToCommentId: commentId,
    });
  },

  // 加载更多回复
  loadMoreReplies: function (e) {
    const commentId = e.currentTarget.dataset.id;
    console.log("🔄 加载更多回复，评论ID:", commentId);

    // 这里可以实现加载更多回复的逻辑
    // 暂时显示提示
    wx.showToast({
      title: "功能开发中",
      icon: "none",
    });
  },

  // 发送评论
  sendComment: function () {
    const content = this.data.commentContent.trim();
    if (!content) {
      wx.showToast({
        title: "请输入评论内容",
        icon: "none",
      });
      return;
    }

    if (!this.data.postDetail || !this.data.postDetail._id) return;

    const postId = this.data.postDetail._id;
    const replyToCommentId = this.data.replyToCommentId;

    wx.showLoading({ title: "发送中..." });

    // 构建请求数据
    const requestData = {
      content: content,
    };

    // 如果是回复评论，添加回复相关信息
    if (replyToCommentId) {
      requestData.parentId = replyToCommentId;

      // 找到被回复的评论，获取作者ID
      const parentComment = this.data.commentList.find(
        (comment) => comment.id === replyToCommentId
      );
      if (parentComment && parentComment.authorId) {
        // 这里需要获取用户的真实ID，但由于我们只有nickName，暂时不设置replyToId
        // 在实际应用中，应该从评论数据中获取authorId
        console.log("📝 回复用户:", parentComment.authorId.nickName);
      }

      console.log("📝 发送回复评论，父评论ID:", replyToCommentId);
    } else {
      console.log("📝 发送新评论");
    }

    app
      .request({
        url: `/api/interactions/posts/${postId}/comments`,
        method: "POST",
        data: requestData,
      })
      .then((res) => {
        if (res.data && res.data.success) {
          console.log("✅ 评论发布成功:", res.data);

          // 更新评论数
          const updatedPost = {
            ...this.data.postDetail,
            commentCount: (this.data.postDetail.commentCount || 0) + 1,
          };

          this.setData({
            postDetail: updatedPost,
            showCommentInput: false,
            commentContent: "",
            currentPage: 1, // 重置页码，重新加载评论
            replyToUser: "", // 清除回复状态
            replyToCommentId: "", // 清除回复评论ID
          });

          // 重新加载评论列表
          this.loadComments();

          wx.showToast({
            title: "评论成功",
            icon: "success",
          });
        } else {
          wx.showToast({
            title: res.data?.message || "评论失败",
            icon: "none",
          });
        }
      })
      .catch((error) => {
        console.error("评论失败:", error);
        wx.showToast({
          title: "网络错误，请重试",
          icon: "none",
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },
});
