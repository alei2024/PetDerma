// index.js
const app = getApp();

Page({
  data: {
    // 宠物头像列表（从全局或存储读取，若无则使用占位）
    petList: [],
    hasNewPost: false,
    hasNewArticle: true,
    healthTip: "定期为宠物检查皮肤状况，发现异常及时就诊",
    tipsList: [
      "定期为宠物检查皮肤状况，发现异常及时就诊",
      "保持宠物被毛清洁干燥，定期给宠物洗澡和梳理",
      "选择适合宠物皮肤类型的洗护产品，避免刺激",
      "确保宠物有均衡的营养摄入，有助于皮肤健康",
      "注意防治体外寄生虫，定期驱虫很重要",
    ],
    // 科普文章（与知识科普页一致的一份基础数据，可替换为接口返回）
    knowledgeArticles: [
      {
        id: "k1",
        title: "识别常见皮肤病",
        summary: "如何区分常见宠物皮肤病的症状与表现。",
      },
      {
        id: "k2",
        title: "季节性过敏预防",
        summary: "气候变化可能引发宠物过敏，预防从环境管理做起。",
      },
      {
        id: "k3",
        title: "洗护产品选择指南",
        summary: "根据皮肤类型选择温和无刺激的洗护产品。",
      },
      {
        id: "k4",
        title: "寄生虫防治策略",
        summary: "建立定期驱虫计划，保障皮肤与被毛健康。",
      },
    ],
    dailyKnowledge: { title: "", summary: "" },
    // 消息中心
    showMessagePopup: false,
    messages: [],
    unreadCount: 0, // 未读消息数量
    isLoadingMessages: false,
  },

  onLoad: function () {
    this.randomTip();
    this.initPetList();
    this.initDailyKnowledge();
    this.checkNewContent();
    this.loadMessages(); // 加载消息
    this.setupWebSocketListeners(); // 设置WebSocket监听
  },

  onShow: function () {
    // 每次页面显示时随机更换健康提示
    this.randomTip();
    // 同步宠物列表（避免其他页面更新未反映）
    this.initPetList();
    // 重新加载消息（可能有新消息）
    this.loadMessages();
    this.loadUnreadCount(); // 加载未读数量
  },

  onUnload: function () {
    this.removeWebSocketListeners();
  },

  // 加载消息
  async loadMessages() {
    if (this.data.isLoadingMessages) return;

    this.setData({ isLoadingMessages: true });

    try {
      const token = wx.getStorageSync("token");
      if (!token) {
        console.log("未登录，使用默认消息");
        this.loadDefaultMessages();
        return;
      }

      const response = await app.request({
        url: "/api/notifications?limit=20",
        method: "GET",
      });

      if (response.data && response.data.success) {
        const notifications = response.data.data.notifications || [];
        const messages = notifications.map((notification) => ({
          id: notification._id,
          title: notification.title,
          content: notification.content,
          time: this.formatNotificationTime(notification.createdAt),
          isRead: notification.isRead,
          postId: notification.postId?._id,
          type: notification.type,
          senderId: notification.senderId?._id,
          senderName: notification.senderId?.nickName,
        }));

        this.setData({
          messages,
          unreadCount: response.data.data.unreadCount || 0,
        });
      } else {
        console.log("获取通知失败，使用默认消息");
        this.loadDefaultMessages();
      }
    } catch (error) {
      console.error("加载消息失败:", error);
      this.loadDefaultMessages();
    } finally {
      this.setData({ isLoadingMessages: false });
    }
  },

  // 加载默认消息（未登录时使用）
  loadDefaultMessages() {
    const defaultMessages = [
      {
        id: "default_1",
        title: "欢迎使用PetDerma",
        time: "刚刚",
        content: "欢迎使用PetDerma宠物皮肤健康助手！登录后可以接收实时通知。",
        isRead: false,
        type: "system",
      },
    ];
    this.setData({
      messages: defaultMessages,
      unreadCount: 1,
    });
  },

  // 格式化通知时间
  formatNotificationTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return time.toLocaleDateString();
  },

  // 加载未读数量
  async loadUnreadCount() {
    try {
      const token = wx.getStorageSync("token");
      if (!token) return;

      const response = await app.request({
        url: "/api/notifications/unread-count",
        method: "GET",
      });

      if (response.data && response.data.success) {
        this.setData({
          unreadCount: response.data.data.unreadCount || 0,
        });
      }
    } catch (error) {
      console.error("获取未读数量失败:", error);
    }
  },

  initPetList() {
    // 从宠物管理页面同步数据
    const petList = wx.getStorageSync("petList") || [];
    const processedPets = petList.map((p, idx) => ({
      id: p.id || `p${idx + 1}`,
      name: p.name || `宠物${idx + 1}`,
      avatar: p.avatar || "/images/default_pet.png",
    }));
    this.setData({ petList: processedPets });
  },

  initDailyKnowledge() {
    const today = new Date();
    const keyDate = `${today.getFullYear()}-${
      today.getMonth() + 1
    }-${today.getDate()}`;
    try {
      const cachedDate = wx.getStorageSync("dailyKnowledgeDate");
      const cachedData = wx.getStorageSync("dailyKnowledge");
      if (cachedDate === keyDate && cachedData) {
        this.setData({ dailyKnowledge: cachedData });
        return;
      }
    } catch (e) {}
    const list = this.data.knowledgeArticles;
    const index = Math.floor(Math.random() * list.length);
    const pick = list[index];
    this.setData({ dailyKnowledge: pick });
    try {
      wx.setStorageSync("dailyKnowledgeDate", keyDate);
      wx.setStorageSync("dailyKnowledge", pick);
    } catch (e) {}
  },

  // 随机选择健康提示
  randomTip: function () {
    const index = Math.floor(Math.random() * this.data.tipsList.length);
    this.setData({
      healthTip: this.data.tipsList[index],
    });
  },

  // 检查新内容（模拟）
  checkNewContent: function () {
    this.setData({
      hasNewPost: Math.random() > 0.5,
      hasNewArticle: Math.random() > 0.3,
    });
  },

  onTapPet(e) {
    const id = e.currentTarget.dataset.id;
    // 预留：可跳转到宠物详情或编辑页
  },

  openMessages() {
    this.setData({ showMessagePopup: true });
  },

  closeMessages() {
    this.setData({ showMessagePopup: false });
  },

  // 设置WebSocket监听
  setupWebSocketListeners() {
    try {
      const socket = app.globalData.socket;
      if (socket && socket.connected) {
        console.log("📡 首页设置WebSocket监听");

        // 监听新通知
        socket.on("new_notification", this.handleNewNotification.bind(this));

        // 监听未读数量更新
        socket.on(
          "unread_count_updated",
          this.handleUnreadCountUpdate.bind(this)
        );
      } else {
        console.log("⚠️ WebSocket未连接，首页无法接收实时通知");
      }
    } catch (error) {
      console.error("❌ 首页WebSocket设置失败:", error);
    }
  },

  // 移除WebSocket监听
  removeWebSocketListeners() {
    try {
      const socket = app.globalData.socket;
      if (socket) {
        console.log("📡 首页移除WebSocket监听");
        socket.off("new_notification", this.handleNewNotification);
        socket.off("unread_count_updated", this.handleUnreadCountUpdate);
      }
    } catch (error) {
      console.error("❌ 移除首页WebSocket监听失败:", error);
    }
  },

  // 处理新通知
  handleNewNotification(data) {
    console.log("📨 首页收到新通知:", data);

    if (data.notification) {
      const newMessage = {
        id: data.notification._id,
        title: data.notification.title,
        content: data.notification.content,
        time: this.formatNotificationTime(data.notification.createdAt),
        isRead: data.notification.isRead,
        postId: data.notification.postId,
        type: data.notification.type,
        senderId: data.notification.senderId?._id,
        senderName: data.notification.senderId?.nickName,
      };

      // 将新消息添加到列表顶部
      const messages = [newMessage, ...this.data.messages];
      this.setData({
        messages,
        unreadCount: this.data.unreadCount + 1,
      });

      // 显示通知提示
      wx.showToast({
        title: "收到新消息",
        icon: "none",
        duration: 2000,
      });
    }
  },

  // 处理未读数量更新
  handleUnreadCountUpdate(data) {
    console.log("📊 首页更新未读数量:", data.unreadCount);
    this.setData({
      unreadCount: data.unreadCount || 0,
    });
  },

  // 点击消息项
  onMessageTap(e) {
    const messageId = e.currentTarget.dataset.id;
    const message = this.data.messages.find((m) => m.id === messageId);

    if (!message) return;

    // 标记消息为已读
    this.markMessageAsRead(messageId);

    // 如果消息有关联的帖子，跳转到帖子详情
    if (message.postId) {
      wx.navigateTo({
        url: `/pages/community/detail/detail?id=${message.postId}`,
      });
    } else {
      // 显示消息详情
      wx.showModal({
        title: message.title,
        content: message.content,
        showCancel: false,
        confirmText: "确定",
      });
    }
  },

  // 标记消息为已读
  async markMessageAsRead(messageId) {
    try {
      const token = wx.getStorageSync("token");
      if (!token) return;

      await app.request({
        url: "/api/notifications/mark-read",
        method: "PUT",
        data: {
          notificationIds: [messageId],
        },
      });

      // 更新本地消息状态
      const messages = this.data.messages.map((msg) => {
        if (msg.id === messageId && !msg.isRead) {
          return { ...msg, isRead: true };
        }
        return msg;
      });

      const unreadCount = Math.max(0, this.data.unreadCount - 1);

      this.setData({
        messages,
        unreadCount,
      });
    } catch (error) {
      console.error("标记消息已读失败:", error);
    }
  },

  // 页面导航
  navigateTo: function (e) {
    const url = e.currentTarget.dataset.url;
    const isTab =
      e.currentTarget.dataset.tab === true ||
      e.currentTarget.dataset.tab === "true";
    if (isTab) {
      wx.switchTab({ url });
      return;
    }
    wx.navigateTo({ url });
  },
});
