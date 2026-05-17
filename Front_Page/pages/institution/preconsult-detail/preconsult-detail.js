Page({
  data: {
    reportId: "",
    report: {
      petName: "",
      petAvatar: "",
      petType: "",
      petBreed: "",
      ownerName: "",
      ownerPhone: "",
      diseaseName: "",
      severity: "",
      confidence: 0,
      status: "pending",
      statusText: "待处理",
      aiSummary: "",
      symptoms: [],
      affectedAreas: [],
      weight: "",
      allergies: "",
      sterilized: "",
      recentContact: "",
      images: [],
      time: "",
    },
  },

  onLoad(options) {
    const id = options.id || "";
    this.setData({ reportId: id });
    this.loadReportDetail(id);
  },

  loadReportDetail(id) {
    const token = wx.getStorageSync("token");
    const app = getApp();
    const baseUrl = (app && (app.globalData.baseURL || app.globalData.baseUrl)) || "https://petderma.onrender.com";

    if (token) {
      wx.request({
        url: `${baseUrl}/api/institution/reports/${id}`,
        method: "GET",
        header: { Authorization: `Bearer ${token}` },
        success: (res) => {
          if (res.statusCode === 200 && res.data?.success) {
            this.setData({ report: res.data.data });
            return;
          }
          this.loadMockDetail(id);
        },
        fail: () => this.loadMockDetail(id),
      });
    } else {
      this.loadMockDetail(id);
    }
  },

  loadMockDetail(id) {
    const mockDB = {
      rpt_001: {
        id: "rpt_001", petName: "豆豆", petAvatar: "", petType: "犬", petBreed: "金毛", ownerName: "张女士", ownerPhone: "138****1234",
        diseaseName: "湿疹", severity: "中", confidence: 85, status: "pending", statusText: "待处理",
        aiSummary: "患宠：豆豆（犬），体重28.5kg。主要诊断：湿疹。症状表现：红斑、瘙痒、掉毛。患病部位：背部、腹部。建议进行过敏原检测并保持环境干燥。",
        symptoms: ["红斑", "瘙痒", "掉毛"], affectedAreas: ["背部", "腹部"], weight: "28.5kg", allergies: "花粉", sterilized: "是", recentContact: "近期去过宠物公园",
        images: [], time: "今天 10:30",
      },
      rpt_002: {
        id: "rpt_002", petName: "咪咪", petAvatar: "", petType: "猫", petBreed: "英短", ownerName: "李先生", ownerPhone: "139****5678",
        diseaseName: "猫癣", severity: "轻", confidence: 92, status: "read", statusText: "已查看",
        aiSummary: "患宠：咪咪（猫），体重4.2kg。猫癣已治愈。面部出现掉毛、结痂症状。",
        symptoms: ["掉毛", "结痂"], affectedAreas: ["面部"], weight: "4.2kg", allergies: "无", sterilized: "是", recentContact: "无",
        images: [], time: "今天 09:15",
      },
      rpt_003: {
        id: "rpt_003", petName: "旺财", petAvatar: "", petType: "犬", petBreed: "柯基", ownerName: "王先生", ownerPhone: "137****9012",
        diseaseName: "脓皮症", severity: "重", confidence: 78, status: "pending", statusText: "待处理",
        aiSummary: "患宠：旺财（犬），体重12kg。诊断为脓皮症。症状：渗液、结痂、红斑、瘙痒。患病部位：全身、爪缝。有食物过敏史，复发风险较高。",
        symptoms: ["渗液", "结痂", "红斑", "瘙痒"], affectedAreas: ["全身", "爪缝"], weight: "12.0kg", allergies: "食物过敏", sterilized: "否", recentContact: "家中新养了一只猫",
        images: [], time: "昨天 16:45",
      },
      rpt_004: {
        id: "rpt_004", petName: "小白", petAvatar: "", petType: "犬", petBreed: "比熊", ownerName: "赵女士", ownerPhone: "136****3456",
        diseaseName: "泪痕炎", severity: "轻", confidence: 95, status: "completed", statusText: "已完成",
        aiSummary: "患宠：小白（犬），体重5.8kg。泪痕炎已治愈。建议定期清洁眼部。",
        symptoms: ["红斑"], affectedAreas: ["面部"], weight: "5.8kg", allergies: "无", sterilized: "是", recentContact: "无",
        images: [], time: "昨天 14:20",
      },
      rpt_005: {
        id: "rpt_005", petName: "小黑", petAvatar: "", petType: "猫", petBreed: "田园猫", ownerName: "刘女士", ownerPhone: "135****6789",
        diseaseName: "猫藓", severity: "中", confidence: 82, status: "pending", statusText: "待处理",
        aiSummary: "患宠：小黑（猫），面部出现红斑脱毛，疑似猫藓。建议进行真菌培养确诊。",
        symptoms: ["红斑", "脱毛"], affectedAreas: ["面部"], weight: "3.8kg", allergies: "无", sterilized: "否", recentContact: "曾接触流浪猫",
        images: [], time: "前天 11:00",
      },
    };

    const detail = mockDB[id];
    if (detail) {
      this.setData({ report: detail });
      wx.showToast({ title: "加载模拟数据", icon: "none" });
    } else {
      wx.showToast({ title: "报告不存在", icon: "none" });
    }
  },

  severityClass(severity) {
    if (severity === "轻" || severity === "轻度") return "light";
    if (severity === "中" || severity === "中度") return "medium";
    if (severity === "重" || severity === "重度") return "heavy";
    return "";
  },

  markAsRead() {
    const token = wx.getStorageSync("token");
    const app = getApp();
    const baseUrl = (app && (app.globalData.baseURL || app.globalData.baseUrl)) || "https://petderma.onrender.com";

    wx.showLoading({ title: "更新中...", mask: true });

    if (token) {
      wx.request({
        url: `${baseUrl}/api/institution/reports/${this.data.reportId}/read`,
        method: "PUT",
        header: { Authorization: `Bearer ${token}` },
        success: (res) => {
          wx.hideLoading();
          if (res.statusCode === 200 && res.data?.success) {
            this.setData({ "report.status": "read", "report.statusText": "已查看" });
            wx.showToast({ title: "已标记", icon: "success" });
          }
        },
        fail: () => {
          wx.hideLoading();
          this.setData({ "report.status": "read", "report.statusText": "已查看" });
          wx.showToast({ title: "已标记（离线）", icon: "success" });
        },
      });
    } else {
      wx.hideLoading();
      this.setData({ "report.status": "read", "report.statusText": "已查看" });
      wx.showToast({ title: "已标记（离线）", icon: "success" });
    }
  },

  contactOwner() {
    const phone = this.data.report.ownerPhone;
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone });
    } else {
      wx.showToast({ title: "暂无联系方式", icon: "none" });
    }
  },

  addFollowUp() {
    wx.showToast({ title: "复诊提醒已添加", icon: "success" });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.report.images;
    wx.previewImage({ current: url, urls });
  },
});
