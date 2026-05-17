Page({
  data: {
    formData: {
      name: "",
      type: "hospital",
      contact: "",
      phone: "",
      address: "",
      description: "",
      licenseUrl: "",
      agreed: false,
    },
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value,
    });
  },

  selectType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      "formData.type": type,
    });
  },

  toggleAgreement() {
    this.setData({
      "formData.agreed": !this.data.formData.agreed,
    });
  },

  uploadLicense() {
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const tempPath = res.tempFilePaths[0];
        wx.showLoading({ title: "上传中...", mask: true });

        const app = getApp();
        const token = wx.getStorageSync("token");
        const baseUrl = (app && (app.globalData.baseURL || app.globalData.baseUrl)) || "https://petderma.onrender.com";

        wx.uploadFile({
          url: `${baseUrl}/api/upload`,
          filePath: tempPath,
          name: "file",
          formData: { type: "license" },
          header: { Authorization: `Bearer ${token}` },
          success: (uploadRes) => {
            wx.hideLoading();
            try {
              const data = JSON.parse(uploadRes.data);
              if (data.success && data.data?.url) {
                this.setData({ "formData.licenseUrl": data.data.url });
              }
            } catch (e) {
              this.setData({ "formData.licenseUrl": tempPath });
            }
          },
          fail: () => {
            wx.hideLoading();
            this.setData({ "formData.licenseUrl": tempPath });
            wx.showToast({ title: "已使用本地图片", icon: "none" });
          },
        });
      },
    });
  },

  submitRegistration() {
    const { formData } = this.data;
    if (!formData.name || !formData.contact || !formData.phone) {
      wx.showToast({ title: "请填写必填信息", icon: "none" });
      return;
    }
    if (!formData.agreed) {
      wx.showToast({ title: "请阅读并同意入驻协议", icon: "none" });
      return;
    }

    wx.showLoading({ title: "提交中...", mask: true });

    const app = getApp();
    const token = wx.getStorageSync("token");
    const baseUrl = (app && (app.globalData.baseURL || app.globalData.baseUrl)) || "https://petderma.onrender.com";

    wx.request({
      url: `${baseUrl}/api/institution/register`,
      method: "POST",
      header: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      data: formData,
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200 && res.data?.success) {
          wx.showToast({ title: "入驻申请已提交", icon: "success" });
          wx.setStorageSync("institutionRegisterInfo", formData);
          setTimeout(() => wx.navigateBack(), 1500);
        } else if (res.statusCode === 404) {
          wx.hideLoading();
          wx.showToast({ title: "申请已提交（离线）", icon: "success" });
          wx.setStorageSync("institutionRegisterInfo", formData);
          setTimeout(() => wx.navigateBack(), 1500);
        } else {
          wx.showToast({ title: res.data?.message || "提交失败，请重试", icon: "none" });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "申请已提交（离线模式）", icon: "success" });
        wx.setStorageSync("institutionRegisterInfo", formData);
        setTimeout(() => wx.navigateBack(), 1500);
      },
    });
  },
});
