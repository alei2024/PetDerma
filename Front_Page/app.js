// app.js
App({
  globalData: {
    userInfo: null,
    petInfo: [],
    hasLogin: false,
    theme: 'default', // 支持季节性主题切换
    systemInfo: null,

    // ✅ 新增部分
    baseURL: "http://192.168.5.97:3000", // ⚠️ 改成你电脑局域网 IP
    baseUrl: "http://192.168.5.97:3000",
    token: "", // 存储登录 token
    needRefreshCommunity: false,
  },

  // ✅ 全局请求封装（供 app.request() 使用）
  request(options) {
    if (typeof wx === 'undefined') {
      return Promise.reject(new Error('wx 全局对象不存在，无法发起请求'));
    }

    const token =
      wx.getStorageSync('token') ||
      this.globalData.token ||
      (this.globalData.userInfo && this.globalData.userInfo.token) ||
      '';

    const headers = {
      'Content-Type': 'application/json',
      ...(options.header || {})
    };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.baseURL + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header: headers,
        success: (res) => {
          if (res.statusCode === 401) {
            wx.showToast({
              title: '登录过期，请重新登录',
              icon: 'none'
            });
            this.globalData.hasLogin = false;
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
          }
          resolve(res);
        },
        fail: (err) => {
          wx.showToast({
            title: '网络请求失败',
            icon: 'none'
          });
          reject(err);
        }
      });
    });
  },

  // ✅ 时间格式化函数（供社区帖子时间显示用）
  formatTime(date) {
    const pad = (n) => (n < 10 ? '0' + n : n);
    return (
      date.getFullYear() +
      '-' +
      pad(date.getMonth() + 1) +
      '-' +
      pad(date.getDate()) +
      ' ' +
      pad(date.getHours()) +
      ':' +
      pad(date.getMinutes())
    );
  },

  // 启动时自动执行
  onLaunch: function() {
    if (typeof wx === 'undefined') {
      console.warn('wx 全局对象不存在，跳过 onLaunch 初始化。这通常出现在非小程序运行环境。');
      return;
    }

    const safeCall = (fn) => {
      try {
        return typeof fn === 'function' ? fn() : undefined;
      } catch (e) {
        return undefined;
      }
    };

    const systemInfo = {
      appBaseInfo: safeCall(wx.getAppBaseInfo),
      deviceInfo: safeCall(wx.getDeviceInfo),
      windowInfo: safeCall(wx.getWindowInfo),
      systemSetting: safeCall(wx.getSystemSetting)
    };

    if (!systemInfo.appBaseInfo && typeof wx.getSystemInfoSync === 'function') {
      try {
        systemInfo.compat = wx.getSystemInfoSync();
      } catch (e) {}
    }

    this.globalData.systemInfo = systemInfo;

    // ✅ 启动时加载 token
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.globalData.hasLogin = true;
    }

    this.checkLoginStatus();
    this.loadPetInfo();
  },

  // 检查登录状态
  checkLoginStatus: function() {
    if (typeof wx === 'undefined') {
      return;
    }
    try {
      const value = wx.getStorageSync('userInfo');
      if (value) {
        this.globalData.userInfo = value;
        this.globalData.hasLogin = true;
      }
    } catch (e) {
      console.error('获取登录状态失败', e);
    }
  },

  // 加载宠物信息
  loadPetInfo: function() {
    if (typeof wx === 'undefined') {
      return;
    }
    try {
      const petInfo = wx.getStorageSync('petInfo');
      if (petInfo) {
        this.globalData.petInfo = petInfo;
      }
    } catch (e) {
      console.error('获取宠物信息失败', e);
    }
  },

  // 保存宠物信息
  savePetInfo: function(petInfo) {
    if (typeof wx === 'undefined') {
      this.globalData.petInfo = petInfo;
      return;
    }
    this.globalData.petInfo = petInfo;
    try {
      wx.setStorageSync('petInfo', petInfo);
    } catch (e) {
      console.error('保存宠物信息失败', e);
    }
  },

  // 更新用户信息
  updateUserInfo: function(userInfo) {
    if (typeof wx === 'undefined') {
      this.globalData.userInfo = userInfo;
      this.globalData.hasLogin = true;
      this.globalData.token = userInfo && userInfo.token ? userInfo.token : this.globalData.token;
      return;
    }
    this.globalData.userInfo = userInfo;
    this.globalData.hasLogin = true;
    try {
      wx.setStorageSync('userInfo', userInfo);
      if (userInfo.token) {
        wx.setStorageSync('token', userInfo.token);
        this.globalData.token = userInfo.token;
      }
    } catch (e) {
      console.error('保存用户信息失败', e);
    }
  },

  // 退出登录
  logout: function() {
    if (typeof wx === 'undefined') {
      this.globalData.userInfo = null;
      this.globalData.hasLogin = false;
      this.globalData.token = "";
      return;
    }
    this.globalData.userInfo = null;
    this.globalData.hasLogin = false;
    this.globalData.token = "";
    try {
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('token');
    } catch (e) {
      console.error('退出登录失败', e);
    }
  },

  // 设置主题
  setTheme: function(theme) {
    this.globalData.theme = theme;
    if (typeof wx === 'undefined') {
      return;
    }
    try {
      wx.setStorageSync('theme', theme);
    } catch (e) {
      console.error('设置主题失败', e);
    }
  }
});
