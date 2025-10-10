// app.js
const { connectSocket } = require("./utils/socket");
const { connectNativeSocket } = require("./utils/native-websocket");
const config = require("./config/environment");
const { performConnectionTest } = require("./utils/simple-websocket-test");
const { runFullTest } = require("./utils/simple-ws-test");
const { testConnectionCapabilities } = require("./utils/basic-ws-test");
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

    this.checkLoginStatus();
    this.loadPetInfo();

    const token = wx.getStorageSync("token") || "";
    this.globalData.token = token;
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
        console.log("✅ 用户已登录:", userInfo.nickname || userInfo.nickName);
      } else {
        this.globalData.userInfo = null;
        this.globalData.token = null;
        this.globalData.hasLogin = false;
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

    console.log("应用显示，开始初始化连接...");
    console.log("使用后端地址:", baseUrl);

    // 延迟进行网络诊断，避免启动时阻塞
    setTimeout(async () => {
      try {
        // 先测试HTTP连接
        console.log("1️⃣ 测试HTTP连接...");
        const httpResult = await this.testHttpConnection(baseUrl);
        console.log("✅ HTTP连接成功:", httpResult.data);

        // HTTP成功后连接WebSocket
        console.log("2️⃣ HTTP连接正常，准备连接WebSocket...");

        // 获取并保存token用于API调用
        let validToken;
        if (this.globalData.hasLogin && this.globalData.token) {
          validToken = this.globalData.token;
          console.log("使用已登录用户token");
        } else {
          validToken = await ensureValidToken();
          this.globalData.token = validToken || "test-token";
          console.log(
            "Token准备完成:",
            validToken ? "已获取开发token" : "使用test-token"
          );
        }

        // 连接WebSocket实现实时功能
        console.log("3️⃣ 开始连接WebSocket...");

        try {
          // 优先尝试原生WebSocket
          console.log("🔄 尝试原生WebSocket连接...");
          const nativeSocket = await connectNativeSocket({
            baseUrl,
            token: validToken || "test-token",
          });
          console.log("✅ 原生WebSocket连接成功");
          // 存储到全局数据
          this.globalData.socket = nativeSocket;
        } catch (nativeError) {
          console.warn(
            "⚠️ 原生WebSocket连接失败，尝试Socket.IO:",
            nativeError.message
          );
          try {
            const socketIOSocket = connectSocket({
              baseUrl,
              token: validToken || "test-token",
            });
            console.log("✅ Socket.IO连接成功");
            // 存储到全局数据
            this.globalData.socket = socketIOSocket;
          } catch (socketIOError) {
            console.error("❌ Socket.IO连接也失败:", socketIOError.message);
            console.log("🔄 将使用HTTP轮询作为备用方案");
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
      console.log("开始连接能力诊断...");

      // 使用连接能力测试
      const capabilityResult = await testConnectionCapabilities(baseUrl);

      if (capabilityResult.success) {
        console.log("✅ 连接能力测试完成，尝试Socket.IO连接");
        try {
          connectSocket({ baseUrl, token });
        } catch (error) {
          console.error("Socket.IO连接失败:", error);
        }
      } else {
        console.error("❌ 连接能力测试失败");

        // 显示详细的测试结果
        console.log("详细测试结果:", capabilityResult.results);
      }
    } catch (error) {
      console.error("网络诊断异常:", error);
      wx.showToast({
        title: "网络诊断异常",
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
          console.log("HTTP连接测试成功:", res.data);
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
