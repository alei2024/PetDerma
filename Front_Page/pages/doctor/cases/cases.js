Page({
  data: {
    currentFilter: 'all',
    allCases: [],
    filteredCases: [],
  },

  onLoad(options) {
    const filter = options.filter || 'all';
    this.setData({ currentFilter: filter });
    this.loadCases();
  },

  onShow() {
    this.loadCases();
  },

  loadCases() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    if (!token) return this.loadLocalCases();

    wx.request({
      url: `${app.globalData.baseURL || app.globalData.baseUrl}/api/doctor/cases`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.data?.success) {
          this.setData({ allCases: res.data.data.cases || [] });
          this.applyFilter();
          return;
        }
        this.loadLocalCases();
      },
      fail: () => this.loadLocalCases(),
    });
  },

  loadLocalCases() {
    try {
      const stored = wx.getStorageSync('doctorMockCases');
      if (stored) {
        this.setData({ allCases: JSON.parse(stored) });
        this.applyFilter();
      }
    } catch (e) {}
  },

  applyFilter() {
    const { allCases, currentFilter } = this.data;
    let filtered = allCases;

    switch (currentFilter) {
      case 'pending':
        filtered = allCases.filter(c => !c.aiSummary);
        break;
      case 'contacted':
        filtered = allCases.filter(c => c.contacted);
        break;
      case 'booked':
        // booked: 有预约关联 (mock中为followUp已设置)
        filtered = allCases.filter(c => c.followUp?.needed);
        break;
      case 'highrisk':
        filtered = allCases.filter(c => c.severity === '重');
        break;
      case 'care':
        filtered = allCases.filter(c => c.severity === '轻');
        break;
    }

    this.setData({ filteredCases: filtered });
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ currentFilter: filter });
    this.applyFilter();
  },

  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/doctor/cases/detail/detail?id=${id}` });
  },

  contactOwner(e) {
    const id = e.currentTarget.dataset.id;
    const caseItem = this.data.allCases.find(c => c._id === id);
    const phone = caseItem?.userId?.phoneNumber || '';
    wx.showModal({
      title: '联系用户',
      content: phone ? `联系电话：${phone}` : '暂无用户联系方式',
      confirmText: phone ? '拨打电话' : '知道了',
      success: (res) => {
        if (res.confirm && phone) {
          wx.makePhoneCall({ phoneNumber: phone });
        }
      },
    });
  },

  suggestBooking(e) {
    const id = e.currentTarget.dataset.id;
    // 创建预约
    const appointments = wx.getStorageSync('doctorAppointments')
      ? JSON.parse(wx.getStorageSync('doctorAppointments'))
      : [];

    const caseItem = this.data.allCases.find(c => c._id === id);
    if (!caseItem) return;

    const newAppt = {
      id: `appt_${Date.now()}`,
      caseId: id,
      petName: caseItem.petId?.name || '未知宠物',
      ownerName: caseItem.userId?.nickName || '未知用户',
      date: new Date().toISOString(),
      serviceType: '皮肤病复核',
      severity: caseItem.severity || '待评估',
      hasReport: !!caseItem.aiSummary,
      status: 'pending', // pending | confirmed | today | completed | cancelled
      notes: '',
    };

    appointments.unshift(newAppt);
    wx.setStorageSync('doctorAppointments', JSON.stringify(appointments));
    wx.showToast({ title: '已创建预约建议', icon: 'success' });
  },

  severityClass(severity) {
    if (severity === '轻') return 'light';
    if (severity === '中') return 'medium';
    if (severity === '重') return 'heavy';
    return '';
  },

  formatTime(date) {
    return getApp().formatTime(date);
  },
});
