// app.js 配置模板
// 复制相关配置到 app.js 中
App({
  globalData: {
    userInfo: null,
    petInfo: [],
    hasLogin: false,
    theme: "default", // 支持季节性主题切换
    systemInfo: null,

    // ✅ 个人配置部分 - 请修改为您的配置
    baseURL: "https://petderma.onrender.com", // 生产环境 API 地址
    baseUrl: "https://petderma.onrender.com",
    token: "", // 存储登录 token
    currentUserId: null, // 当前用户ID
    needRefreshCommunity: false,
  },

  // ✅ 全局请求封装（供 app.request() 使用）
  request(options) {
    if (typeof wx === "undefined") {
      console.error("wx 对象不存在，请在微信小程序环境中运行");
      return Promise.reject(new Error("wx 对象不存在"));
    }

    const baseUrls = [
      this.globalData.baseURL,
      this.globalData.baseUrl,
      "https://petderma.onrender.com",
    ];

    let currentUrlIndex = 0;

    const tryRequest = (resolve, reject) => {
      if (currentUrlIndex >= baseUrls.length) {
        reject(new Error("所有服务器地址都无法连接"));
        return;
      }

      const currentUrl = baseUrls[currentUrlIndex];
      console.log(
        `🌐 尝试连接服务器 [${currentUrlIndex + 1}/${
          baseUrls.length
        }]: ${currentUrl}`
      );

      const requestOptions = {
        url: `${currentUrl}${options.url}`,
        method: options.method || "GET",
        data: options.data || {},
        header: {
          "content-type": "application/json",
          ...options.header,
        },
        timeout: options.timeout || 8000,
        success: (res) => {
          console.log(`✅ 服务器响应成功 (${currentUrl}): ${res.statusCode}`);
          resolve(res);
        },
        fail: (err) => {
          console.log(`❌ 请求失败 (${currentUrl}): ${err.errMsg}`);
          currentUrlIndex++;
          if (currentUrlIndex < baseUrls.length) {
            console.log("🔄 尝试下一个服务器地址...");
            setTimeout(() => tryRequest(resolve, reject), 1000);
          } else {
            reject(err);
          }
        },
      };

      wx.request(requestOptions);
    };

    return new Promise(tryRequest);
  },

  // ✅ 格式化时间
  formatTime(date) {
    if (!date) return "";

    const now = new Date();
    const target = new Date(date);
    const diff = now - target;

    // 小于1分钟
    if (diff < 60 * 1000) {
      return "刚刚";
    }

    // 小于1小时
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes}分钟前`;
    }

    // 小于24小时
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}小时前`;
    }

    // 小于7天
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}天前`;
    }

    // 超过7天显示具体日期
    const year = target.getFullYear();
    const month = target.getMonth() + 1;
    const day = target.getDate();
    const currentYear = now.getFullYear();

    if (year === currentYear) {
      return `${month}月${day}日`;
    } else {
      return `${year}年${month}月${day}日`;
    }
  },

  // ✅ 获取用户信息
  getUserInfo() {
    return this.globalData.userInfo;
  },

  // ✅ 设置用户信息
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.hasLogin = !!userInfo;
  },

  // ✅ 更新用户信息（用于头像、昵称等更新后同步）
  updateUserInfo(updates) {
    if (this.globalData.userInfo) {
      Object.assign(this.globalData.userInfo, updates);
      // 触发社区页面刷新
      this.globalData.needRefreshCommunity = true;
    }
  },

  // ✅ 获取宠物信息
  getPetInfo() {
    return this.globalData.petInfo || [];
  },

  // ✅ 设置宠物信息
  setPetInfo(petInfo) {
    this.globalData.petInfo = petInfo;
  },

  // ✅ 获取系统信息
  getSystemInfo() {
    if (!this.globalData.systemInfo) {
      try {
        this.globalData.systemInfo = wx.getSystemInfoSync();
      } catch (e) {
        console.error("获取系统信息失败:", e);
      }
    }
    return this.globalData.systemInfo;
  },

  // ✅ 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync("token");
    const userInfo = wx.getStorageSync("userInfo");

    if (token && userInfo) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
      this.globalData.hasLogin = true;
      this.globalData.currentUserId = userInfo.userId;
      console.log("🔍 检查登录状态 - 用户ID:", userInfo.userId);
      return true;
    }

    this.globalData.hasLogin = false;
    this.globalData.currentUserId = null;
    return false;
  },

  // ✅ 退出登录
  logout() {
    wx.removeStorageSync("token");
    wx.removeStorageSync("userInfo");
    this.globalData.token = "";
    this.globalData.userInfo = null;
    this.globalData.hasLogin = false;
    this.globalData.currentUserId = null;
  },

  // ✅ 应用启动
  onLaunch() {
    console.log("🚀 应用启动");

    // 获取系统信息
    this.getSystemInfo();

    // 恢复登录状态
    const storedUserId = wx.getStorageSync("userId");
    if (storedUserId) {
      this.globalData.currentUserId = storedUserId;
      console.log("🔄 恢复用户ID:", storedUserId);
    }

    // 检查登录状态
    this.checkLoginStatus();

    // 获取宠物信息
    try {
      const petList = wx.getStorageSync("petList");
      if (petList) {
        this.globalData.petInfo = petList;
      }
    } catch (e) {
      console.error("获取宠物信息失败:", e);
    }
  },

  // ✅ 应用显示
  onShow() {
    console.log("👁️ 应用显示");
  },

  // ✅ 应用隐藏
  onHide() {
    console.log("🙈 应用隐藏");
  },

  // ✅ 错误处理
  onError(error) {
    console.error("💥 应用错误:", error);
  },
});
