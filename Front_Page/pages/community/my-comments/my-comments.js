const app = getApp();
const { processImageUrl } = require("../../../utils/image-loader");

Page({
  data: {
    comments: [], // 评论列表
    loading: false,
    hasMore: true,
    page: 1,
    limit: 10,
    isEmpty: false,
    showDeleteConfirm: false, // 显示删除确认弹窗
    currentDeleteCommentId: "", // 当前要删除的评论ID
  },

  onLoad() {
    this.checkLoginAndLoad();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.refreshData();
  },

  // 检查登录状态并加载数据
  checkLoginAndLoad() {
    const userInfo = wx.getStorageSync("userInfo");
    const token = wx.getStorageSync("token");

    if (!userInfo || !token) {
      wx.showModal({
        title: "提示",
        content: "请先登录",
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: "/pages/user/user",
          });
        },
      });
      return;
    }

    this.loadComments();
  },

  // 刷新数据
  refreshData() {
    this.setData({
      comments: [],
      page: 1,
      hasMore: true,
      isEmpty: false,
    });
    this.loadComments();
  },

  // 加载用户评论
  async loadComments() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const response = await app.request({
        url: "/api/posts/my/comments",
        method: "GET",
        data: {
          page: this.data.page,
          limit: this.data.limit,
        },
      });

      if (response.data && response.data.success) {
        const newComments = response.data.data.comments || [];

        // 处理评论数据
        const processedComments = await this.processComments(newComments);

        this.setData({
          comments:
            this.data.page === 1
              ? processedComments
              : [...this.data.comments, ...processedComments],
          hasMore: newComments.length === this.data.limit,
          page: this.data.page + 1,
          isEmpty: this.data.page === 1 && newComments.length === 0,
        });
      } else {
        wx.showToast({
          title: response.data?.message || "加载失败",
          icon: "none",
        });
      }
    } catch (error) {
      console.error("加载评论失败:", error);
      wx.showToast({
        title: "网络错误",
        icon: "none",
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 处理评论数据
  async processComments(comments) {
    return Promise.all(
      comments.map(async (comment) => {
        // 处理评论者头像
        if (comment.authorId?.avatar) {
          comment.authorId.avatar.displayUrl = await processImageUrl(
            comment.authorId.avatar
          );
        }

        // 处理帖子作者头像
        if (comment.postId?.authorId?.avatar) {
          comment.postId.authorId.avatar.displayUrl = await processImageUrl(
            comment.postId.authorId.avatar
          );
        }

        // 格式化时间
        comment.formattedTime = this.formatTime(comment.createdAt);

        // 截取帖子内容预览
        if (comment.postId?.content) {
          comment.postId.contentPreview =
            comment.postId.content.length > 50
              ? comment.postId.content.substring(0, 50) + "..."
              : comment.postId.content;
        }

        return comment;
      })
    );
  },

  // 格式化时间
  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

    return `${date.getMonth() + 1}-${date.getDate()}`;
  },

  // 点击评论跳转到帖子详情页
  onCommentTap(e) {
    const postId = e.currentTarget.dataset.postId;
    const commentId = e.currentTarget.dataset.commentId;
    wx.navigateTo({
      url: `/pages/community/detail/detail?id=${postId}&commentId=${commentId}`,
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshData();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadComments();
  },

  // 显示删除确认弹窗
  deleteComment(e) {
    const commentId = e.currentTarget.dataset.commentId;

    if (!commentId) {
      wx.showToast({
        title: "评论ID获取失败",
        icon: "none",
      });
      return;
    }

    this.setData({
      showDeleteConfirm: true,
      currentDeleteCommentId: commentId,
    });
  },

  // 隐藏删除确认弹窗
  hideDeleteConfirm() {
    this.setData({
      showDeleteConfirm: false,
      currentDeleteCommentId: "",
    });
  },

  // 确认删除评论
  async confirmDelete() {
    const commentId = this.data.currentDeleteCommentId;
    if (!commentId) {
      wx.showToast({
        title: "评论信息错误",
        icon: "none",
      });
      return;
    }

    wx.showLoading({ title: "删除中..." });

    try {
      const response = await app.request({
        url: `/api/interactions/comments/${commentId}`,
        method: "DELETE",
      });

      wx.hideLoading();

      if (response.data && response.data.success) {
        wx.showToast({
          title: "删除成功",
          icon: "success",
        });

        // 从列表中移除已删除的评论
        const updatedComments = this.data.comments.filter(
          (comment) => comment._id !== commentId
        );

        this.setData({
          comments: updatedComments,
          isEmpty: updatedComments.length === 0,
          showDeleteConfirm: false,
          currentDeleteCommentId: "",
        });
      } else {
        wx.showToast({
          title: response.data?.message || "删除失败",
          icon: "none",
        });
        this.hideDeleteConfirm();
      }
    } catch (error) {
      wx.hideLoading();
      console.error("删除评论失败:", error);
      wx.showToast({
        title: "网络错误",
        icon: "none",
      });
      this.hideDeleteConfirm();
    }
  },

  // 去社区逛逛
  goToCommunity() {
    wx.switchTab({
      url: "/pages/community/community",
    });
  },
});
