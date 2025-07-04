// app.js
App({
  globalData: {
    userInfo: null,
    petInfo: [],
    hasLogin: false,
    theme: 'default', // 支持季节性主题切换
    systemInfo: null
  },
  
  onLaunch: function() {
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 加载宠物信息
    this.loadPetInfo();
  },
  
  // 检查登录状态
  checkLoginStatus: function() {
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
    this.globalData.petInfo = petInfo;
    try {
      wx.setStorageSync('petInfo', petInfo);
    } catch (e) {
      console.error('保存宠物信息失败', e);
    }
  },
  
  // 更新用户信息
  updateUserInfo: function(userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.hasLogin = true;
    try {
      wx.setStorageSync('userInfo', userInfo);
    } catch (e) {
      console.error('保存用户信息失败', e);
    }
  },
  
  // 退出登录
  logout: function() {
    this.globalData.userInfo = null;
    this.globalData.hasLogin = false;
    try {
      wx.removeStorageSync('userInfo');
    } catch (e) {
      console.error('退出登录失败', e);
    }
  },
  
  // 设置主题
  setTheme: function(theme) {
    this.globalData.theme = theme;
    try {
      wx.setStorageSync('theme', theme);
    } catch (e) {
      console.error('设置主题失败', e);
    }
  }
})
