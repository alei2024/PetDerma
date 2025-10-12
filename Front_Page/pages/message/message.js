// message.js
const app = getApp();

Page({
  data: {
    notifications: [],
    unreadCount: 0,
    loading: false,
    hasMore: true,
    page: 1,
    limit: 20,
  },

  onLoad: function (options) {
    this.loadNotifications();
  },

  onShow: function () {
    // 页面显示时刷新数据
    this.refreshNotifications();
  },

  // 加载通知列表
  loadNotifications: function (refresh = false) {
    const token = wx.getStorageSync("token");
    if (!token) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      return;
    }

    if (this.data.loading) return;

    this.setData({ loading: true });

    const page = refresh ? 1 : this.data.page;

    wx.request({
      url: `${app.globalData.baseUrl}/api/notifications`,
      method: "GET",
      header: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        page: page,
        limit: this.data.limit,
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          const { notifications, unreadCount, pagination } = res.data.data;

          // 处理时间格式
          const processedNotifications = notifications.map((item) => ({
            ...item,
            createdAt: this.formatTime(item.createdAt),
          }));

          if (refresh) {
            // 刷新数据
            this.setData({
              notifications: processedNotifications,
              unreadCount: unreadCount || 0,
              page: 1,
              hasMore: pagination.current < pagination.total,
            });
          } else {
            // 加载更多
            this.setData({
              notifications: [
                ...this.data.notifications,
                ...processedNotifications,
              ],
              unreadCount: unreadCount || 0,
              page: page + 1,
              hasMore: pagination.current < pagination.total,
            });
          }
        } else {
          wx.showToast({
            title: res.data.message || "加载失败",
            icon: "none",
          });
        }
      },
      fail: (error) => {
        console.error("加载通知失败:", error);
        wx.showToast({
          title: "网络错误",
          icon: "none",
        });
      },
      complete: () => {
        this.setData({ loading: false });
        wx.stopPullDownRefresh();
      },
    });
  },

  // 刷新通知列表
  refreshNotifications: function () {
    this.loadNotifications(true);
  },

  // 加载更多
  loadMore: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.loadNotifications();
    }
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.refreshNotifications();
  },

  // 点击消息
  onMessageTap: function (e) {
    const notification = e.currentTarget.dataset.notification;
    console.log("📱 点击通知:", notification);

    // 标记为已读
    if (!notification.isRead) {
      this.markAsRead([notification.notificationId]);
    }

    // 跳转到相关页面
    if (notification.postId) {
      // 确保postId是字符串格式
      const postId =
        typeof notification.postId === "object"
          ? notification.postId._id || notification.postId.toString()
          : notification.postId.toString();

      console.log("🔗 跳转到帖子详情:", postId);
      wx.navigateTo({
        url: `/pages/community/detail/detail?id=${postId}`,
      });
    }
  },

  // 标记为已读
  markAsRead: function (notificationIds) {
    const token = wx.getStorageSync("token");
    if (!token) return;

    wx.request({
      url: `${app.globalData.baseUrl}/api/notifications/mark-read`,
      method: "PUT",
      header: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        notificationIds: notificationIds,
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          // 更新本地数据
          const notifications = this.data.notifications.map((item) => {
            if (notificationIds.includes(item.notificationId)) {
              return { ...item, isRead: true };
            }
            return item;
          });

          const unreadCount = Math.max(
            0,
            this.data.unreadCount - notificationIds.length
          );

          this.setData({
            notifications,
            unreadCount,
          });

          // 更新首页的未读数量
          const pages = getCurrentPages();
          const indexPage = pages.find(
            (page) => page.route === "pages/index/index"
          );
          if (indexPage) {
            indexPage.setData({ unreadCount });
          }
        }
      },
      fail: (error) => {
        console.error("标记已读失败:", error);
      },
    });
  },

  // 全部标记为已读
  markAllAsRead: function () {
    const unreadNotifications = this.data.notifications.filter(
      (item) => !item.isRead
    );
    if (unreadNotifications.length === 0) return;

    const notificationIds = unreadNotifications.map(
      (item) => item.notificationId
    );
    this.markAsRead(notificationIds);
  },

  // 头像加载错误处理
  onAvatarError: function (e) {
    const defaultAvatar =
      e.currentTarget.dataset.default || "/images/user_default.png";
    e.currentTarget.src = defaultAvatar;
  },

  // 格式化时间
  formatTime: function (timeString) {
    const now = new Date();
    const time = new Date(timeString);
    const diff = now - time;

    // 小于1分钟
    if (diff < 60000) {
      return "刚刚";
    }
    // 小于1小时
    else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    }
    // 小于1天
    else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    }
    // 小于7天
    else if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)}天前`;
    }
    // 超过7天显示具体日期
    else {
      const month = time.getMonth() + 1;
      const day = time.getDate();
      return `${month}月${day}日`;
    }
  },
});
