Page({
  data: {
    instInfo: {
      name: "",
      avatar: "",
      status: "pending",
      statusText: "待认证",
    },
    stats: {
      pendingPreconsult: 0,
      todayAppointments: 0,
      totalReports: 0,
    },
    recentReports: [],
  },

  onLoad() {
    this.loadInstitutionInfo();
    this.loadReports();
  },

  onShow() {
    this.loadReports();
  },

  loadInstitutionInfo() {
    const saved = wx.getStorageSync("institutionRegisterInfo");
    if (saved) {
      this.setData({
        "instInfo.name": saved.name || "未认证机构",
        "instInfo.status": "pending",
        "instInfo.statusText": "待认证",
      });
    }

    const token = wx.getStorageSync("token");
    if (!token) return;

    const app = getApp();
    const baseUrl = (app && (app.globalData.baseURL || app.globalData.baseUrl)) || "https://petderma.onrender.com";

    wx.request({
      url: `${baseUrl}/api/institution/profile`,
      method: "GET",
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200 && res.data?.success) {
          const info = res.data.data;
          const statusMap = { pending: "待认证", approved: "已认证", rejected: "未通过" };
          this.setData({
            instInfo: {
              name: info.name || "",
              avatar: info.avatar || "",
              status: info.status || "pending",
              statusText: statusMap[info.status] || "待认证",
            },
          });
        }
      },
      fail: () => {},
    });
  },

  loadReports() {
    const token = wx.getStorageSync("token");
    if (!token) {
      this.loadMockReports();
      return;
    }

    const app = getApp();
    const baseUrl = (app && (app.globalData.baseURL || app.globalData.baseUrl)) || "https://petderma.onrender.com";

    wx.request({
      url: `${baseUrl}/api/institution/reports`,
      method: "GET",
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200 && res.data?.success) {
          const { reports, stats } = res.data.data;
          this.setData({
            recentReports: (reports || []).slice(0, 5),
            stats: stats || this.data.stats,
          });
        } else {
          this.loadMockReports();
        }
      },
      fail: () => this.loadMockReports(),
    });
  },

  loadMockReports() {
    const stored = wx.getStorageSync("institutionMockReports");
    if (stored) {
      const parsed = JSON.parse(stored);
      this.setData({
        recentReports: parsed.slice(0, 5),
        stats: {
          pendingPreconsult: parsed.filter(r => r.status === "pending").length,
          todayAppointments: 2,
          totalReports: parsed.length,
        },
      });
      return;
    }

    const mockReports = [
      { id: "rpt_001", petName: "豆豆", petType: "金毛", ownerName: "张女士", diseaseName: "湿疹", time: "今天 10:30", status: "pending", statusText: "待处理" },
      { id: "rpt_002", petName: "咪咪", petType: "英短", ownerName: "李先生", diseaseName: "猫癣", time: "今天 09:15", status: "read", statusText: "已查看" },
      { id: "rpt_003", petName: "旺财", petType: "柯基", ownerName: "王先生", diseaseName: "脓皮症", time: "昨天 16:45", status: "pending", statusText: "待处理" },
      { id: "rpt_004", petName: "小白", petType: "比熊", ownerName: "赵女士", diseaseName: "泪痕炎", time: "昨天 14:20", status: "completed", statusText: "已完成" },
    ];

    wx.setStorageSync("institutionMockReports", JSON.stringify(mockReports));
    this.setData({
      recentReports: mockReports,
      stats: { pendingPreconsult: 2, todayAppointments: 2, totalReports: 4 },
    });
  },

  viewPreconsultList() {
    wx.navigateTo({ url: "/pages/institution/preconsult-list/preconsult-list" });
  },

  viewAppointments() {
    wx.navigateTo({ url: "/pages/institution/appointment/appointment" });
  },

  goToRegister() {
    wx.navigateTo({ url: "/pages/institution/register/register" });
  },

  viewReportDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/institution/preconsult-detail/preconsult-detail?id=${id}` });
  },
});
