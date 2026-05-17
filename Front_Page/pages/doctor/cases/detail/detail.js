Page({
  data: {
    caseId: '',
    caseData: {},
    severityScore: '0.63',
    imageView: 'original',
    internalNote: '',
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ caseId: options.id });
      this.loadCaseDetail(options.id);
    }
  },

  loadCaseDetail(id) {
    const token = wx.getStorageSync('token');
    if (!token) return this.loadMockDetail(id);

    const app = getApp();
    wx.request({
      url: `${app.globalData.baseURL || app.globalData.baseUrl}/api/doctor/cases/${id}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.data?.success) {
          this.setData({ caseData: res.data.data });
          return;
        }
        this.loadMockDetail(id);
      },
      fail: () => this.loadMockDetail(id),
    });
  },

  loadMockDetail(id) {
    try {
      const stored = wx.getStorageSync('doctorMockCases');
      if (stored) {
        const cases = JSON.parse(stored);
        const caseData = cases.find(c => c._id === id);
        if (caseData) this.setData({ caseData });
      }
    } catch (e) {}
  },

  // 图片视图切换
  switchImageView(e) {
    const view = e.currentTarget.dataset.view;
    this.setData({ imageView: view });
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url] });
  },

  // 建议到店检查
  suggestClinic() {
    wx.showModal({
      title: '建议到店检查',
      content: '将给用户发送到店检查建议？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已发送建议', icon: 'success' });
        }
      },
    });
  },

  // 联系用户
  contactOwner() {
    const phone = this.data.caseData.userId?.phoneNumber || '';
    wx.showModal({
      title: '联系用户',
      content: phone ? `联系电话：${phone}` : '暂无联系方式',
      confirmText: phone ? '拨打电话' : '知道了',
      success: (res) => {
        if (res.confirm && phone) {
          wx.makePhoneCall({ phoneNumber: phone });
        }
      },
    });
  },

  // 标记高风险
  markHighRisk() {
    wx.showToast({ title: '已标记为高风险', icon: 'none' });
  },

  // 建议复诊
  suggestFollowUp() {
    wx.showModal({
      title: '设置复诊提醒',
      content: '是否为此病例创建复诊提醒？',
      success: (res) => {
        if (res.confirm) {
          const caseData = this.data.caseData;
          caseData.followUp = {
            needed: true,
            date: new Date(Date.now() + 7 * 86400000).toISOString(),
            note: '建议复诊检查恢复情况',
            completed: false,
          };
          this.setData({ caseData });
          wx.showToast({ title: '复诊提醒已设置', icon: 'success' });
        }
      },
    });
  },

  // 转为预约
  convertToAppointment() {
    const { caseData } = this.data;
    const appointments = wx.getStorageSync('doctorAppointments')
      ? JSON.parse(wx.getStorageSync('doctorAppointments'))
      : [];

    const newAppt = {
      id: `appt_${Date.now()}`,
      caseId: caseData._id,
      petName: caseData.petId?.name || '未知宠物',
      ownerName: caseData.userId?.nickName || '未知用户',
      date: new Date().toISOString(),
      serviceType: '皮肤病复核',
      severity: caseData.severity || '待评估',
      hasReport: !!caseData.aiSummary,
      status: 'pending',
      notes: '',
    };

    appointments.unshift(newAppt);
    wx.setStorageSync('doctorAppointments', JSON.stringify(appointments));
    wx.showToast({ title: '已转为预约', icon: 'success' });
  },

  // 添加备注
  addNote() {
    wx.showModal({
      title: '添加内部备注',
      editable: true,
      placeholderText: '输入内部备注内容...',
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({ internalNote: res.content });
          wx.showToast({ title: '备注已保存', icon: 'success' });
        }
      },
    });
  },

  severityClass(severity) {
    if (severity === '轻') return 'light';
    if (severity === '中') return 'medium';
    if (severity === '重') return 'heavy';
    return '';
  },
});
