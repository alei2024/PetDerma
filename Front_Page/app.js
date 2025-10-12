// app.js
App({
  globalData: {
    userInfo: null,
    petInfo: [],
    hasLogin: false,
    theme: "default", // 支持季节性主题切换
    systemInfo: null,

    // ✅ 新增部分
    baseURL: "http://192.168.31.247:3000", // ⚠️ 改成你电脑局域网 IP
    baseUrl: "http://192.168.31.247:3000",
    token: "", // 存储登录 token
    currentUserId: null, // 当前用户ID
    needRefreshCommunity: false,
  },

  // ✅ 全局请求封装（供 app.request() 使用）
  request(options) {
    if (typeof wx === "undefined") {
      return Promise.reject(new Error("wx 全局对象不存在，无法发起请求"));
    }

    const token =
      wx.getStorageSync("token") ||
      this.globalData.token ||
      (this.globalData.userInfo && this.globalData.userInfo.token) ||
      "";

    // 检查是否需要认证的请求
    const requiresAuth =
      options.requireAuth !== false &&
      (options.method === "POST" ||
        options.method === "PUT" ||
        options.method === "DELETE" ||
        options.url.includes("/my/") ||
        options.url.includes("/user-info"));

    // 对于需要认证的请求，检查token有效性
    if (
      requiresAuth &&
      (!token || token === "test-token" || token.length < 10)
    ) {
      console.warn("⚠️ 需要登录的操作，但token无效");
      this.globalData.hasLogin = false;
      wx.removeStorageSync("token");
      wx.removeStorageSync("userInfo");
      return Promise.reject(new Error("需要重新登录"));
    }

    const headers = {
      "Content-Type": "application/json",
      ...(options.header || {}),
    };

    // 只有在有有效token时才添加Authorization头
    if (token && token !== "test-token" && token.length >= 10) {
      headers["Authorization"] = "Bearer " + token;
    }

    // 备用URL列表
    const baseUrls = [
      this.globalData.baseURL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://192.168.31.247:3000",
    ];

    // 尝试不同的URL
    const tryRequest = (urlIndex = 0) => {
      if (urlIndex >= baseUrls.length) {
        return Promise.reject(new Error("所有服务器地址都无法连接"));
      }

      const currentUrl = baseUrls[urlIndex];
      console.log(
        `🌐 尝试连接服务器 [${urlIndex + 1}/${baseUrls.length}]: ${currentUrl}`
      );

      return new Promise((resolve, reject) => {
        wx.request({
          url: currentUrl + options.url,
          method: options.method || "GET",
          data: options.data || {},
          header: headers,
          timeout: 15000, // 15秒超时
          success: (res) => {
            console.log(`✅ 服务器响应成功 (${currentUrl}):`, res.statusCode);
            if (res.statusCode === 401) {
              wx.showToast({
                title: "登录过期，请重新登录",
                icon: "none",
              });
              this.globalData.hasLogin = false;
              wx.removeStorageSync("token");
              wx.removeStorageSync("userInfo");
            }
            resolve(res);
          },
          fail: (err) => {
            console.error(`❌ 请求失败 (${currentUrl}):`, err);

            // 如果是502、超时或网络错误，尝试下一个URL
            if (
              err.errMsg &&
              (err.errMsg.includes("502") ||
                err.errMsg.includes("timeout") ||
                err.errMsg.includes("fail") ||
                err.errMsg.includes("Bad Gateway"))
            ) {
              console.log(`🔄 尝试下一个服务器地址...`);
              tryRequest(urlIndex + 1)
                .then(resolve)
                .catch(reject);
            } else {
              reject(err);
            }
          },
        });
      });
    };

    return tryRequest().catch((err) => {
      console.error("🚫 所有服务器地址都尝试失败:", err);
      wx.showToast({
        title: "网络连接失败，请检查服务器状态",
        icon: "none",
        duration: 3000,
      });
      throw err;
    });
  },

  // ✅ 时间格式化函数（供社区帖子时间显示用）
  formatTime(date) {
    const pad = (n) => (n < 10 ? "0" + n : n);
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      " " +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes())
    );
  },

  // 启动时自动执行
  onLaunch: function () {
    if (typeof wx === "undefined") {
      console.warn(
        "wx 全局对象不存在，跳过 onLaunch 初始化。这通常出现在非小程序运行环境。"
      );
      return;
    }

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

    // ✅ 启动时加载 token 和用户信息
    const token = wx.getStorageSync("token");
    const userInfo = wx.getStorageSync("userInfo");
    if (token) {
      this.globalData.token = token;
      this.globalData.hasLogin = true;
    }
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.currentUserId = userInfo.id || null;
      console.log("🔄 恢复用户ID:", this.globalData.currentUserId);
    }

    this.checkLoginStatus();
    this.loadPetInfo();
  },

  // 检查登录状态
  checkLoginStatus: function () {
    if (typeof wx === "undefined") {
      return;
    }
    try {
      const value = wx.getStorageSync("userInfo");
      if (value) {
        this.globalData.userInfo = value;
        this.globalData.hasLogin = true;
        this.globalData.currentUserId = value.id || null;
        console.log("🔍 检查登录状态 - 用户ID:", this.globalData.currentUserId);
      }
    } catch (e) {
      console.error("获取登录状态失败", e);
    }
  },

  // 加载宠物信息
  loadPetInfo: function () {
    if (typeof wx === "undefined") {
      return;
    }
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
    if (typeof wx === "undefined") {
      this.globalData.petInfo = petInfo;
      return;
    }
    this.globalData.petInfo = petInfo;
    try {
      wx.setStorageSync("petInfo", petInfo);
    } catch (e) {
      console.error("保存宠物信息失败", e);
    }
  },

  // 更新用户信息
  updateUserInfo: function (userInfo) {
    if (typeof wx === "undefined") {
      this.globalData.userInfo = userInfo;
      this.globalData.hasLogin = true;
      this.globalData.token =
        userInfo && userInfo.token ? userInfo.token : this.globalData.token;
      // 设置当前用户ID
      this.globalData.currentUserId =
        userInfo && userInfo.id ? userInfo.id : null;
      return;
    }

    try {
      // 更新全局数据
      this.globalData.userInfo = userInfo;
      this.globalData.hasLogin = true;

      // 设置当前用户ID
      this.globalData.currentUserId =
        userInfo && userInfo.id ? userInfo.id : null;

      // 标记需要刷新社区数据（用户信息可能已更新）
      this.globalData.needRefreshCommunity = true;

      // 保存到本地存储
      wx.setStorageSync("userInfo", userInfo);
      if (userInfo.token) {
        wx.setStorageSync("token", userInfo.token);
        this.globalData.token = userInfo.token;
      }

      console.log("✅ 用户信息已更新:", userInfo);
      console.log("✅ 当前用户ID:", this.globalData.currentUserId);
    } catch (e) {
      console.error("❌ 更新用户信息失败:", e);
    }
  },

  // 退出登录
  logout: function () {
    if (typeof wx === "undefined") {
      this.globalData.userInfo = null;
      this.globalData.hasLogin = false;
      this.globalData.token = "";
      this.globalData.currentUserId = null;
      return;
    }
    this.globalData.userInfo = null;
    this.globalData.hasLogin = false;
    this.globalData.token = "";
    this.globalData.currentUserId = null;
    try {
      wx.removeStorageSync("userInfo");
      wx.removeStorageSync("token");
    } catch (e) {
      console.error("退出登录失败", e);
    }
  },

  // 设置主题
  setTheme: function (theme) {
    this.globalData.theme = theme;
    if (typeof wx === "undefined") {
      return;
    }
    try {
      wx.setStorageSync("theme", theme);
    } catch (e) {
      console.error("设置主题失败", e);
    }
  },
});
