const { processImageUrl } = require("../../utils/image-loader");

Page({
  data: {
    isLoggedIn: false,
    userInfo: {
      avatar: "",
      nickname: "",
      phone: "",
      loginType: "", // 'wechat' 或 'phone'
      userId: "", // 用户ID
    },
    avatarUrl: "/images/user_default.png", // 计算后的头像URL
    // 统计数据
    statistics: {
      petCount: 0, // 宠物数量
      recordCount: 0, // 记录数量
      reminderCount: 0, // 提醒数量
    },
    showSettingsPopup: false,
    notificationEnabled: true,
    showPhoneLoginPopup: false,
    showWechatAuthPopup: false, // 新增：微信授权弹窗状态
    showLoginRegisterPopup: false, // 新增：登录注册弹窗
    isLoginMode: true, // true: 登录模式, false: 注册模式
    phone: "",
    code: "",
    nickname: "",
    password: "",
    confirmPassword: "",
    tempAvatar: "", // 临时头像，用于手机号登录时上传
    tempAvatarData: null, // 服务器返回的头像数据
    codeButtonDisabled: false,
    codeButtonText: "获取验证码",
    countdown: 0,
  },

  onLoad: function () {
    this.checkLoginStatus();
    this.loadStatistics();
  },

  onShow: function () {
    this.checkLoginStatus();
    this.loadStatistics();
  },

  // 计算头像URL
  computeAvatarUrl: function (avatar) {
    if (!avatar) {
      return "/images/user_default.png";
    }

    // 使用统一的图片处理工具
    const processedUrl = processImageUrl(avatar);

    if (processedUrl) {
      return processedUrl;
    }

    return "/images/user_default.png";
  },

  // 检查登录状态
  checkLoginStatus: function () {
    const userInfo = wx.getStorageSync("userInfo");
    if (userInfo) {
      const avatarUrl = this.computeAvatarUrl(userInfo.avatar);
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo,
        avatarUrl: avatarUrl,
      });
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: {},
        avatarUrl: "/images/user_default.png",
        // 未登录时重置统计数据为0
        statistics: {
          petCount: 0,
          recordCount: 0,
          reminderCount: 0,
        },
      });
    }
  },

  // 加载统计数据
  loadStatistics: function () {
    // 只有在用户已登录时才加载统计数据
    if (!this.data.isLoggedIn) {
      this.setData({
        statistics: {
          petCount: 0,
          recordCount: 0,
          reminderCount: 0,
        },
      });
      return;
    }

    const token = wx.getStorageSync('token');
    if (!token || token === 'test-token') {
      // 未登录时使用本地存储数据
      const petList = wx.getStorageSync("petList") || [];
      const petCount = petList.length;
      
      // 使用本地存储的诊断记录数量
      const diagnosisRecords = wx.getStorageSync("savedDiagnosisResults") || [];
      const recordCount = diagnosisRecords.length;
      
      // 使用本地存储的提醒数量
      const reminders = wx.getStorageSync("reminders") || [];
      const reminderCount = reminders.length;

      this.setData({
        statistics: {
          petCount: petCount,
          recordCount: recordCount,
          reminderCount: reminderCount,
        },
      });
      return;
    }

    // 已登录时从后端获取真实数据
    this.loadPetCount();
    this.loadDiagnosisCount();
    this.loadUnreadMessageCount();
  },

  // 获取宠物数量
  loadPetCount: function() {
    const app = getApp();
    app.request({
      url: '/api/pets',
      method: 'GET'
    }).then((res) => {
      if (res.statusCode === 200 && res.data.success) {
        const petCount = res.data.data ? res.data.data.length : 0;
        this.setData({
          'statistics.petCount': petCount
        });
      }
    }).catch((error) => {
      console.error('获取宠物数量失败:', error);
      // 失败时使用本地存储数据
      const petList = wx.getStorageSync("petList") || [];
      this.setData({
        'statistics.petCount': petList.length
      });
    });
  },

  // 获取诊断记录数量
  loadDiagnosisCount: function() {
    const app = getApp();
    app.request({
      url: '/api/diagnosis/stats',
      method: 'GET'
    }).then((res) => {
      if (res.statusCode === 200 && res.data.success) {
        const recordCount = res.data.data ? res.data.data.totalRecords : 0;
        this.setData({
          'statistics.recordCount': recordCount
        });
      }
    }).catch((error) => {
      console.error('获取诊断记录数量失败:', error);
      // 失败时使用本地存储数据
      const diagnosisRecords = wx.getStorageSync("savedDiagnosisResults") || [];
      this.setData({
        'statistics.recordCount': diagnosisRecords.length
      });
    });
  },

  // 获取未读消息数量
  loadUnreadMessageCount: function() {
    const app = getApp();
    app.request({
      url: '/api/notifications/unread-count',
      method: 'GET'
    }).then((res) => {
      if (res.statusCode === 200 && res.data.success) {
        const reminderCount = res.data.data ? res.data.data.unreadCount : 0;
        this.setData({
          'statistics.reminderCount': reminderCount
        });
      }
    }).catch((error) => {
      console.error('获取未读消息数量失败:', error);
      // 失败时使用本地存储数据
      const reminders = wx.getStorageSync("reminders") || [];
      this.setData({
        'statistics.reminderCount': reminders.length
      });
    });
  },

  // 登录功能
  login: function (e) {
    this.setData({
      showLoginRegisterPopup: true,
      isLoginMode: true,
      phone: "",
      password: "",
      code: "",
      nickname: "",
      confirmPassword: "",
      tempAvatar: "",
      tempAvatarData: null,
      codeButtonDisabled: false,
      codeButtonText: "获取验证码",
      countdown: 0,
    });
  },

  // 微信登录
  wechatLogin: function () {
    // 显示模拟微信授权界面
    this.setData({
      showWechatAuthPopup: true,
    });
  },

  // 关闭微信授权弹窗
  closeWechatAuth: function () {
    this.setData({
      showWechatAuthPopup: false,
    });
  },

  // 确认微信授权
  confirmWechatAuth: function () {
    const self = this;

    // 关闭授权弹窗
    this.setData({
      showWechatAuthPopup: false,
    });

    // 显示加载提示
    wx.showLoading({
      title: "正在获取信息...",
      mask: true,
    });

    // 模拟获取微信用户信息
    setTimeout(() => {
      wx.hideLoading();

      // 模拟微信用户信息（使用本地默认头像）
      const mockAvatars = [
        "/images/user_default.png",
        "/images/user_default.png",
        "/images/user_default.png",
      ];

      const mockNames = [
        "微信用户",
        "宠物爱好者",
        "毛孩子家长",
        "萌宠达人",
        "爱心铲屎官",
      ];

      const randomAvatar =
        mockAvatars[Math.floor(Math.random() * mockAvatars.length)];
      const randomName =
        mockNames[Math.floor(Math.random() * mockNames.length)] +
        Math.floor(Math.random() * 1000);

      const userInfo = {
        avatar: randomAvatar,
        nickname: randomName,
        phone: "",
        loginType: "wechat",
        userId: "wx" + Math.floor(Math.random() * 100000),
      };

      self.handleLoginSuccess(userInfo);
    }, 1500);
  },

  // 手机号登录
  phoneLogin: function () {
    this.setData({
      showPhoneLoginPopup: true,
      phone: "",
      code: "",
      nickname: "",
      tempAvatar: "",
      tempAvatarData: null,
      codeButtonDisabled: false,
      codeButtonText: "获取验证码",
    });
  },

  // 关闭手机号登录弹窗
  closePhoneLoginPopup: function () {
    this.setData({
      showPhoneLoginPopup: false,
      phone: "",
      code: "",
      nickname: "",
      tempAvatar: "",
      tempAvatarData: null,
    });
  },

  // 关闭登录注册弹窗
  closeLoginRegisterPopup: function () {
    this.setData({
      showLoginRegisterPopup: false,
      phone: "",
      password: "",
      code: "",
      nickname: "",
      confirmPassword: "",
      tempAvatar: "",
      tempAvatarData: null,
      codeButtonDisabled: false,
      codeButtonText: "获取验证码",
      countdown: 0,
    });
  },

  // 切换登录/注册模式
  switchLoginRegisterMode: function () {
    this.setData({
      isLoginMode: !this.data.isLoginMode,
      phone: "",
      password: "",
      code: "",
      nickname: "",
      confirmPassword: "",
      tempAvatar: "",
      tempAvatarData: null,
      codeButtonDisabled: false,
      codeButtonText: "获取验证码",
      countdown: 0,
    });
  },

  // 上传头像（手机号登录时使用）
  uploadAvatar: function () {
    const self = this;
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];

        // 显示上传中提示
        wx.showLoading({
          title: "上传中...",
          mask: true,
        });

        // 上传到服务器
        self
          .uploadAvatarToServer(tempFilePath)
          .then((avatarData) => {
            wx.hideLoading();
            self.setData({
              tempAvatar: tempFilePath, // 用于显示预览
              tempAvatarData: avatarData, // 存储服务器返回的头像数据
            });
            wx.showToast({
              title: "头像上传成功",
              icon: "success",
            });
          })
          .catch((error) => {
            wx.hideLoading();
            console.error("头像上传失败:", error);
            wx.showToast({
              title: "头像上传失败",
              icon: "none",
            });
          });
      },
      fail: (err) => {
        console.error("选择图片失败:", err);
        wx.showToast({
          title: "选择图片失败",
          icon: "none",
        });
      },
    });
  },

  // 上传头像到服务器
  uploadAvatarToServer: function (filePath) {
    const app = getApp();
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.baseUrl}/api/upload/avatar`,
        filePath: filePath,
        name: "avatar",
        header: {
          Authorization: `Bearer ${wx.getStorageSync("token") || ""}`,
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.success) {
              resolve(data.data);
            } else {
              reject(new Error(data.message || "上传失败"));
            }
          } catch (error) {
            reject(new Error("解析响应失败"));
          }
        },
        fail: (error) => {
          reject(error);
        },
      });
    });
  },

  // 输入手机号
  inputPhone: function (e) {
    this.setData({ phone: e.detail.value });
  },

  // 输入验证码
  inputCode: function (e) {
    this.setData({ code: e.detail.value });
  },

  // 输入用户名
  inputNickname: function (e) {
    this.setData({ nickname: e.detail.value });
  },

  // 输入密码
  inputPassword: function (e) {
    this.setData({ password: e.detail.value });
  },

  // 输入确认密码
  inputConfirmPassword: function (e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  // 获取验证码
  getVerificationCode: function () {
    const phone = this.data.phone;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: "手机号格式错误", icon: "none" });
      return;
    }

    // 开始倒计时
    this.setData({
      codeButtonDisabled: true,
      countdown: 60,
    });

    this.startCountdown();

    // 调用后端API发送验证码
    const app = getApp();
    const baseUrl = app.globalData.baseURL || app.globalData.baseUrl;

    wx.request({
      url: `${baseUrl}/api/auth/send-verification-code`,
      method: "POST",
      data: {
        phoneNumber: phone,
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success) {
          wx.showToast({ 
            title: "验证码已发送", 
            icon: "success" 
          });
          // 开发环境显示验证码
          if (res.data.data && res.data.data.verificationCode) {
            console.log(`验证码: ${res.data.data.verificationCode}`);
          }
        } else {
          wx.showToast({ 
            title: res.data?.message || "发送失败", 
            icon: "none" 
          });
          // 重置按钮状态
          this.setData({
            codeButtonDisabled: false,
            codeButtonText: "获取验证码",
            countdown: 0,
          });
        }
      },
      fail: (error) => {
        console.error("发送验证码失败:", error);
        wx.showToast({ 
          title: "网络错误，请重试", 
          icon: "none" 
        });
        // 重置按钮状态
        this.setData({
          codeButtonDisabled: false,
          codeButtonText: "获取验证码",
          countdown: 0,
        });
      },
    });
  },

  // 倒计时功能
  startCountdown: function () {
    const self = this;
    const timer = setInterval(() => {
      const countdown = self.data.countdown - 1;
      if (countdown <= 0) {
        clearInterval(timer);
        self.setData({
          codeButtonDisabled: false,
          codeButtonText: "获取验证码",
          countdown: 0,
        });
      } else {
        self.setData({
          codeButtonText: `${countdown}s后重新获取`,
          countdown: countdown,
        });
      }
    }, 1000);
  },

  // 提交登录/注册
  submitLoginRegister: function () {
    const { phone, password, code, nickname, confirmPassword, isLoginMode } = this.data;

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: "手机号格式错误", icon: "none" });
      return;
    }

    if (isLoginMode) {
      // 登录模式
      if (!phone || !password) {
        wx.showToast({ title: "请填写手机号和密码", icon: "none" });
        return;
      }
      this.performLogin();
    } else {
      // 注册模式
      if (!phone || !code || !nickname || !password || !confirmPassword) {
        wx.showToast({ title: "请填写完整信息", icon: "none" });
        return;
      }

      if (password.length < 6) {
        wx.showToast({ title: "密码长度不能少于6位", icon: "none" });
        return;
      }

      if (password !== confirmPassword) {
        wx.showToast({ title: "两次输入的密码不一致", icon: "none" });
        return;
      }

      this.performRegister();
    }
  },

  // 执行登录
  performLogin: function () {
    const { phone, password } = this.data;
    const app = getApp();
    const baseUrl = app.globalData.baseURL || app.globalData.baseUrl;

    wx.showLoading({
      title: "登录中...",
      mask: true,
    });

    wx.request({
      url: `${baseUrl}/api/auth/phone-password-login`,
      method: "POST",
      data: {
        phoneNumber: phone,
        password: password,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200 && res.data && res.data.success) {
          const backendUser = res.data.data.user || {};
          const token = res.data.data.token;

          const userInfo = {
            id: backendUser.id,
            userId: backendUser.id,
            _id: backendUser.id,
            phoneNumber: backendUser.phoneNumber,
            nickName: backendUser.nickName,
            nickname: backendUser.nickName,
            avatar: backendUser.avatar,
            gender: backendUser.gender,
            city: backendUser.city,
            province: backendUser.province,
            country: backendUser.country,
            loginType: "phone",
            phone: backendUser.phoneNumber,
            token: token,
          };

          this.handleLoginSuccess(userInfo);
        } else {
          wx.showToast({
            title: res.data?.message || "登录失败",
            icon: "none",
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error("登录请求失败:", error);
        wx.showToast({
          title: "网络错误，请重试",
          icon: "none",
        });
      },
    });
  },

  // 执行注册
  performRegister: function () {
    const { phone, code, nickname, password, confirmPassword } = this.data;
    const app = getApp();
    const baseUrl = app.globalData.baseURL || app.globalData.baseUrl;

    wx.showLoading({
      title: "注册中...",
      mask: true,
    });

    wx.request({
      url: `${baseUrl}/api/auth/register`,
      method: "POST",
      data: {
        phoneNumber: phone,
        verificationCode: code,
        password: password,
        confirmPassword: confirmPassword,
        nickName: nickname,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200 && res.data && res.data.success) {
          const backendUser = res.data.data.user || {};
          const token = res.data.data.token;

          const userInfo = {
            id: backendUser.id,
            userId: backendUser.id,
            _id: backendUser.id,
            phoneNumber: backendUser.phoneNumber,
            nickName: backendUser.nickName,
            nickname: backendUser.nickName,
            avatar: backendUser.avatar,
            gender: backendUser.gender,
            city: backendUser.city,
            province: backendUser.province,
            country: backendUser.country,
            loginType: "phone",
            phone: backendUser.phoneNumber,
            token: token,
          };

          wx.showToast({
            title: "注册成功",
            icon: "success",
          });

          // 注册成功后自动登录
          setTimeout(() => {
            this.handleLoginSuccess(userInfo);
          }, 1000);
        } else {
          wx.showToast({
            title: res.data?.message || "注册失败",
            icon: "none",
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error("注册请求失败:", error);
        wx.showToast({
          title: "网络错误，请重试",
          icon: "none",
        });
      },
    });
  },

  // 处理登录成功
  handleLoginSuccess: function (userInfo) {
    // 存储token和用户信息到本地存储
    wx.setStorageSync("token", userInfo.token);
    wx.setStorageSync("userInfo", userInfo);
    
    // 更新全局状态
    const app = getApp();
    app.globalData.token = userInfo.token;
    app.globalData.userInfo = userInfo;
    app.globalData.hasLogin = true;
    app.globalData.currentUserId = userInfo.id;

    // 更新页面状态
    const avatarUrl = this.computeAvatarUrl(userInfo.avatar);
    this.setData({
      isLoggedIn: true,
      userInfo: userInfo,
      avatarUrl: avatarUrl,
      showLoginRegisterPopup: false,
      phone: "",
      password: "",
      code: "",
      nickname: "",
      confirmPassword: "",
      tempAvatar: "",
      tempAvatarData: null,
    });

    wx.showToast({
      title: "登录成功",
      icon: "success",
    });
  },

  // 提交手机号登录（保留原有方法，用于兼容）
  submitPhoneLogin: function () {
    const { phone, code, nickname, tempAvatar } = this.data;

    // 验证必填字段
    if (!phone || !code || !nickname) {
      wx.showToast({ title: "请填写完整信息", icon: "none" });
      return;
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: "手机号格式错误", icon: "none" });
      return;
    }

    // 验证验证码（模拟验证码为123456）
    if (code !== "123456") {
      wx.showToast({ title: "验证码错误", icon: "none" });
      return;
    }

    // 头像是可选的，如果没有上传头像也可以登录

    // 完成登录
    this.completePhoneLogin();
  },

  // 完成手机号登录
  completePhoneLogin: function () {
    const { phone, nickname, tempAvatarData } = this.data;

    console.log("🔄 开始手机号登录流程:", {
      phone,
      nickname,
      tempAvatarData,
    });

    const userInfo = {
      avatar: tempAvatarData, // 使用服务器返回的头像数据
      nickname: nickname,
      phone: phone,
      loginType: "phone",
      userId: "ph" + Math.floor(Math.random() * 100000),
    };

    console.log("👤 构建的用户信息:", userInfo);

    this.handleLoginSuccess(userInfo, {
      resetFieldsOnSuccess: {
        showPhoneLoginPopup: false,
        phone: "",
        code: "",
        nickname: "",
        tempAvatar: "",
        tempAvatarData: null,
      },
      failureState: {
        showPhoneLoginPopup: true,
      },
    });
  },

  // 统一处理登录成功后的逻辑，确保拿到社区后台的 token
  handleLoginSuccess: function (baseUserInfo, options = {}) {
    const { resetFieldsOnSuccess = {}, failureState = {} } = options;
    const defaultState = {
      showWechatAuthPopup: false,
      showPhoneLoginPopup: false,
    };

    wx.showLoading({
      title: "正在登录...",
      mask: true,
    });

    // 添加整体超时处理
    const loginTimeout = setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: "登录超时",
        content: "登录过程超时，请检查网络连接后重试",
        showCancel: false,
      });
      this.setData({
        isLoggedIn: false,
        userInfo: {},
        ...defaultState,
        ...failureState,
      });
    }, 15000); // 15秒总超时

    this.fetchCommunityToken(baseUserInfo)
      .then((finalUserInfo) => {
        clearTimeout(loginTimeout); // 清除超时
        wx.hideLoading();
        const app = getApp();
        app.updateUserInfo(finalUserInfo);
        const avatarUrl = this.computeAvatarUrl(finalUserInfo.avatar);
        this.setData({
          isLoggedIn: true,
          userInfo: finalUserInfo,
          avatarUrl: avatarUrl,
          ...defaultState,
          ...resetFieldsOnSuccess,
        });
        wx.showToast({ title: "登录成功", icon: "success" });
      })
      .catch((error) => {
        clearTimeout(loginTimeout); // 清除超时
        wx.hideLoading();
        console.error("获取社区登录凭证失败:", error);
        wx.showModal({
          title: "登录失败",
          content: "无法连接社区服务，请确认后端是否已启动",
          showCancel: false,
        });
        this.setData({
          isLoggedIn: false,
          userInfo: {},
          ...defaultState,
          ...failureState,
        });
      });
  },

  // 使用真实登录接口获取token
  fetchCommunityToken: function (baseUserInfo) {
    const app = getApp();
    const baseUrl = app.globalData.baseURL || app.globalData.baseUrl;

    return new Promise((resolve, reject) => {
      if (!baseUrl) {
        reject(new Error("未配置社区后台地址"));
        return;
      }

      // 检查登录类型并调用相应的API
      if (baseUserInfo.loginType === "phone" && baseUserInfo.phone) {
        // 手机号登录
        const requestData = {
          phoneNumber: baseUserInfo.phone,
          nickName: baseUserInfo.nickname || "用户",
          avatar: baseUserInfo.avatar || null,
        };

        console.log("📤 发送手机号登录请求:", {
          url: `${baseUrl}/api/auth/phone-login`,
          data: requestData,
        });

        wx.request({
          url: `${baseUrl}/api/auth/phone-login`,
          method: "POST",
          data: requestData,
          timeout: 10000, // 10秒超时
          success: (res) => {
            console.log("📱 手机号登录响应:", {
              statusCode: res.statusCode,
              data: res.data,
            });

            if (res.statusCode === 200 && res.data && res.data.success) {
              const backendUser = res.data.data.user || {};
              const token = res.data.data.token;

              const finalUserInfo = {
                ...baseUserInfo,
                ...backendUser,
                token: token,
                id: backendUser.id,
                userId: backendUser.id,
                _id: backendUser.id,
              };

              // 存储token和用户信息到本地存储
              wx.setStorageSync("token", token);
              wx.setStorageSync("userInfo", finalUserInfo);
              
              // 更新全局状态
              const app = getApp();
              app.globalData.token = token;
              app.globalData.userInfo = finalUserInfo;
              app.globalData.hasLogin = true;
              app.globalData.currentUserId = backendUser.id;

              console.log("✅ 手机号登录成功，最终用户信息:", finalUserInfo);
              resolve(finalUserInfo);
            } else {
              console.error("❌ 手机号登录失败:", {
                statusCode: res.statusCode,
                success: res.data?.success,
                message: res.data?.message,
                fullResponse: res.data,
              });
              reject(new Error(res.data?.message || "服务器内部错误"));
            }
          },
          fail: (error) => {
            console.error("手机号登录请求失败:", error);
            reject(new Error("网络请求失败"));
          },
        });
      } else if (baseUserInfo.loginType === "wechat") {
        // 微信登录 - 需要获取微信授权码
        wx.login({
          success: (loginRes) => {
            if (loginRes.code) {
              wx.request({
                url: `${baseUrl}/api/auth/wechat-login`,
                method: "POST",
                data: {
                  code: loginRes.code,
                },
                timeout: 10000, // 10秒超时
                success: (res) => {
                  if (res.statusCode === 200 && res.data && res.data.success) {
                    const backendUser = res.data.data.user || {};
                    const token = res.data.data.token;

                    const finalUserInfo = {
                      ...baseUserInfo,
                      ...backendUser,
                      token: token,
                      id: backendUser.id,
                      userId: backendUser.id,
                      _id: backendUser.id,
                    };

                    // 存储token和用户信息到本地存储
                    wx.setStorageSync("token", token);
                    wx.setStorageSync("userInfo", finalUserInfo);
                    
                    // 更新全局状态
                    const app = getApp();
                    app.globalData.token = token;
                    app.globalData.userInfo = finalUserInfo;
                    app.globalData.hasLogin = true;
                    app.globalData.currentUserId = backendUser.id;

                    resolve(finalUserInfo);
                  } else {
                    reject(new Error(res.data?.message || "微信登录失败"));
                  }
                },
                fail: (error) => {
                  console.error("微信登录请求失败:", error);
                  reject(new Error("网络请求失败"));
                },
              });
            } else {
              reject(new Error("获取微信授权码失败"));
            }
          },
          fail: (error) => {
            console.error("微信登录失败:", error);
            reject(new Error("微信登录失败"));
          },
        });
      } else {
        reject(new Error("未知的登录类型"));
      }
    });
  },

  // 更换头像（登录后使用）
  changeAvatar: function () {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }

    const self = this;
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];

        // 显示预览确认
        wx.showModal({
          title: "确认更换头像",
          content: "确定要更换为新头像吗？",
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 显示上传中提示
              wx.showLoading({
                title: "上传中...",
                mask: true,
              });

              // 上传到服务器
              self
                .uploadAvatarToServer(tempFilePath)
                .then((avatarData) => {
                  wx.hideLoading();

                  // 更新用户信息
                  const userInfo = { ...self.data.userInfo };
                  userInfo.avatar = avatarData;
                  const avatarUrl = self.computeAvatarUrl(avatarData);

                  // 保存到本地存储
                  wx.setStorageSync("userInfo", userInfo);

                  // 更新全局用户信息
                  getApp().updateUserInfo(userInfo);

                  // 更新页面数据
                  self.setData({
                    userInfo: userInfo,
                    avatarUrl: avatarUrl,
                  });

                  // 调用后端API更新用户头像
                  self.updateUserAvatarOnServer(avatarData);

                  wx.showToast({
                    title: "头像更新成功",
                    icon: "success",
                  });
                })
                .catch((error) => {
                  wx.hideLoading();
                  console.error("头像上传失败:", error);
                  wx.showToast({
                    title: "头像上传失败",
                    icon: "none",
                  });
                });
            }
          },
        });
      },
      fail: () => {
        wx.showToast({
          title: "选择图片失败",
          icon: "none",
        });
      },
    });
  },

  // 更新服务器上的用户头像
  updateUserAvatarOnServer: function (avatarData) {
    const app = getApp();
    const token = wx.getStorageSync("token");

    if (!token) {
      console.warn("没有token，跳过服务器头像更新");
      return;
    }

    app
      .request({
        url: "/api/auth/update-avatar",
        method: "PUT",
        data: {
          avatar: avatarData,
        },
      })
      .then((res) => {
        console.log("服务器头像更新成功:", res);
      })
      .catch((error) => {
        console.error("服务器头像更新失败:", error);
      });
  },

  // 打开设置弹窗
  openSettings: function () {
    this.setData({
      showSettingsPopup: true,
    });
  },

  // 关闭设置弹窗
  closeSettings: function () {
    this.setData({
      showSettingsPopup: false,
    });
  },

  // 切换通知设置
  toggleNotification: function (e) {
    this.setData({
      notificationEnabled: e.detail.value,
    });
    wx.showToast({
      title: e.detail.value ? "已开启通知" : "已关闭通知",
      icon: "none",
    });
  },

  // 打开通知设置
  openNotificationSettings: function () {
    wx.showToast({
      title: "通知设置功能开发中",
      icon: "none",
    });
  },

  // 打开隐私设置
  openPrivacySettings: function () {
    wx.showToast({
      title: "隐私设置功能开发中",
      icon: "none",
    });
  },

  // 清除缓存
  clearCache: function () {
    wx.showModal({
      title: "清除缓存",
      content: "确定要清除所有缓存数据吗？",
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({
            title: "缓存已清除",
            icon: "success",
          });
        }
      },
    });
  },

  // 检查更新
  checkUpdate: function () {
    wx.showToast({
      title: "当前已是最新版本",
      icon: "success",
    });
  },

  // 退出登录
  logout: function () {
    wx.showModal({
      title: "退出登录",
      content: "确定要退出登录吗？",
      success: (res) => {
        if (res.confirm) {
          // 调用全局退出登录
          getApp().logout();

          // 重置页面状态，包括头像和统计数据
          this.setData({
            isLoggedIn: false,
            userInfo: {
              avatar: "",
              nickname: "",
              phone: "",
              loginType: "",
              userId: "",
            },
            avatarUrl: "/images/user_default.png", // 重置为默认头像
            // 重置统计数据为0
            statistics: {
              petCount: 0,
              recordCount: 0,
              reminderCount: 0,
            },
          });

          wx.showToast({
            title: "已退出登录",
            icon: "success",
          });
        }
      },
    });
  },

  // 跳转到宠物管理页面
  navigateToPetManagement: function () {
    console.log("当前登录状态：", this.data.isLoggedIn); // 添加日志输出
    if (this.data.isLoggedIn) {
      wx.navigateTo({
        url: "/pages/user/pet/pet",
      });
    } else {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
    }
  },

  // 导航到健康记录页面
  navigateToHealthRecord: function () {
    wx.navigateTo({
      url: "/pages/user/health/health",
    });
  },

  // 导航到意见反馈
  navigateToFeedback: function () {
    wx.showToast({
      title: "意见反馈功能开发中",
      icon: "none",
    });
  },

  // 导航到关于我们
  navigateToAbout: function () {
    wx.showModal({
      title: "关于PetDerma",
      content:
        "PetDerma是一款专业的宠物皮肤健康管理应用，致力于为宠物主人提供智能诊断、健康管理和知识科普服务。\n\n版本：1.0.0\n开发者：PetDerma团队",
      showCancel: false,
      confirmText: "确定",
    });
  },

  // 切换账号
  switchAccount: function () {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: "请先登录",
        icon: "none",
      });
      return;
    }

    wx.showModal({
      title: "切换账号",
      content: "确定要退出当前账号并重新登录吗？",
      success: (res) => {
        if (res.confirm) {
          this.logout();
          // 延迟一下再显示登录选项
          setTimeout(() => {
            this.login();
          }, 500);
        }
      },
    });
  },

  // 跳转到诊断页面
  navigateToDiagnosis: function () {
    wx.navigateTo({
      url: "/pages/diagnosis/diagnosis",
    });
  },

  // 跳转到当前诊断页面
  navigateToCurrentDiagnosis: function () {
    wx.navigateTo({
      url: "/pages/user/diagnosis-list/diagnosis-list",
    });
  },

  navigateToTracking: function () {
    wx.navigateTo({
      url: "/pages/user/tracking/tracking",
    });
  },

  navigateToHospital: function () {
    wx.navigateTo({ url: "/pages/hospital/hospital" });
  },

  navigateToDashboard: function () {
    wx.navigateTo({ url: "/pages/dashboard/dashboard" });
  },

  navigateToRisk: function () {
    wx.navigateTo({ url: "/pages/user/risk/risk" });
  },

  // 跳转到家庭页面
  navigateToFamily: function () {
    wx.showToast({
      title: "家庭功能开发中",
      icon: "none",
    });
  },

  // 跳转到消息页面
  navigateToMessages: function () {
    wx.showToast({
      title: "消息功能开发中",
      icon: "none",
    });
  },

  // 跳转到知识页面
  navigateToKnowledge: function () {
    wx.navigateTo({
      url: "/pages/knowledge/knowledge",
    });
  },

  // 头像加载错误处理
  onAvatarError: function (e) {
    console.log("头像加载失败，使用默认头像:", e.detail.errMsg);
    // 如果头像加载失败，更新为默认头像
    const userInfo = { ...this.data.userInfo };
    userInfo.avatar = "/images/user_default.png";
    const avatarUrl = "/images/user_default.png";

    this.setData({
      userInfo: userInfo,
      avatarUrl: avatarUrl,
    });

    // 同时更新存储
    if (this.data.isLoggedIn) {
      wx.setStorageSync("userInfo", userInfo);
      const app = getApp();
      app.updateUserInfo(userInfo);
    }
  },
});
