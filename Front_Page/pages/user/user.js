Page({
  data: {
    isLoggedIn: false,
    userInfo: {
      avatar: "",
      nickname: "",
      phone: "",
      loginType: "", // 'wechat' 或 'phone'
    },
    // 开发环境快速切换用户
    showQuickSwitch: false,
    quickSwitchUsers: [
      { phone: "13800138001", nickname: "测试用户A" },
      { phone: "13800138002", nickname: "测试用户B" },
      { phone: "13800138003", nickname: "测试用户C" },
    ],
    showSettingsPopup: false,
    showPrivacyPopup: false, // 隐私设置弹窗状态
    notificationEnabled: true,
    showPhoneLoginPopup: false,
    showWechatAuthPopup: false, // 新增：微信授权弹窗状态
    phone: "",
    code: "",
    nickname: "",
    tempAvatar: "", // 临时头像，用于手机号登录时上传
    codeButtonDisabled: false,
    codeButtonText: "获取验证码",
    countdown: 0,
    // 版本信息
    appVersion: {
      current: "1.0.0",
      buildNumber: 1,
      releaseDate: "2025-09-10",
    },
    // 隐私设置
    privacySettings: {
      userInfoAuthorized: false, // 用户信息授权
      cameraAuthorized: false, // 摄像头授权
      locationAuthorized: false, // 地理位置授权
    },
  },

  onLoad: function () {
    this.checkLoginStatus();
    this.loadNotificationSettings();
    this.checkPrivacyPermissions(); // 检查隐私权限状态
  },

  onShow: function () {
    this.checkLoginStatus();
    this.loadNotificationSettings();
    this.checkPrivacyPermissions(); // 每次显示页面时都检查权限状态
  },

  // 加载通知设置
  loadNotificationSettings: function () {
    const notificationEnabled = wx.getStorageSync("notificationEnabled");
    if (notificationEnabled !== "") {
      this.setData({
        notificationEnabled: notificationEnabled,
      });
    }
  },

  // 检查隐私权限状态
  checkPrivacyPermissions: function () {
    const self = this;

    // 检查用户信息授权
    wx.getSetting({
      success: function (res) {
        const authSetting = res.authSetting;

        self.setData({
          "privacySettings.userInfoAuthorized":
            authSetting["scope.userInfo"] === true,
          "privacySettings.cameraAuthorized":
            authSetting["scope.camera"] === true,
          "privacySettings.locationAuthorized":
            authSetting["scope.userLocation"] === true,
        });

        console.log("隐私权限状态:", {
          userInfo: authSetting["scope.userInfo"],
          camera: authSetting["scope.camera"],
          location: authSetting["scope.userLocation"],
        });
      },
      fail: function (error) {
        console.error("获取授权设置失败:", error);
      },
    });
  },

  // 检查登录状态
  checkLoginStatus: function () {
    const userInfo = wx.getStorageSync("userInfo");
    if (userInfo) {
      // 处理头像URL
      if (userInfo.avatar) {
        // 确保avatar是对象格式
        if (typeof userInfo.avatar === "string") {
          // 如果avatar是字符串，转换为对象格式
          userInfo.avatar = {
            url: userInfo.avatar,
            displayUrl: this.processAvatarUrl({ url: userInfo.avatar }),
          };
        } else if (typeof userInfo.avatar === "object") {
          // 如果avatar是对象，直接处理
          userInfo.avatar.displayUrl = this.processAvatarUrl(userInfo.avatar);
        }
      }

      this.setData({
        isLoggedIn: true,
        userInfo: userInfo,
      });
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: {},
      });
    }
  },

  // 处理头像URL - 使用和帖子图片相同的处理方式
  processAvatarUrl: function (avatarObj) {
    if (!avatarObj) {
      return "/images/user_default.png";
    }

    console.log("🔍 用户页面处理头像对象:", avatarObj);

    // 引入成功的图片处理工具
    const { processImageUrl } = require("../../utils/image-loader");

    // 使用成功的图片处理工具
    const processedUrl = processImageUrl(avatarObj);

    if (processedUrl) {
      console.log("✅ 用户页面头像URL处理成功:", processedUrl);
      return processedUrl;
    }

    console.log("⚠️ 用户页面头像处理失败，使用默认头像");
    return "/images/user_default.png";
  },

  // 登录功能
  login: function (e) {
    wx.showModal({
      title: "选择登录方式",
      content: "请选择您偏好的登录方式",
      showCancel: true,
      cancelText: "微信登录",
      confirmText: "短信登录",
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
        console.error("显示登录选择框失败:", err);
        // 如果弹窗失败，显示错误提示
        wx.showModal({
          title: "提示",
          content: "登录选择框显示失败，请重试",
          showCancel: false,
          confirmText: "确定",
        });
      },
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
      title: "正在登录...",
      mask: true,
    });

    // 调用微信登录API
    wx.login({
      success: (res) => {
        if (res.code) {
          // 发送code到后端进行登录
          this.performWechatLogin(res.code);
        } else {
          wx.hideLoading();
          wx.showToast({
            title: "获取登录凭证失败",
            icon: "none",
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error("微信登录失败:", error);
        wx.showToast({
          title: "微信登录失败",
          icon: "none",
        });
      },
    });
  },

  // 执行微信登录
  performWechatLogin: function (code) {
    const app = getApp();

    app
      .request({
        url: "/api/auth/wechat-login",
        method: "POST",
        data: { code },
      })
      .then((res) => {
        wx.hideLoading();
        if (res.data && res.data.success) {
          const { token, user } = res.data.data;

          // 保存token和用户信息
          wx.setStorageSync("token", token);
          const userInfo = {
            id: user.id,
            avatar: user.avatar || {
              url: "/images/user_default.png",
              source: "default",
            },
            nickname: user.nickName || user.nickname,
            phone: user.phoneNumber || "",
            loginType: "wechat",
            openid: user.openid,
          };

          wx.setStorageSync("userInfo", userInfo);

          // 更新全局用户信息和token
          app.globalData.token = token;
          app.updateUserInfo(userInfo);

          // 处理头像URL，确保立即可以显示
          if (userInfo.avatar) {
            if (typeof userInfo.avatar === "string") {
              userInfo.avatar = {
                url: userInfo.avatar,
                displayUrl: this.processAvatarUrl({ url: userInfo.avatar }),
              };
            } else if (typeof userInfo.avatar === "object") {
              userInfo.avatar.displayUrl = this.processAvatarUrl(
                userInfo.avatar
              );
            }
          }

          this.setData({
            isLoggedIn: true,
            userInfo: userInfo,
          });

          wx.showToast({
            title: "登录成功",
            icon: "success",
          });
        } else {
          wx.showToast({
            title: res.data?.message || "登录失败",
            icon: "none",
          });
        }
      })
      .catch((error) => {
        wx.hideLoading();
        console.error("微信登录请求失败:", error);
        wx.showToast({
          title: "网络错误，请重试",
          icon: "none",
        });
      });
  },

  // 手机号登录
  phoneLogin: function () {
    this.setData({
      showPhoneLoginPopup: true,
      phone: "",
      code: "",
      nickname: "",
      tempAvatar: "",
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

        // 检查文件大小
        wx.getFileInfo({
          filePath: tempFilePath,
          success: (fileInfo) => {
            console.log("选择的头像文件大小:", fileInfo.size, "字节");

            // 2MB = 2 * 1024 * 1024 = 2097152 字节
            const maxSize = 2 * 1024 * 1024;

            if (fileInfo.size > maxSize) {
              // 文件过大，尝试进一步压缩
              self.compressImage(tempFilePath, (compressedPath) => {
                if (compressedPath) {
                  self.setData({
                    tempAvatar: compressedPath,
                  });
                } else {
                  wx.showToast({
                    title: "图片过大，请选择较小的图片",
                    icon: "none",
                    duration: 3000,
                  });
                }
              });
            } else {
              // 文件大小合适，直接使用
              self.setData({
                tempAvatar: tempFilePath,
              });
            }
          },
          fail: (err) => {
            console.error("获取文件信息失败:", err);
            // 如果无法获取文件信息，直接使用原文件
            self.setData({
              tempAvatar: tempFilePath,
            });
          },
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

  // 压缩图片
  compressImage: function (filePath, callback) {
    const self = this;

    // 使用Canvas压缩图片
    wx.getImageInfo({
      src: filePath,
      success: (imageInfo) => {
        console.log("原始图片信息:", imageInfo);

        // 计算压缩后的尺寸
        let { width, height } = imageInfo;
        const maxWidth = 800; // 最大宽度
        const maxHeight = 800; // 最大高度

        // 按比例缩放
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        // 创建Canvas上下文
        const ctx = wx.createCanvasContext("compressCanvas", self);

        // 绘制压缩后的图片
        ctx.drawImage(filePath, 0, 0, width, height);
        ctx.draw(false, () => {
          // 导出压缩后的图片
          wx.canvasToTempFilePath(
            {
              canvasId: "compressCanvas",
              width: width,
              height: height,
              quality: 0.7, // 压缩质量
              success: (res) => {
                console.log("压缩成功:", res.tempFilePath);

                // 检查压缩后的文件大小
                wx.getFileInfo({
                  filePath: res.tempFilePath,
                  success: (fileInfo) => {
                    console.log("压缩后文件大小:", fileInfo.size, "字节");

                    const maxSize = 2 * 1024 * 1024;
                    if (fileInfo.size <= maxSize) {
                      callback(res.tempFilePath);
                    } else {
                      console.log("压缩后仍然过大");
                      callback(null);
                    }
                  },
                  fail: () => {
                    callback(res.tempFilePath);
                  },
                });
              },
              fail: (err) => {
                console.error("压缩失败:", err);
                callback(null);
              },
            },
            self
          );
        });
      },
      fail: (err) => {
        console.error("获取图片信息失败:", err);
        callback(null);
      },
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

    // 模拟发送验证码（实际需调用后端接口）
    wx.showToast({ title: "验证码已发送（模拟）", icon: "none" });
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

  // 提交手机号登录
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

    // 检查是否上传了头像
    if (!tempAvatar) {
      wx.showModal({
        title: "提示",
        content: "短信验证码登录需要上传头像，请先上传头像",
        showCancel: false,
        confirmText: "去上传",
        success: (res) => {
          if (res.confirm) {
            this.uploadAvatar();
          }
        },
      });
      return;
    }

    // 完成登录
    this.completePhoneLogin();
  },

  // 完成手机号登录
  completePhoneLogin: function () {
    const { phone, nickname, tempAvatar } = this.data;
    const app = getApp();

    wx.showLoading({
      title: "正在注册...",
      mask: true,
    });

    // 首先上传头像到后端
    this.uploadAvatarToServer(tempAvatar)
      .then((avatarData) => {
        // 调用后端API进行手机号注册/登录
        return app.request({
          url: "/api/auth/phone-login",
          method: "POST",
          data: {
            phoneNumber: phone,
            nickName: nickname,
            avatar: avatarData,
          },
        });
      })
      .then((res) => {
        wx.hideLoading();
        if (res.data && res.data.success) {
          const { token, user } = res.data.data;

          // 保存token和用户信息
          wx.setStorageSync("token", token);
          const userInfo = {
            id: user.id,
            avatar: user.avatar || { url: tempAvatar, source: "upload" },
            nickname: user.nickName || nickname,
            phone: user.phoneNumber || phone,
            loginType: "phone",
          };

          wx.setStorageSync("userInfo", userInfo);

          // 更新全局用户信息和token
          app.globalData.token = token;
          app.updateUserInfo(userInfo);

          // 处理头像URL，确保立即可以显示
          if (userInfo.avatar) {
            if (typeof userInfo.avatar === "string") {
              userInfo.avatar = {
                url: userInfo.avatar,
                displayUrl: this.processAvatarUrl({ url: userInfo.avatar }),
              };
            } else if (typeof userInfo.avatar === "object") {
              userInfo.avatar.displayUrl = this.processAvatarUrl(
                userInfo.avatar
              );
            }
          }

          this.setData({
            isLoggedIn: true,
            userInfo: userInfo,
            showPhoneLoginPopup: false,
            phone: "",
            code: "",
            nickname: "",
            tempAvatar: "",
          });

          wx.showToast({ title: "登录成功", icon: "success" });
        } else {
          wx.showToast({
            title: res.data?.message || "登录失败",
            icon: "none",
          });
        }
      })
      .catch((error) => {
        wx.hideLoading();
        console.error("手机号登录失败:", error);
        wx.showToast({
          title: "登录失败，请重试",
          icon: "none",
        });
      });
  },

  // 上传头像到服务器
  uploadAvatarToServer: function (tempFilePath) {
    return new Promise((resolve, reject) => {
      const app = getApp();

      wx.uploadFile({
        url: `${app.globalData.baseUrl}/api/upload/avatar`,
        filePath: tempFilePath,
        name: "file",
        header: {
          Authorization: `Bearer ${wx.getStorageSync("token") || "temp"}`,
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.success) {
              resolve(data.data);
            } else {
              reject(new Error(data.message || "头像上传失败"));
            }
          } catch (error) {
            reject(new Error("解析上传响应失败"));
          }
        },
        fail: (error) => {
          reject(error);
        },
      });
    });
  },

  // 更换头像（登录后使用）
  changeAvatar: function () {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }

    // 检查登录方式，微信登录不允许修改头像
    if (this.data.userInfo.loginType === "wechat") {
      wx.showToast({
        title: "微信登录无法修改头像",
        icon: "none",
        duration: 2000,
      });
      return;
    }

    // 只有手机号登录才允许修改头像
    if (this.data.userInfo.loginType !== "phone") {
      wx.showToast({
        title: "当前登录方式不支持修改头像",
        icon: "none",
        duration: 2000,
      });
      return;
    }

    const self = this;
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];

        // 检查文件大小
        wx.getFileInfo({
          filePath: tempFilePath,
          success: (fileInfo) => {
            console.log("更换头像文件大小:", fileInfo.size, "字节");

            const maxSize = 2 * 1024 * 1024;

            const processAvatar = (finalPath) => {
              // 显示预览确认
              wx.showModal({
                title: "确认更换头像",
                content: "确定要更换为新头像吗？",
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    // 更新头像 - 保持对象格式
                    const userInfo = { ...self.data.userInfo };

                    // 确保avatar是对象格式
                    if (
                      !userInfo.avatar ||
                      typeof userInfo.avatar !== "object"
                    ) {
                      userInfo.avatar = {};
                    }

                    // 更新头像URL，保持其他属性
                    userInfo.avatar = {
                      ...userInfo.avatar,
                      url: finalPath,
                      displayUrl: finalPath,
                      source: "local", // 标记为本地文件
                    };

                    wx.setStorageSync("userInfo", userInfo);
                    // 更新全局用户信息
                    getApp().updateUserInfo(userInfo);
                    self.setData({ userInfo: userInfo });

                    wx.showToast({
                      title: "头像更新成功",
                      icon: "success",
                    });
                  }
                },
              });
            };

            if (fileInfo.size > maxSize) {
              // 文件过大，尝试压缩
              self.compressImage(tempFilePath, (compressedPath) => {
                if (compressedPath) {
                  processAvatar(compressedPath);
                } else {
                  wx.showToast({
                    title: "图片过大，请选择较小的图片",
                    icon: "none",
                    duration: 3000,
                  });
                }
              });
            } else {
              // 文件大小合适，直接使用
              processAvatar(tempFilePath);
            }
          },
          fail: (err) => {
            console.error("获取文件信息失败:", err);
            // 如果无法获取文件信息，直接使用原文件
            processAvatar(tempFilePath);
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
    // 阻止事件冒泡
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    const isEnabled = e.detail.value;
    this.setData({
      notificationEnabled: isEnabled,
    });

    // 保存通知设置到本地存储
    wx.setStorageSync("notificationEnabled", isEnabled);

    if (isEnabled) {
      // 开启通知：请求微信服务通知权限
      this.requestNotificationPermission();
    } else {
      // 关闭通知：显示提示
      wx.showToast({
        title: "关闭消息通知",
        icon: "none",
        duration: 1500,
      });
    }
  },

  // 请求微信服务通知权限
  requestNotificationPermission: function () {
    // 简化版本，只显示启用提示
    wx.showToast({
      title: "启用消息通知",
      icon: "success",
      duration: 1500,
    });

    // 保存授权状态（预留接口）
    wx.setStorageSync("wechatNotificationAuthorized", true);
  },

  // 打开通知设置
  openNotificationSettings: function (e) {
    // 阻止事件冒泡
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    // 简化版本，只显示当前状态
    const isEnabled = this.data.notificationEnabled;
    wx.showToast({
      title: isEnabled ? "消息通知已开启" : "消息通知已关闭",
      icon: "none",
      duration: 1500,
    });
  },

  // 阻止事件冒泡（保留但可能不需要了）
  preventBubble: function (e) {
    // 阻止事件冒泡，防止同时触发多个事件
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
  },

  // 显示消息通知信息
  showNotificationInfo: function (e) {
    // 阻止事件冒泡
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    wx.showModal({
      title: "关于消息通知",
      content:
        "消息通知始终会显示在首页。\n\n开启消息通知，微信服务能够接收新消息。\n\n关闭消息通知，微信服务无法接收新消息。",
      showCancel: false,
      confirmText: "知道了",
      confirmColor: "#A5D7E8",
    });
  },

  // 打开隐私设置
  openPrivacySettings: function () {
    // 先刷新权限状态，然后显示弹窗
    this.checkPrivacyPermissions();
    this.setData({
      showPrivacyPopup: true,
    });
  },

  // 关闭隐私设置弹窗
  closePrivacySettings: function () {
    this.setData({
      showPrivacyPopup: false,
    });
  },

  // 处理用户信息授权
  handleUserInfoAuth: function () {
    const self = this;
    const isAuthorized = this.data.privacySettings.userInfoAuthorized;

    if (isAuthorized) {
      // 已授权，询问是否取消授权
      wx.showModal({
        title: "用户信息授权",
        content:
          "当前已授权用户信息访问。如需取消授权，请前往微信设置-隐私-授权管理中手动取消。",
        showCancel: false,
        confirmText: "知道了",
        confirmColor: "#A5D7E8",
      });
    } else {
      // 未授权，请求授权
      wx.getUserProfile({
        desc: "用于完善用户资料",
        success: function (res) {
          wx.showToast({
            title: "授权成功",
            icon: "success",
          });
          // 重新检查权限状态
          self.checkPrivacyPermissions();
        },
        fail: function (error) {
          console.log("用户拒绝授权用户信息:", error);
          wx.showToast({
            title: "授权被拒绝",
            icon: "none",
          });
        },
      });
    }
  },

  // 处理摄像头授权
  handleCameraAuth: function () {
    const self = this;
    const isAuthorized = this.data.privacySettings.cameraAuthorized;

    if (isAuthorized) {
      wx.showModal({
        title: "摄像头授权",
        content:
          "当前已授权摄像头访问。如需取消授权，请前往微信设置-隐私-授权管理中手动取消。",
        showCancel: false,
        confirmText: "知道了",
        confirmColor: "#A5D7E8",
      });
    } else {
      wx.authorize({
        scope: "scope.camera",
        success: function () {
          wx.showToast({
            title: "授权成功",
            icon: "success",
          });
          self.checkPrivacyPermissions();
        },
        fail: function () {
          wx.showModal({
            title: "授权失败",
            content:
              "摄像头授权失败，如需使用拍照功能，请前往微信设置-隐私-授权管理中手动开启。",
            showCancel: true,
            cancelText: "取消",
            confirmText: "前往设置",
            confirmColor: "#A5D7E8",
            success: function (res) {
              if (res.confirm) {
                wx.openSetting();
              }
            },
          });
        },
      });
    }
  },

  // 处理地理位置授权
  handleLocationAuth: function () {
    const self = this;
    const isAuthorized = this.data.privacySettings.locationAuthorized;

    if (isAuthorized) {
      wx.showModal({
        title: "地理位置授权",
        content:
          "当前已授权地理位置访问。如需取消授权，请前往微信设置-隐私-授权管理中手动取消。",
        showCancel: false,
        confirmText: "知道了",
        confirmColor: "#A5D7E8",
      });
    } else {
      wx.authorize({
        scope: "scope.userLocation",
        success: function () {
          wx.showToast({
            title: "授权成功",
            icon: "success",
          });
          self.checkPrivacyPermissions();
        },
        fail: function () {
          wx.showModal({
            title: "授权失败",
            content:
              "地理位置授权失败，如需使用定位功能，请前往微信设置-隐私-授权管理中手动开启。",
            showCancel: true,
            cancelText: "取消",
            confirmText: "前往设置",
            confirmColor: "#A5D7E8",
            success: function (res) {
              if (res.confirm) {
                wx.openSetting();
              }
            },
          });
        },
      });
    }
  },

  // 清除缓存
  clearCache: function () {
    // 直接执行清除缓存，不显示确认弹窗
    this.performClearCache();
  },

  // 执行清除缓存操作
  performClearCache: function () {
    wx.showLoading({
      title: "清除中...",
      mask: true,
    });

    // TODO: 后端接口 - 清除服务器端临时文件缓存
    // this.clearServerTempCache();

    // 清除本地临时缓存
    this.clearLocalTempCache()
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: "缓存已清除",
          icon: "success",
          duration: 2000,
        });

        // 清除缓存后重新检查登录状态，确保登录信息正确显示
        this.checkLoginStatus();
      })
      .catch((error) => {
        wx.hideLoading();
        wx.showToast({
          title: "清除失败，请重试",
          icon: "none",
          duration: 2000,
        });
        console.error("清除缓存失败:", error);
      });
  },

  // 清除本地临时缓存（只清除临时文件，保留所有用户数据）
  clearLocalTempCache: function () {
    return new Promise((resolve, reject) => {
      try {
        // 在清除前记录当前重要数据状态
        console.log("清除缓存前检查用户数据:");
        console.log("userInfo:", wx.getStorageSync("userInfo"));
        console.log("petList:", wx.getStorageSync("petList"));
        console.log(
          "notificationEnabled:",
          wx.getStorageSync("notificationEnabled")
        );

        // 清除临时图片缓存
        this.clearTempImages()
          .then(() => {
            // 清除其他临时文件
            return this.clearTempFiles();
          })
          .then(() => {
            // 只清除特定的临时缓存key，不使用wx.clearStorage
            try {
              wx.removeStorageSync("tempImageCache");
              wx.removeStorageSync("tempFileCache");
              wx.removeStorageSync("uploadTempFiles");
              wx.removeStorageSync("diagnosisTempImages");
              console.log("临时缓存键已清除");
            } catch (e) {
              console.log("清除临时缓存键时出错:", e);
            }

            // 清除后再次检查重要数据是否还在
            console.log("清除缓存后检查用户数据:");
            console.log("userInfo:", wx.getStorageSync("userInfo"));
            console.log("petList:", wx.getStorageSync("petList"));
            console.log(
              "notificationEnabled:",
              wx.getStorageSync("notificationEnabled")
            );

            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  },

  // 清除临时图片
  clearTempImages: function () {
    return new Promise((resolve, reject) => {
      try {
        // TODO: 清除具体的临时图片文件
        // 这里应该清除诊断时上传的临时图片、头像临时文件等

        // 获取临时文件目录
        const tempDir = `${wx.env.USER_DATA_PATH}/temp`;
        const fileManager = wx.getFileSystemManager();

        // 检查临时目录是否存在
        fileManager.access({
          path: tempDir,
          success: () => {
            // 读取临时目录中的文件
            fileManager.readdir({
              dirPath: tempDir,
              success: (res) => {
                // 删除所有临时图片文件
                const deletePromises = res.files.map((fileName) => {
                  return new Promise((resolveDelete) => {
                    if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                      fileManager.unlink({
                        filePath: `${tempDir}/${fileName}`,
                        success: () => {
                          console.log(`已删除临时图片: ${fileName}`);
                          resolveDelete();
                        },
                        fail: (error) => {
                          console.log(`删除临时图片失败: ${fileName}`, error);
                          resolveDelete(); // 继续处理其他文件
                        },
                      });
                    } else {
                      resolveDelete();
                    }
                  });
                });

                Promise.all(deletePromises).then(() => {
                  resolve();
                });
              },
              fail: () => {
                resolve(); // 目录读取失败也继续
              },
            });
          },
          fail: () => {
            resolve(); // 目录不存在也继续
          },
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  // 清除其他临时文件
  clearTempFiles: function () {
    return new Promise((resolve) => {
      try {
        // 清除微信小程序的临时文件
        wx.getSavedFileList({
          success: (res) => {
            const deletePromises = res.fileList.map((file) => {
              return new Promise((resolveDelete) => {
                wx.removeSavedFile({
                  filePath: file.filePath,
                  success: () => {
                    console.log(`已删除保存的文件: ${file.filePath}`);
                    resolveDelete();
                  },
                  fail: (error) => {
                    console.log(`删除保存的文件失败: ${file.filePath}`, error);
                    resolveDelete(); // 继续处理其他文件
                  },
                });
              });
            });

            Promise.all(deletePromises).then(() => {
              resolve();
            });
          },
          fail: () => {
            resolve(); // 获取文件列表失败也继续
          },
        });
      } catch (error) {
        resolve(); // 出错也继续
      }
    });
  },

  // TODO: 清除服务器端临时文件缓存（预留后端接口）
  clearServerTempCache: function () {
    // 预留接口：调用后端API清除用户相关的临时文件缓存
    /*
    wx.request({
      url: 'https://your-api-domain.com/api/user/clearTempCache',
      method: 'POST',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('token'),
        'content-type': 'application/json'
      },
      success: (res) => {
        console.log('服务器临时文件缓存清除成功:', res.data);
      },
      fail: (error) => {
        console.error('服务器临时文件缓存清除失败:', error);
      }
    });
    */
  },

  // 检查更新
  checkUpdate: function () {
    wx.showLoading({
      title: "检查中...",
      mask: true,
    });

    // 获取当前版本信息
    const currentVersion = this.getCurrentVersion();

    // TODO: 后端接口 - 检查最新版本
    this.checkLatestVersion(currentVersion)
      .then((updateInfo) => {
        wx.hideLoading();

        if (updateInfo.hasUpdate) {
          this.showUpdateDialog(updateInfo);
        } else {
          wx.showToast({
            title: "当前已是最新版本",
            icon: "success",
            duration: 2000,
          });
        }
      })
      .catch((error) => {
        wx.hideLoading();
        wx.showToast({
          title: "检查更新失败",
          icon: "none",
          duration: 2000,
        });
        console.error("检查更新失败:", error);
      });
  },

  // 获取当前版本
  getCurrentVersion: function () {
    // 从app.json或全局配置中获取版本号
    // TODO: 实际项目中应该从配置文件或全局变量中获取
    return {
      version: "1.0.0",
      buildNumber: 1,
      releaseDate: "2025-09-10",
    };
  },

  // 检查最新版本（预留后端接口）
  checkLatestVersion: function (currentVersion) {
    return new Promise((resolve, reject) => {
      // TODO: 调用后端API检查最新版本
      /*
      wx.request({
        url: 'https://your-api-domain.com/api/app/checkUpdate',
        method: 'GET',
        data: {
          currentVersion: currentVersion.version,
          platform: 'wechat-miniprogram'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(new Error('API请求失败'));
          }
        },
        fail: reject
      });
      */

      // 模拟数据（开发阶段使用）
      setTimeout(() => {
        const mockUpdateInfo = {
          hasUpdate: false, // 改为true可测试更新流程
          latestVersion: "1.0.1",
          updateType: "minor", // major, minor, patch
          updateContent: [
            "• 新增宠物健康档案导出功能",
            "• 优化图像识别准确度",
            "• 修复已知问题",
            "• 提升用户体验",
          ],
          forceUpdate: false,
          downloadUrl: "https://your-domain.com/download",
          releaseDate: "2025-09-13",
        };
        resolve(mockUpdateInfo);
      }, 1500);
    });
  },

  // 显示更新对话框
  showUpdateDialog: function (updateInfo) {
    const updateContent = updateInfo.updateContent.join("\n");
    const content = `发现新版本 v${updateInfo.latestVersion}\n\n更新内容：\n${updateContent}`;

    wx.showModal({
      title: updateInfo.forceUpdate ? "强制更新" : "版本更新",
      content: content,
      showCancel: !updateInfo.forceUpdate,
      confirmText: updateInfo.forceUpdate ? "立即更新" : "更新",
      cancelText: "稍后更新",
      confirmColor: "#A5D7E8",
      success: (res) => {
        if (res.confirm) {
          this.performUpdate(updateInfo);
        } else if (!updateInfo.forceUpdate) {
          // 用户选择稍后更新，记录提醒时间
          wx.setStorageSync("updateRemindLater", Date.now());
        }
      },
    });
  },

  // 执行更新
  performUpdate: function (updateInfo) {
    if (updateInfo.updateType === "major" || updateInfo.forceUpdate) {
      // 重大更新或强制更新：跳转到下载页面
      wx.showModal({
        title: "更新提示",
        content: "此次更新需要重新下载小程序，是否前往下载？",
        confirmText: "前往下载",
        cancelText: "取消",
        confirmColor: "#A5D7E8",
        success: (res) => {
          if (res.confirm) {
            // TODO: 实际应该是跳转到应用商店或下载页面
            wx.showToast({
              title: "正在跳转到下载页面",
              icon: "none",
            });
          }
        },
      });
    } else {
      // 小版本更新：热更新
      this.performHotUpdate(updateInfo);
    }
  },

  // 执行热更新（预留接口）
  performHotUpdate: function (updateInfo) {
    wx.showLoading({
      title: "更新中...",
      mask: true,
    });

    // TODO: 实现热更新逻辑
    /*
    wx.downloadFile({
      url: updateInfo.downloadUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          // 处理更新包
          this.applyUpdate(res.tempFilePath);
        }
      },
      fail: (error) => {
        wx.hideLoading();
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        });
      }
    });
    */

    // 模拟更新过程
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: "更新完成",
        content: "应用已更新到最新版本，部分功能需要重启小程序后生效。",
        showCancel: false,
        confirmText: "重启应用",
        confirmColor: "#A5D7E8",
        success: () => {
          // 重启小程序
          wx.reLaunch({
            url: "/pages/index/index",
          });
        },
      });
    }, 2000);
  },

  // 退出登录
  logout: function () {
    wx.showModal({
      title: "退出登录",
      content: "确定要退出登录吗？",
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync("userInfo");
          this.setData({
            isLoggedIn: false,
            userInfo: {
              avatar: "",
              nickname: "",
              phone: "",
              loginType: "",
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

  // 开发环境：显示快速切换用户
  showQuickSwitchUsers: function () {
    this.setData({
      showQuickSwitch: true,
    });
  },

  // 隐藏快速切换用户
  hideQuickSwitch: function () {
    this.setData({
      showQuickSwitch: false,
    });
  },

  // 快速切换到指定用户
  quickSwitchToUser: function (e) {
    const userIndex = e.currentTarget.dataset.index;
    const userData = this.data.quickSwitchUsers[userIndex];

    if (!userData) return;

    wx.showLoading({
      title: "切换用户中...",
      mask: true,
    });

    // 调用手机号登录API
    const app = getApp();
    app
      .request({
        url: "/api/auth/phone-login",
        method: "POST",
        data: {
          phoneNumber: userData.phone,
          nickName: userData.nickname,
          avatar: {
            url: "/images/user_default.png",
            source: "upload",
            key: "",
          },
        },
      })
      .then((res) => {
        wx.hideLoading();
        if (res.data && res.data.success) {
          const { token, user } = res.data.data;

          // 保存token和用户信息
          wx.setStorageSync("token", token);
          const userInfo = {
            id: user.id,
            avatar: user.avatar || {
              url: "/images/user_default.png",
              source: "default",
            },
            nickname: user.nickName || userData.nickname,
            phone: user.phoneNumber || userData.phone,
            loginType: "phone",
          };

          wx.setStorageSync("userInfo", userInfo);

          // 更新全局用户信息和token
          app.globalData.token = token;
          app.globalData.hasLogin = true;
          app.updateUserInfo(userInfo);

          // 处理头像URL，确保立即可以显示
          if (userInfo.avatar) {
            if (typeof userInfo.avatar === "string") {
              userInfo.avatar = {
                url: userInfo.avatar,
                displayUrl: this.processAvatarUrl({ url: userInfo.avatar }),
              };
            } else if (typeof userInfo.avatar === "object") {
              userInfo.avatar.displayUrl = this.processAvatarUrl(
                userInfo.avatar
              );
            }
          }

          this.setData({
            isLoggedIn: true,
            userInfo: userInfo,
            showQuickSwitch: false,
          });

          wx.showToast({
            title: `已切换到${userData.nickname}`,
            icon: "success",
          });
        } else {
          wx.showToast({
            title: res.data?.message || "切换失败",
            icon: "none",
          });
        }
      })
      .catch((error) => {
        wx.hideLoading();
        console.error("快速切换用户失败:", error);
        wx.showToast({
          title: "切换失败，请重试",
          icon: "none",
        });
      });
  },
});
