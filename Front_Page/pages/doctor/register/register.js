Page({
  data: {
    step: 1,
    selectedType: '',
    registered: false,
    canSubmit: false,
    institutionInfo: {},
    form: {
      name: '',
      contact: '',
      phone: '',
      hours: '',
      address: '',
      services: '',
      cert: '',
      photo: '',
      acceptReferral: true,
      acceptBooking: true,
    },
  },

  onLoad() {
    this.checkRegistration();
    this.checkCanSubmit();
  },

  onShow() {
    this.checkRegistration();
    this.checkCanSubmit();
  },

  checkRegistration() {
    try {
      const info = wx.getStorageSync('doctorInstitutionInfo');
      if (info) {
        this.setData({
          registered: true,
          institutionInfo: info,
        });
      }
    } catch (e) {
      console.error('读取入驻信息失败:', e);
    }
  },

  selectType(e) {
    this.setData({ selectedType: e.currentTarget.dataset.type });
  },

  nextStep() {
    if (this.data.step === 1 && this.data.selectedType) {
      this.setData({ step: 2 });
    }
  },

  prevStep() {
    if (this.data.step === 2) {
      this.setData({ step: 1 });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`form.${field}`]: value,
    });
    this.checkCanSubmit();
  },

  toggleSwitch(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: e.detail.value,
    });
  },

  checkCanSubmit() {
    const f = this.data.form;
    const canSubmit = !!(f.name && f.contact && f.phone && f.hours && f.address && f.services);
    this.setData({ canSubmit });
  },

  uploadCert() {
    wx.showToast({ title: '演示模式：已模拟上传', icon: 'none' });
    this.setData({ 'form.cert': 'dummy_cert_url' });
  },

  uploadPhoto() {
    wx.showToast({ title: '演示模式：已模拟上传', icon: 'none' });
    this.setData({ 'form.photo': 'dummy_photo_url' });
  },

  // 提交审核
  submitForm() {
    const { form, selectedType } = this.data;
    const institutionInfo = {
      name: form.name,
      type: selectedType,
      contact: form.contact,
      phone: form.phone,
      hours: form.hours,
      address: form.address,
      services: form.services,
      cert: form.cert,
      photo: form.photo,
      acceptReferral: form.acceptReferral,
      acceptBooking: form.acceptBooking,
      registeredAt: new Date().toISOString(),
      status: 'approved',
    };

    try {
      wx.setStorageSync('doctorInstitutionInfo', institutionInfo);
      wx.showToast({ title: '入驻成功！', icon: 'success' });
      this.setData({
        registered: true,
        institutionInfo,
        step: 3,
      });
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  // 进入工作台
  enterDashboard() {
    wx.navigateTo({ url: '/pages/doctor/doctor' });
  },

  // canSubmit 由 checkCanSubmit() 实时更新
});
