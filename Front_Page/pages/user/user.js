Page({
  data: {
    isLoggedIn: false,
    userInfo: {
      avatar: '',
      nickname: '',
      phone: '',
      loginType: '', // 'wechat' 或 'phone'
      userId: '' // 用户ID
    },
    // 统计数据
    statistics: {
      petCount: 0,    // 宠物数量
      recordCount: 0, // 记录数量
      reminderCount: 0 // 提醒数量
    },
    showSettingsPopup: false,
    notificationEnabled: true,
    showPhoneLoginPopup: false,
    showWechatAuthPopup: false, // 新增：微信授权弹窗状态
    phone: '',
    code: '',
    nickname: '',
    tempAvatar: '', // 临时头像，用于手机号登录时上传
    codeButtonDisabled: false,
    codeButtonText: '获取验证码',
    countdown: 0
  },

  onLoad: function() {
    this.checkLoginStatus();
    this.loadStatistics();
  },

  onShow: function() {
    this.checkLoginStatus();
    this.loadStatistics();
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      });
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: {}
      });
    }
  },

  // 加载统计数据
  loadStatistics: function() {
    // 获取宠物数量
    const petList = wx.getStorageSync('petList') || [];
    const petCount = petList.length;
    
    // 获取健康记录数量（模拟数据）
    const healthRecords = wx.getStorageSync('healthRecords') || [];
    const recordCount = healthRecords.length;
    
    // 获取提醒数量（模拟数据）
    const reminders = wx.getStorageSync('reminders') || [];
    const reminderCount = reminders.length;
    
    this.setData({
      statistics: {
        petCount: petCount,
        recordCount: recordCount,
        reminderCount: reminderCount
      }
    });
  },

  // 登录功能
  login: function(e) {
    wx.showModal({
      title: '选择登录方式',
      content: '请选择您偏好的登录方式',
      showCancel: true,
      cancelText: '微信登录',
      confirmText: '短信登录',
      success: (res) => {
        if (res.confirm) {
          // 短信验证码登录
          this.phoneLogin();
        } else if (res.cancel) {
          // 微信授权登录
          this.wechatLogin();
        }
      },
      fail: (err) => {
        console.error('显示登录选择框失败:', err);
        // 如果弹窗失败，显示错误提示
        wx.showModal({
          title: '提示',
          content: '登录选择框显示失败，请重试',
          showCancel: false,
          confirmText: '确定'
        });
      }
    });
  },

  // 微信登录
  wechatLogin: function() {
    // 显示模拟微信授权界面
    this.setData({
      showWechatAuthPopup: true
    });
  },

  // 关闭微信授权弹窗
  closeWechatAuth: function() {
    this.setData({
      showWechatAuthPopup: false
    });
  },

  // 确认微信授权
  confirmWechatAuth: function() {
    const self = this;
    
    // 关闭授权弹窗
    this.setData({
      showWechatAuthPopup: false
    });
    
    // 显示加载提示
    wx.showLoading({
      title: '正在获取信息...',
      mask: true
    });
    
    // 模拟获取微信用户信息
    setTimeout(() => {
      wx.hideLoading();
      
      // 模拟微信用户信息（更真实的数据）
      const mockAvatars = [
        'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
        'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
        'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
      ];
      
      const mockNames = [
        '微信用户',
        '宠物爱好者',
        '毛孩子家长',
        '萌宠达人',
        '爱心铲屎官'
      ];
      
      const randomAvatar = mockAvatars[Math.floor(Math.random() * mockAvatars.length)];
      const randomName = mockNames[Math.floor(Math.random() * mockNames.length)] + Math.floor(Math.random() * 1000);
      
      const userInfo = {
        avatar: randomAvatar,
        nickname: randomName,
        phone: '',
        loginType: 'wechat',
        userId: 'wx' + Math.floor(Math.random() * 100000)
      };
      
      self.handleLoginSuccess(userInfo);
    }, 1500);
  },

  // 手机号登录
  phoneLogin: function() {
    this.setData({ 
      showPhoneLoginPopup: true,
      phone: '',
      code: '',
      nickname: '',
      tempAvatar: '',
      codeButtonDisabled: false,
      codeButtonText: '获取验证码'
    });
  },

  // 关闭手机号登录弹窗
  closePhoneLoginPopup: function() {
    this.setData({ 
      showPhoneLoginPopup: false,
      phone: '',
      code: '',
      nickname: '',
      tempAvatar: ''
    });
  },

  // 上传头像（手机号登录时使用）
  uploadAvatar: function() {
    const self = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        self.setData({
          tempAvatar: tempFilePath
        });

      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 输入手机号
  inputPhone: function(e) {
    this.setData({ phone: e.detail.value });
  },

  // 输入验证码
  inputCode: function(e) {
    this.setData({ code: e.detail.value });
  },

  // 输入用户名
  inputNickname: function(e) {
    this.setData({ nickname: e.detail.value });
  },

  // 获取验证码
  getVerificationCode: function() {
    const phone = this.data.phone;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' });
      return;
    }
    
    // 开始倒计时
    this.setData({
      codeButtonDisabled: true,
      countdown: 60
    });
    
    this.startCountdown();
    
    // 模拟发送验证码（实际需调用后端接口）
    wx.showToast({ title: '验证码已发送（模拟）', icon: 'none' });
  },

  // 倒计时功能
  startCountdown: function() {
    const self = this;
    const timer = setInterval(() => {
      const countdown = self.data.countdown - 1;
      if (countdown <= 0) {
        clearInterval(timer);
        self.setData({
          codeButtonDisabled: false,
          codeButtonText: '获取验证码',
          countdown: 0
        });
      } else {
        self.setData({
          codeButtonText: `${countdown}s后重新获取`,
          countdown: countdown
        });
      }
    }, 1000);
  },

  // 提交手机号登录
  submitPhoneLogin: function() {
    const { phone, code, nickname, tempAvatar } = this.data;
    
    // 验证必填字段
    if (!phone || !code || !nickname) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' });
      return;
    }
    
    // 验证验证码（模拟验证码为123456）
    if (code !== '123456') {
      wx.showToast({ title: '验证码错误', icon: 'none' });
      return;
    }
    
    // 检查是否上传了头像
    if (!tempAvatar) {
      wx.showModal({
        title: '提示',
        content: '短信验证码登录需要上传头像，请先上传头像',
        showCancel: false,
        confirmText: '去上传',
        success: (res) => {
          if (res.confirm) {
            this.uploadAvatar();
          }
        }
      });
      return;
    }
    
    // 完成登录
    this.completePhoneLogin();
  },

  // 完成手机号登录
  completePhoneLogin: function() {
    const { phone, nickname, tempAvatar } = this.data;
    const userInfo = {
      avatar: tempAvatar,
      nickname: nickname,
      phone: phone,
      loginType: 'phone',
      userId: 'ph' + Math.floor(Math.random() * 100000)
    };
    
    this.handleLoginSuccess(userInfo, {
      resetFieldsOnSuccess: {
        showPhoneLoginPopup: false,
        phone: '',
        code: '',
        nickname: '',
        tempAvatar: ''
      },
      failureState: {
        showPhoneLoginPopup: true
      }
    });
  },

  // 统一处理登录成功后的逻辑，确保拿到社区后台的 token
  handleLoginSuccess: function(baseUserInfo, options = {}) {
    const { resetFieldsOnSuccess = {}, failureState = {} } = options;
    const defaultState = {
      showWechatAuthPopup: false,
      showPhoneLoginPopup: false
    };

    wx.showLoading({
      title: '正在登录...',
      mask: true
    });

    this.fetchCommunityToken(baseUserInfo)
      .then((finalUserInfo) => {
        wx.hideLoading();
        const app = getApp();
        app.updateUserInfo(finalUserInfo);
        this.setData({
          isLoggedIn: true,
          userInfo: finalUserInfo,
          ...defaultState,
          ...resetFieldsOnSuccess
        });
        wx.showToast({ title: '登录成功', icon: 'success' });
      })
      .catch((error) => {
        wx.hideLoading();
        console.error('获取社区登录凭证失败:', error);
        wx.showModal({
          title: '登录失败',
          content: '无法连接社区服务，请确认后端是否已启动',
          showCancel: false
        });
        this.setData({
          isLoggedIn: false,
          userInfo: {},
          ...defaultState,
          ...failureState
        });
      });
  },

  // 向社区后台请求开发环境 token，并合并用户信息
  fetchCommunityToken: function(baseUserInfo) {
    const app = getApp();
    const baseUrl =
      app.globalData.baseURL ||
      app.globalData.baseUrl;

    return new Promise((resolve, reject) => {
      if (!baseUrl) {
        reject(new Error('未配置社区后台地址'));
        return;
      }

      wx.request({
        url: `${baseUrl}/api/auth/dev-token`,
        method: 'GET',
        success: (res) => {
          if (
            res.statusCode === 200 &&
            res.data &&
            res.data.success &&
            res.data.token
          ) {
            const backendUser = res.data.user || {};
            const backendId =
              backendUser.id ||
              backendUser._id ||
              backendUser.userId ||
              backendUser.openId ||
              backendUser.uid;

            const displayName =
              baseUserInfo.nickname ||
              backendUser.nickName ||
              backendUser.nickname ||
              backendUser.name ||
              '社区用户';

            const avatar =
              baseUserInfo.avatar ||
              backendUser.avatar ||
              '/images/user_default.png';

            const finalUserInfo = {
              ...backendUser,
              ...baseUserInfo,
              token: res.data.token,
              avatar,
              nickname: displayName,
              nickName: displayName
            };

            if (backendId) {
              finalUserInfo.userId = finalUserInfo.userId || backendId;
              finalUserInfo.id = finalUserInfo.id || backendId;
              finalUserInfo._id = finalUserInfo._id || backendId;
            }

            resolve(finalUserInfo);
          } else {
            reject(new Error(res.data?.message || '获取登录凭证失败'));
          }
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  },

  // 更换头像（登录后使用）
  changeAvatar: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    const self = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        
        // 显示预览确认
        wx.showModal({
          title: '确认更换头像',
          content: '确定要更换为新头像吗？',
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 更新头像
              const userInfo = { ...self.data.userInfo };
              userInfo.avatar = tempFilePath;
              
              wx.setStorageSync('userInfo', userInfo);
              // 更新全局用户信息
              getApp().updateUserInfo(userInfo);
              self.setData({ userInfo: userInfo });
              
              wx.showToast({
                title: '头像更新成功',
                icon: 'success'
              });
            }
          }
        });
      },
      fail: () => {
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 打开设置弹窗
  openSettings: function() {
    this.setData({
      showSettingsPopup: true
    });
  },

  // 关闭设置弹窗
  closeSettings: function() {
    this.setData({
      showSettingsPopup: false
    });
  },

  // 切换通知设置
  toggleNotification: function(e) {
    this.setData({
      notificationEnabled: e.detail.value
    });
    wx.showToast({
      title: e.detail.value ? '已开启通知' : '已关闭通知',
      icon: 'none'
    });
  },

  // 打开通知设置
  openNotificationSettings: function() {
    wx.showToast({
      title: '通知设置功能开发中',
      icon: 'none'
    });
  },

  // 打开隐私设置
  openPrivacySettings: function() {
    wx.showToast({
      title: '隐私设置功能开发中',
      icon: 'none'
    });
  },

  // 清除缓存
  clearCache: function() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({
            title: '缓存已清除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 检查更新
  checkUpdate: function() {
    wx.showToast({
      title: '当前已是最新版本',
      icon: 'success'
    });
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          getApp().logout();
          this.setData({
            isLoggedIn: false,
            userInfo: {
              avatar: '',
              nickname: '',
              phone: '',
              loginType: ''
            }
          });
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 跳转到宠物管理页面
  navigateToPetManagement: function() {
    console.log('当前登录状态：', this.data.isLoggedIn); // 添加日志输出
    if (this.data.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/user/pet/pet'
      });
    } else {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
    }
  },

  // 导航到健康记录页面
  navigateToHealthRecord: function() {
    wx.navigateTo({
      url: '/pages/user/health/health'
    });
  },

  // 导航到意见反馈
  navigateToFeedback: function() {
    wx.showToast({
      title: '意见反馈功能开发中',
      icon: 'none'
    });
  },

  // 导航到关于我们
  navigateToAbout: function() {
    wx.showModal({
      title: '关于PetDerma',
      content: 'PetDerma是一款专业的宠物皮肤健康管理应用，致力于为宠物主人提供智能诊断、健康管理和知识科普服务。\n\n版本：1.0.0\n开发者：PetDerma团队',
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 切换账号
  switchAccount: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '切换账号',
      content: '确定要退出当前账号并重新登录吗？',
      success: (res) => {
        if (res.confirm) {
          this.logout();
          // 延迟一下再显示登录选项
          setTimeout(() => {
            this.login();
          }, 500);
        }
      }
    });
  },


  // 跳转到诊断页面
  navigateToDiagnosis: function() {
    wx.navigateTo({
      url: '/pages/diagnosis/diagnosis'
    });
  },

  // 跳转到家庭页面
  navigateToFamily: function() {
    wx.showToast({
      title: '家庭功能开发中',
      icon: 'none'
    });
  },

  // 跳转到消息页面
  navigateToMessages: function() {
    wx.showToast({
      title: '消息功能开发中',
      icon: 'none'
    });
  },

  // 跳转到知识页面
  navigateToKnowledge: function() {
    wx.navigateTo({
      url: '/pages/knowledge/knowledge'
    });
  }
})
