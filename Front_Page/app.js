// app.js
const { connectSocket } = require("./utils/socket");
const { connectNativeSocket } = require("./utils/native-websocket");
const config = require("./config/environment");
const { ensureValidToken } = require("./utils/auth-helper");

App({
  globalData: {
    userInfo: null,
    petInfo: [],
    hasLogin: false,
    theme: "default", // 支持季节性主题切换
    systemInfo: null,
    baseUrl: config.baseUrl,
    wsUrl: config.wsUrl,
    debug: config.debug,
    token: null, // 用户登录token
    socket: null, // WebSocket实例
    needRefreshCommunity: false, // 社区页面刷新标记
    currentUserId: null, // 当前用户ID
  },

  onLaunch: function () {
    const safeCall = (fn) => {
      try {
        return typeof fn === "function" ? fn() : undefined;
      } catch (e) {
        return undefined;
      }
    };

    const systemInfo = {
      appBaseInfo: safeCall(wx.getAppBaseInfo),
      deviceInfo: safeCall(wx.getDeviceInfo),
      windowInfo: safeCall(wx.getWindowInfo),
      systemSetting: safeCall(wx.getSystemSetting),
    };

    if (!systemInfo.appBaseInfo && typeof wx.getSystemInfoSync === "function") {
      try {
        systemInfo.compat = wx.getSystemInfoSync();
      } catch (e) {}
    }

    this.globalData.systemInfo = systemInfo;

    // 清理旧的登录信息，确保默认为未登录状态
    this.clearLoginInfo();
    this.checkLoginStatus();
    this.loadPetInfo();
  },

  // 清理登录信息
  clearLoginInfo: function () {
    try {
      // 清理本地存储
      wx.removeStorageSync("userInfo");
      wx.removeStorageSync("token");

      // 重置全局数据
      this.globalData.userInfo = null;
      this.globalData.token = null;
      this.globalData.hasLogin = false;
      this.globalData.currentUserId = null;

      console.log("🧹 已清理登录信息，设置为未登录状态");
    } catch (e) {
      console.error("清理登录信息失败", e);
    }
  },

  // 检查登录状态
  checkLoginStatus: function () {
    try {
      const userInfo = wx.getStorageSync("userInfo");
      const token = wx.getStorageSync("token");

      if (userInfo && token) {
        this.globalData.userInfo = userInfo;
        this.globalData.token = token;
        this.globalData.hasLogin = true;
        this.globalData.currentUserId =
          userInfo.userId || userInfo._id || userInfo.id;
        console.log(
          "✅ 用户已登录:",
          userInfo.nickname || userInfo.nickName,
          "ID:",
          this.globalData.currentUserId
        );
      } else {
        this.globalData.userInfo = null;
        this.globalData.token = null;
        this.globalData.hasLogin = false;
        this.globalData.currentUserId = null;
        console.log("❌ 用户未登录");
      }
    } catch (e) {
      console.error("获取登录状态失败", e);
    }
  },

  // 加载宠物信息
  loadPetInfo: function () {
    try {
      const petInfo = wx.getStorageSync("petInfo");
      if (petInfo) {
        this.globalData.petInfo = petInfo;
      }
    } catch (e) {
      console.error("获取宠物信息失败", e);
    }
  },

  // 保存宠物信息
  savePetInfo: function (petInfo) {
    this.globalData.petInfo = petInfo;
    try {
      wx.setStorageSync("petInfo", petInfo);
    } catch (e) {
      console.error("保存宠物信息失败", e);
    }
  },

  // 更新用户信息
  updateUserInfo: function (userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.hasLogin = true;
    this.globalData.currentUserId =
      userInfo.userId || userInfo._id || userInfo.id;
    try {
      wx.setStorageSync("userInfo", userInfo);
    } catch (e) {
      console.error("保存用户信息失败", e);
    }
  },

  // 退出登录
  logout: function () {
    this.globalData.userInfo = null;
    this.globalData.hasLogin = false;
    this.globalData.currentUserId = null;
    try {
      wx.removeStorageSync("userInfo");
    } catch (e) {
      console.error("退出登录失败", e);
    }
  },

  // 设置主题
  setTheme: function (theme) {
    this.globalData.theme = theme;
    try {
      wx.setStorageSync("theme", theme);
    } catch (e) {
      console.error("设置主题失败", e);
    }
  },

  // 发送消息通知（全局函数）
  sendNotification: function (options) {
    const {
      title = "新消息",
      content = "",
      templateId = "",
      page = "pages/index/index",
      data = {},
    } = options;

    // 1. 首先将消息添加到首页消息中心（无论通知开关状态）
    this.addToMessageCenter({
      title: title,
      content: content,
      time: this.formatTime(new Date()),
      id: "msg_" + Date.now(),
    });

    // 2. 检查是否启用了微信服务通知
    const notificationEnabled = wx.getStorageSync("notificationEnabled");
    const wechatAuthorized = wx.getStorageSync("wechatNotificationAuthorized");

    if (notificationEnabled && wechatAuthorized && templateId) {
      // 发送微信订阅消息
      if (wx.requestSubscribeMessage) {
        wx.requestSubscribeMessage({
          tmplIds: [templateId],
          success: function (res) {
            if (res[templateId] === "accept") {
              // 这里应该调用后端API发送订阅消息
              console.log("准备发送订阅消息:", {
                title,
                content,
                templateId,
                data,
              });
              // TODO: 调用后端API发送消息
            }
          },
        });
      }
    }
  },

  // 添加消息到首页消息中心
  addToMessageCenter: function (message) {
    try {
      let messages = wx.getStorageSync("messages") || [];
      messages.unshift(message); // 添加到最前面

      // 限制消息数量，最多保留50条
      if (messages.length > 50) {
        messages = messages.slice(0, 50);
      }

      wx.setStorageSync("messages", messages);
    } catch (e) {
      console.error("添加消息到消息中心失败:", e);
    }
  },

  // 格式化时间
  formatTime: function (date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minute = 1000 * 60;
    const hour = minute * 60;
    const day = hour * 24;

    if (diff < minute) {
      return "刚刚";
    } else if (diff < hour) {
      return Math.floor(diff / minute) + "分钟前";
    } else if (diff < day) {
      return Math.floor(diff / hour) + "小时前";
    } else if (diff < day * 2) {
      return (
        "昨天 " +
        date.getHours().toString().padStart(2, "0") +
        ":" +
        date.getMinutes().toString().padStart(2, "0")
      );
    } else {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hour = date.getHours().toString().padStart(2, "0");
      const minute = date.getMinutes().toString().padStart(2, "0");
      return month + "月" + day + "日 " + hour + ":" + minute;
    }
  },
  request({ url, method = "GET", data = {} }) {
    const { baseUrl, token } = this.globalData;
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${baseUrl}${url}`,
        method,
        data,
        header: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });
  },
  async onShow() {
    const { baseUrl } = this.globalData;

    console.log("应用启动，连接服务器...");

    // 检查是否需要进行网络诊断（避免频繁请求）
    const now = Date.now();
    const lastDiagnosis = this.globalData.lastNetworkDiagnosis || 0;
    const diagnosisInterval = 5 * 60 * 1000; // 5分钟内不重复诊断

    if (now - lastDiagnosis < diagnosisInterval) {
      return;
    }

    // 记录本次诊断时间
    this.globalData.lastNetworkDiagnosis = now;

    // 延迟进行网络诊断，避免启动时阻塞
    setTimeout(async () => {
      try {
        // 测试HTTP连接
        const httpResult = await this.testHttpConnection(baseUrl);
        console.log("✅ 服务器连接成功");

        // 获取并保存token用于API调用
        let validToken;
        if (this.globalData.hasLogin && this.globalData.token) {
          validToken = this.globalData.token;
        } else {
          // 不自动获取开发token，保持未登录状态
          validToken = "test-token";
          this.globalData.token = validToken;
        }

        // 连接WebSocket实现实时功能

        try {
          // 优先尝试原生WebSocket
          const nativeSocket = await connectNativeSocket({
            baseUrl,
            token: validToken || "test-token",
          });
          console.log("✅ WebSocket连接成功");
          // 存储到全局数据
          this.globalData.socket = nativeSocket;
        } catch (nativeError) {
          console.warn("⚠️ WebSocket连接失败，尝试备用方案");
          try {
            const socketIOSocket = connectSocket({
              baseUrl,
              token: validToken || "test-token",
            });
            console.log("✅ 备用连接成功");
            // 存储到全局数据
            this.globalData.socket = socketIOSocket;
          } catch (socketIOError) {
            console.warn("⚠️ 实时连接失败，使用轮询模式");
          }
        }
      } catch (error) {
        console.error("❌ 连接失败:", error);
        wx.showToast({
          title: "网络连接失败，请检查后端是否启动",
          icon: "none",
          duration: 3000,
        });
      }
    }, 2000);
  },

  // 执行网络诊断
  async performNetworkDiagnosis(baseUrl, token) {
    try {
      // 直接尝试Socket.IO连接
      try {
        connectSocket({ baseUrl, token });
      } catch (error) {
        console.error("Socket.IO连接失败:", error);
      }
    } catch (error) {
      console.error("网络连接异常:", error);
      wx.showToast({
        title: "网络连接异常",
        icon: "none",
        duration: 2000,
      });
    }
  },

  // 测试HTTP连接
  testHttpConnection(baseUrl) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${baseUrl}/health`,
        method: "GET",
        timeout: 10000,
        success: (res) => {
          resolve(res);
        },
        fail: (error) => {
          console.error("HTTP连接测试失败:", error);
          reject(error);
        },
      });
    });
  },
});
