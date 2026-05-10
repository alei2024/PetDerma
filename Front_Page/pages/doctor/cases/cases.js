Page({
  data: {
    currentFilter: "all",
    allCases: [],
    filteredCases: [],
  },

  onLoad(options) {
    const filter = options.filter || "all";
    this.setData({ currentFilter: filter });
    this.loadCases();
  },

  onShow() {
    this.loadCases();
  },

  loadCases() {
    const token = wx.getStorageSync("token");
    if (!token) return;

    const app = getApp();
    const baseUrl =
      (app && (app.globalData.baseURL || app.globalData.baseUrl)) ||
      "https://petderma.onrender.com";

    wx.showLoading({ title: "加载中...", mask: true });

    wx.request({
      url: `${baseUrl}/api/doctor/cases`,
      method: "GET",
      header: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200 && res.data && res.data.success) {
          const cases = res.data.data.cases || [];
          this.setData({ allCases: cases });
          this.applyFilter();
        } else {
          this.loadMockData();
        }
      },
      fail: () => {
        wx.hideLoading();
        this.loadMockData();
      },
    });
  },

  loadMockData() {
    try {
      const stored = wx.getStorageSync("doctorMockCases");
      if (stored) {
        const cases = JSON.parse(stored);
        this.setData({ allCases: cases });
        this.applyFilter();
      }
    } catch (e) {
      console.error("加载模拟数据失败:", e);
    }
  },

  applyFilter() {
    const { allCases, currentFilter } = this.data;
    let filtered = allCases;

    if (currentFilter === "pending") {
      filtered = allCases.filter((c) => !c.aiSummary);
    } else if (currentFilter === "followup") {
      filtered = allCases.filter(
        (c) => c.followUp && c.followUp.needed && !c.followUp.completed
      );
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

  severityClass(severity) {
    if (severity === "轻") return "light";
    if (severity === "中") return "medium";
    if (severity === "重") return "heavy";
    return "";
  },

  formatTime(date) {
    return getApp().formatTime(date);
  },
});
