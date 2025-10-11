const app = getApp();
const { processImageUrl } = require("../../../utils/image-loader");

// 处理头像URL的辅助函数
function processAvatarUrl(avatarObj) {
  if (!avatarObj) return "/images/user_default.png";

  const processedUrl = processImageUrl(avatarObj);
  return processedUrl || "/images/user_default.png";
}

Page({
  data: {
    posts: [], // 发布的帖子列表
    loading: false,
    hasMore: true,
    page: 1,
    limit: 10,
    isEmpty: false,
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

    this.loadMyPosts();
  },

  // 刷新数据
  refreshData() {
    this.setData({
      posts: [],
      page: 1,
      hasMore: true,
      isEmpty: false,
    });
    this.loadMyPosts();
  },

  // 加载我发布的帖子
  async loadMyPosts() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const response = await app.request({
        url: "/api/posts/my/posts",
        method: "GET",
        data: {
          page: this.data.page,
          limit: this.data.limit,
        },
      });

      if (response.data && response.data.success) {
        const newPosts = response.data.data.posts || [];

        // 处理帖子数据
        const processedPosts = this.processPosts(newPosts);

        this.setData({
          posts:
            this.data.page === 1
              ? processedPosts
              : [...this.data.posts, ...processedPosts],
          hasMore: newPosts.length === this.data.limit,
          page: this.data.page + 1,
          isEmpty: this.data.page === 1 && newPosts.length === 0,
        });
      } else {
        wx.showToast({
          title: response.data?.message || "加载失败",
          icon: "none",
        });
      }
    } catch (error) {
      console.error("加载我的发布失败:", error);
      wx.showToast({
        title: "网络错误",
        icon: "none",
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 处理帖子数据
  processPosts(posts) {
    return posts.map((post) => {
      // 处理作者头像
      if (post.authorId?.avatar) {
        post.authorId.avatar.displayUrl = processAvatarUrl(
          post.authorId.avatar
        );
      }

      // 格式化时间
      post.formattedTime = this.formatTime(post.createdAt);

      return post;
    });
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

  // 点击帖子跳转到详情页
  onPostTap(e) {
    const postId = e.currentTarget.dataset.postId;
    wx.navigateTo({
      url: `/pages/community/detail/detail?id=${postId}`,
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshData();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadMyPosts();
  },

  // 去发布帖子
  goToPost() {
    wx.navigateTo({
      url: "/pages/community/post/post",
    });
  },

  // 去社区逛逛
  goToCommunity() {
    wx.switchTab({
      url: "/pages/community/community",
    });
  },
});
