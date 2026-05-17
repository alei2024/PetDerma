Page({
  data: {
    institution: {},
    stats: {
      todayAppointments: 0,
      pendingCases: 0,
      highRisk: 0,
      followUp: 0,
    },
    recentCases: [],
  },

  onLoad() {
    this.loadInstitutionInfo();
    this.loadStats();
    this.loadCases();
  },

  onShow() {
    this.loadInstitutionInfo();
    this.loadStats();
    this.loadCases();
  },

  // 加载入驻信息
  loadInstitutionInfo() {
    try {
      const info = wx.getStorageSync('doctorInstitutionInfo');
      if (info) {
        this.setData({ institution: info });
      }
    } catch (e) {
      console.error('读取入驻信息失败:', e);
    }
  },

  // 加载统计数据（结合入驻信息和本地模拟数据）
  loadStats() {
    let appointments = [];
    try {
      const stored = wx.getStorageSync('doctorAppointments');
      if (stored) appointments = JSON.parse(stored);
    } catch (e) {}

    let allCases = [];
    try {
      const stored = wx.getStorageSync('doctorMockCases');
      if (stored) allCases = JSON.parse(stored);
    } catch (e) {}

    // 今日预约数
    const today = new Date().toISOString().substring(0, 10);
    const todayApps = appointments.filter(a =>
      a.date && a.date.substring(0, 10) === today && a.status !== 'cancelled'
    ).length;

    // 待处理: 无 AI 摘要的病例
    const pending = allCases.filter(c => !c.aiSummary).length;

    // 高风险: severity === '重'
    const highRisk = allCases.filter(c => c.severity === '重').length;

    // 待复诊
    const followUp = allCases.filter(c =>
      c.followUp && c.followUp.needed && !c.followUp.completed
    ).length;

    this.setData({
      stats: {
        todayAppointments: todayApps || 3, // 演示默认
        pendingCases: pending || 2,
        highRisk: highRisk || 1,
        followUp: followUp || 2,
      },
    });
  },

  // 加载病例
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
          this.setData({ recentCases: (res.data.data.cases || []).slice(0, 5) });
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
        this.setData({ recentCases: JSON.parse(stored).slice(0, 5) });
      }
    } catch (e) {}
  },

  // 导航
  navigateTo(e) {
    const url = e.currentTarget.dataset.url;
    wx.navigateTo({ url });
  },

  viewCaseDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/doctor/cases/detail/detail?id=${id}` });
  },

  goRegister() {
    wx.navigateTo({ url: '/pages/doctor/register/register' });
  },

  editStorefront() {
    wx.navigateTo({ url: '/pages/doctor/register/register' });
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
