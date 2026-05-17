Page({
  data: {
    filter: "all",
    allReports: [],
    filteredReports: [],
  },

  onLoad() {
    this.loadReports();
  },

  onShow() {
    this.loadReports();
  },

  loadReports() {
    const token = wx.getStorageSync("token");
    const app = getApp();
    const baseUrl = (app && (app.globalData.baseURL || app.globalData.baseUrl)) || "https://petderma.onrender.com";

    if (token) {
      wx.request({
        url: `${baseUrl}/api/institution/reports`,
        method: "GET",
        header: { Authorization: `Bearer ${token}` },
        success: (res) => {
          if (res.statusCode === 200 && res.data?.success) {
            this.setData({ allReports: res.data.data.reports || [] });
            this.applyFilter();
            return;
          }
          this.loadMockReports();
        },
        fail: () => this.loadMockReports(),
      });
    } else {
      this.loadMockReports();
    }
  },

  loadMockReports() {
    const stored = wx.getStorageSync("institutionMockReports");
    let reports;
    if (stored) {
      reports = JSON.parse(stored);
    } else {
      reports = [
        { id: "rpt_001", petName: "豆豆", petType: "金毛", ownerName: "张女士", diseaseName: "湿疹", severity: "中", time: "今天 10:30", status: "pending", statusText: "待处理", aiSummary: "患宠：豆豆（犬），体重28.5kg，诊断为湿疹，症状包括红斑、瘙痒、掉毛。" },
        { id: "rpt_002", petName: "咪咪", petType: "英短", ownerName: "李先生", diseaseName: "猫癣", severity: "轻", time: "今天 09:15", status: "read", statusText: "已查看", aiSummary: "患宠：咪咪（猫），体重4.2kg，猫癣已治愈。" },
        { id: "rpt_003", petName: "旺财", petType: "柯基", ownerName: "王先生", diseaseName: "脓皮症", severity: "重", time: "昨天 16:45", status: "pending", statusText: "待处理", aiSummary: "患宠：旺财（犬），体重12kg，诊断为脓皮症，有食物过敏史。" },
        { id: "rpt_004", petName: "小白", petType: "比熊", ownerName: "赵女士", diseaseName: "泪痕炎", severity: "轻", time: "昨天 14:20", status: "completed", statusText: "已完成" },
        { id: "rpt_005", petName: "小黑", petType: "田园猫", ownerName: "刘女士", diseaseName: "猫藓", severity: "中", time: "前天 11:00", status: "pending", statusText: "待处理", aiSummary: "患宠：小黑（猫），面部出现红斑脱毛，疑似猫藓。" },
      ];
      wx.setStorageSync("institutionMockReports", JSON.stringify(reports));
    }
    this.setData({ allReports: reports });
    this.applyFilter();
  },

  setFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ filter }, () => this.applyFilter());
  },

  applyFilter() {
    const { filter, allReports } = this.data;
    if (filter === "all") {
      this.setData({ filteredReports: allReports });
    } else {
      this.setData({ filteredReports: allReports.filter(r => r.status === filter) });
    }
  },

  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/institution/preconsult-detail/preconsult-detail?id=${id}` });
  },
});
