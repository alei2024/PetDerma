// index.js
const app = getApp();

Page({
  data: {
    // 宠物头像列表（从全局或存储读取，若无则使用占位）
    petList: [],
    hasNewPost: false,
    hasNewArticle: true,
    healthTip: "定期为宠物检查皮肤状况，发现异常及时就诊",
    // 通知相关
    unreadCount: 0,
    notifications: [],
    showMessagePopup: false,
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
    // 季节性科普数据
    seasonalKnowledge: {
      1: {
        // 一月 - 冬季
        title: "冬季皮肤干燥护理",
        summary:
          "冬季空气干燥，宠物容易出现皮肤干燥、脱屑等问题。注意保湿护理，使用温和的洗护产品，适当增加室内湿度。",
        keywords: ["冬季护理", "皮肤干燥", "保湿", "温和洗护"],
      },
      2: {
        // 二月 - 冬末春初
        title: "换季过敏预防",
        summary:
          "冬春交替季节，宠物容易发生过敏反应。注意观察皮肤变化，及时调整饮食和环境，预防季节性过敏。",
        keywords: ["换季过敏", "过敏预防", "皮肤观察", "环境调整"],
      },
      3: {
        // 三月 - 春季
        title: "春季寄生虫防治",
        summary:
          "春季是寄生虫活跃期，需要加强体外驱虫。定期检查宠物皮肤，发现跳蚤、蜱虫等及时处理。",
        keywords: ["春季驱虫", "寄生虫防治", "跳蚤", "蜱虫"],
      },
      4: {
        // 四月 - 春季
        title: "花粉过敏防护",
        summary:
          "春季花粉增多，容易引起宠物过敏。减少外出时间，回家后及时清洁，保持室内空气清新。",
        keywords: ["花粉过敏", "过敏防护", "清洁护理", "室内环境"],
      },
      5: {
        // 五月 - 春末夏初
        title: "夏季前皮肤准备",
        summary:
          "为即将到来的夏季做准备，调整洗护频率，选择清爽型产品，预防夏季常见的皮肤问题。",
        keywords: ["夏季准备", "清爽护理", "洗护调整", "皮肤准备"],
      },
      6: {
        // 六月 - 夏季
        title: "夏季湿热环境护理",
        summary:
          "夏季高温高湿，宠物容易患皮肤病。保持皮肤干燥，增加洗澡频率，注意通风和降温。",
        keywords: ["夏季护理", "湿热环境", "皮肤干燥", "通风降温"],
      },
      7: {
        // 七月 - 夏季
        title: "热疹和湿疹防治",
        summary:
          "夏季常见热疹和湿疹问题。避免长时间暴露在高温环境，及时清洁皮肤褶皱，保持干燥。",
        keywords: ["热疹防治", "湿疹护理", "高温防护", "皮肤清洁"],
      },
      8: {
        // 八月 - 夏季
        title: "紫外线防护",
        summary:
          "夏季紫外线强烈，宠物皮肤也需要防晒。避免正午外出，选择有遮阳的散步时间，必要时使用宠物防晒产品。",
        keywords: ["紫外线防护", "防晒护理", "遮阳", "外出时间"],
      },
      9: {
        // 九月 - 夏末秋初
        title: "秋季换毛期护理",
        summary:
          "秋季是换毛期，需要加强梳理，预防毛球和皮肤问题。适当增加营养，帮助新毛生长。",
        keywords: ["秋季换毛", "梳理护理", "毛球预防", "营养补充"],
      },
      10: {
        // 十月 - 秋季
        title: "秋季过敏与皮肤敏感",
        summary:
          "秋季过敏高发期，宠物容易出现皮肤瘙痒、红肿等问题。注意环境清洁，使用温和的洗护产品。",
        keywords: ["秋季过敏", "皮肤敏感", "瘙痒护理", "温和洗护"],
      },
      11: {
        // 十一月 - 深秋
        title: "深秋皮肤保湿",
        summary:
          "深秋天气干燥，需要加强皮肤保湿护理。选择保湿型洗护产品，适当补充必需脂肪酸。",
        keywords: ["深秋保湿", "皮肤护理", "保湿产品", "必需脂肪酸"],
      },
      12: {
        // 十二月 - 冬季
        title: "冬季皮肤健康维护",
        summary:
          "冬季需要特别关注皮肤健康，注意保暖的同时保持皮肤清洁，预防冬季常见的皮肤问题。",
        keywords: ["冬季健康", "皮肤维护", "保暖护理", "清洁预防"],
      },
    },
    dailyKnowledge: { title: "", summary: "" },
    // 消息中心
    showMessagePopup: false,
    messages: [
      {
        id: "m1",
        title: "社区点赞",
        time: "今天 10:20",
        content: "用户 小李 赞了你的帖子《春季宠物皮肤护理心得》",
      },
      {
        id: "m2",
        title: "社区评论",
        time: "今天 09:05",
        content: "用户 Kitty 评论了你的帖子：讲得很专业，受教了！",
      },
      {
        id: "m3",
        title: "复诊提醒",
        time: "昨天 18:00",
        content: "明天 09:30 复诊预约，请携带最近的用药记录与照片",
      },
      {
        id: "m4",
        title: "用药提醒",
        time: "昨天 08:00",
        content: "请按时为 小黑 使用外用药：酮康唑软膏（每日1次）",
      },
      {
        id: "m5",
        title: "系统通知",
        time: "本周一 12:10",
        content:
          "为了更好地服务，请完善您的宠物档案信息，补充最近一次体检记录与过敏史。",
      },
      {
        id: "m6",
        title: "活动消息",
        time: "上周五 14:45",
        content:
          '社区发起"夏季皮肤护理心得分享"活动，参与即可获得积分与宠物洗护试用装，快来参加吧～',
      },
    ],
  },

  onLoad: function () {
    this.randomTip();
    this.initPetList();
    this.initDailyKnowledge();
    this.checkNewContent();
    this.initWebSocket();
    this.loadNotifications();
  },

  onShow: function () {
    // 每次页面显示时随机更换健康提示
    this.randomTip();
    // 同步宠物列表（避免其他页面更新未反映）
    this.initPetList();
    // 刷新未读数量
    this.loadUnreadCount();
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
    const currentMonth = today.getMonth() + 1; // 获取当前月份 (1-12)
    const keyDate = `${today.getFullYear()}-${currentMonth}-${today.getDate()}`;

    try {
      const cachedDate = wx.getStorageSync("dailyKnowledgeDate");
      const cachedData = wx.getStorageSync("dailyKnowledge");
      if (cachedDate === keyDate && cachedData) {
        this.setData({ dailyKnowledge: cachedData });
        return;
      }
    } catch (e) {}

    // 根据当前月份获取季节性科普内容
    const seasonalData = this.data.seasonalKnowledge[currentMonth];
    if (seasonalData) {
      // 使用季节性内容
      this.setData({ dailyKnowledge: seasonalData });
      try {
        wx.setStorageSync("dailyKnowledgeDate", keyDate);
        wx.setStorageSync("dailyKnowledge", seasonalData);
      } catch (e) {}
    } else {
      // 如果当月没有季节性内容，则从通用文章中随机选择
      const list = this.data.knowledgeArticles;
      const index = Math.floor(Math.random() * list.length);
      const pick = list[index];
      this.setData({ dailyKnowledge: pick });
      try {
        wx.setStorageSync("dailyKnowledgeDate", keyDate);
        wx.setStorageSync("dailyKnowledge", pick);
      } catch (e) {}
    }
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

  // 跳转到知识科普页面
  navigateToKnowledge: function () {
    wx.navigateTo({
      url: "/pages/knowledge/knowledge",
    });
  },

  // 初始化WebSocket连接
  initWebSocket: function () {
    const app = getApp();
    const token = wx.getStorageSync("token");

    if (!token) {
      console.log("未登录，跳过WebSocket连接");
      return;
    }

    try {
      // 使用原生WebSocket API
      const wsUrl = app.globalData.baseUrl.replace(/^https?:/, "ws:") + "/ws";

      const socket = wx.connectSocket({
        url: wsUrl,
        header: {
          Authorization: `Bearer ${token}`,
        },
      });

      socket.onOpen(() => {
        console.log("✅ WebSocket连接成功");
        app.globalData.socket = socket;
        app.globalData.socketConnected = true;
      });

      socket.onMessage((res) => {
        try {
          const data = JSON.parse(res.data);
          console.log("📨 收到WebSocket消息:", data);

          // 处理不同类型的消息
          if (data.type === "connect") {
            console.log("✅ WebSocket认证成功:", data.data?.message);
          } else if (data.type === "connect_error") {
            console.error("❌ WebSocket认证失败:", data.data?.message);
            // 认证失败，可能需要重新登录
            wx.showToast({
              title: "连接失败，请重新登录",
              icon: "none",
            });
          } else if (data.type === "new_notification") {
            this.handleNewNotification(data.data || data.payload || data);
          } else if (data.type === "unread_count_updated") {
            this.setData({
              unreadCount: (data.data || data.payload)?.unreadCount || 0,
            });
          }
        } catch (error) {
          console.error("解析WebSocket消息失败:", error);
        }
      });

      socket.onClose(() => {
        console.log("❌ WebSocket连接关闭");
        app.globalData.socketConnected = false;
      });

      socket.onError((error) => {
        console.error("❌ WebSocket连接错误:", error);
        app.globalData.socketConnected = false;
      });

      app.globalData.socket = socket;
    } catch (error) {
      console.error("WebSocket连接失败:", error);
    }
  },

  // 处理收到的通知
  handleNotification: function (data) {
    console.log("收到通知:", data);
    if (data.type === "new_notification") {
      this.handleNewNotification(data);
    } else if (data.type === "unread_count_updated") {
      this.setData({ unreadCount: data.unreadCount });
    }
  },

  // 处理新通知
  handleNewNotification: function (data) {
    const notification = data.notification;
    if (notification) {
      // 更新未读数量
      this.setData({
        unreadCount: this.data.unreadCount + 1,
      });

      // 显示通知提示
      wx.showToast({
        title: notification.title,
        icon: "none",
        duration: 2000,
      });

      // 添加到通知列表
      const notifications = [notification, ...this.data.notifications];
      this.setData({ notifications });
    }
  },

  // 加载通知列表
  loadNotifications: function () {
    const app = getApp();
    const token = wx.getStorageSync("token");

    if (!token) return;

    wx.request({
      url: `${app.globalData.baseUrl}/api/notifications`,
      method: "GET",
      header: {
        Authorization: `Bearer ${token}`,
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          const { notifications, unreadCount } = res.data.data;
          this.setData({
            notifications: notifications || [],
            unreadCount: unreadCount || 0,
          });
        }
      },
      fail: (error) => {
        console.error("加载通知失败:", error);
      },
    });
  },

  // 加载未读数量
  loadUnreadCount: function () {
    const app = getApp();
    const token = wx.getStorageSync("token");

    if (!token) return;

    wx.request({
      url: `${app.globalData.baseUrl}/api/notifications/unread-count`,
      method: "GET",
      header: {
        Authorization: `Bearer ${token}`,
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          this.setData({
            unreadCount: res.data.data.unreadCount || 0,
          });
        }
      },
      fail: (error) => {
        console.error("加载未读数量失败:", error);
      },
    });
  },

  // 打开消息中心
  openMessages: function () {
    const token = wx.getStorageSync("token");
    if (!token) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      return;
    }

    // 跳转到消息中心页面
    wx.navigateTo({
      url: "/pages/message/message",
    });
  },
});
