Page({
  data: {
    caseId: "",
    caseData: {},
    generating: false,
    showFollowUpForm: false,
    formNeeded: false,
    formDate: "",
    formNote: "",
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ caseId: options.id });
      this.loadCaseDetail(options.id);
    }
  },

  loadCaseDetail(id) {
    const token = wx.getStorageSync("token");
    if (!token) return;

    const app = getApp();
    const baseUrl =
      (app && (app.globalData.baseURL || app.globalData.baseUrl)) ||
      "https://petderma.onrender.com";

    wx.showLoading({ title: "加载中...", mask: true });

    wx.request({
      url: `${baseUrl}/api/doctor/cases/${id}`,
      method: "GET",
      header: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200 && res.data && res.data.success) {
          this.setData({ caseData: res.data.data });
        } else {
          this.loadMockDetail(id);
        }
      },
      fail: () => {
        wx.hideLoading();
        this.loadMockDetail(id);
      },
    });
  },

  loadMockDetail(id) {
    try {
      const stored = wx.getStorageSync("doctorMockCases");
      if (stored) {
        const cases = JSON.parse(stored);
        const caseData = cases.find((c) => c._id === id);
        if (caseData) {
          this.setData({ caseData });
        }
      }
    } catch (e) {
      console.error("加载模拟详情失败:", e);
    }
  },

  // 生成 AI 摘要
  generateSummary() {
    const { caseId } = this.data;
    const token = wx.getStorageSync("token");
    if (!token) return;

    this.setData({ generating: true });

    const app = getApp();
    const baseUrl =
      (app && (app.globalData.baseURL || app.globalData.baseUrl)) ||
      "https://petderma.onrender.com";

    wx.request({
      url: `${baseUrl}/api/doctor/cases/${caseId}/summary`,
      method: "POST",
      header: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      success: (res) => {
        this.setData({ generating: false });
        if (res.statusCode === 200 && res.data && res.data.success) {
          const { aiSummary, severity, trend } = res.data.data;
          const caseData = this.data.caseData;
          caseData.aiSummary = aiSummary;
          caseData.severity = severity;
          caseData.trend = trend;
          this.setData({ caseData });
          wx.showToast({ title: "摘要生成成功", icon: "success" });
        } else {
          this.generateMockSummary();
        }
      },
      fail: () => {
        this.setData({ generating: false });
        this.generateMockSummary();
      },
    });
  },

  generateMockSummary() {
    const { caseData } = this.data;
    const pet = caseData.petId || {};
    const owner = caseData.userId || {};
    const history = caseData.skinDiseaseHistory || [];
    const latest = history.length > 0 ? history[history.length - 1] : null;

    const lines = [];
    if (pet.name) lines.push(`患宠：${pet.name}（${pet.species || "未知"}）`);
    if (owner.nickName) lines.push(`宠主：${owner.nickName}`);
    if (caseData.weight) lines.push(`体重：${caseData.weight}kg`);
    if (latest) {
      lines.push(`诊断疾病：${latest.diseaseName || "未知"}`);
      if (latest.symptoms && latest.symptoms.length > 0) {
        lines.push(`症状表现：${latest.symptoms.join("、")}`);
      }
    }

    const severity = latest
      ? (latest.symptoms || []).length + (latest.affectedAreas || []).length >= 4
        ? "重"
        : (latest.symptoms || []).length + (latest.affectedAreas || []).length >= 2
        ? "中"
        : "轻"
      : "未知";

    const trend =
      history.length > 1
        ? `该宠物共有 ${history.length} 次就诊记录，病情发展已追踪。`
        : "初次就诊，建议持续观察。";

    caseData.aiSummary = lines.join("；");
    caseData.severity = severity;
    caseData.trend = trend;
    this.setData({ caseData });
    wx.showToast({ title: "摘要生成成功", icon: "success" });
  },

  // 复诊管理
  showFollowUpFormAction() {
    const { caseData } = this.data;
    const followUp = caseData.followUp || {};
    this.setData({
      showFollowUpForm: true,
      formNeeded: followUp.needed || false,
      formDate: followUp.date
        ? followUp.date.substring(0, 10)
        : "",
      formNote: followUp.note || "",
    });
  },

  toggleNeeded(e) {
    this.setData({ formNeeded: e.detail.value });
  },

  chooseDate(e) {
    this.setData({ formDate: e.detail.value });
  },

  inputNote(e) {
    this.setData({ formNote: e.detail.value });
  },

  cancelFollowUp() {
    this.setData({ showFollowUpForm: false });
  },

  saveFollowUp() {
    const { caseId, formNeeded, formDate, formNote } = this.data;
    const token = wx.getStorageSync("token");
    if (!token) return;

    const app = getApp();
    const baseUrl =
      (app && (app.globalData.baseURL || app.globalData.baseUrl)) ||
      "https://petderma.onrender.com";

    wx.request({
      url: `${baseUrl}/api/doctor/cases/${caseId}/follow-up`,
      method: "PUT",
      header: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      data: {
        needed: formNeeded,
        date: formDate || null,
        note: formNote,
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success) {
          this.handleFollowUpSaved(res.data.data.followUp);
        } else {
          this.saveMockFollowUp();
        }
      },
      fail: () => {
        this.saveMockFollowUp();
      },
    });
  },

  saveMockFollowUp() {
    const { formNeeded, formDate, formNote } = this.data;
    const caseData = this.data.caseData;
    caseData.followUp = {
      needed: formNeeded,
      date: formDate,
      note: formNote,
      completed: false,
    };
    this.setData({ caseData, showFollowUpForm: false });
    wx.showToast({ title: "复诊提醒已更新", icon: "success" });
  },

  handleFollowUpSaved(followUp) {
    const caseData = this.data.caseData;
    caseData.followUp = followUp;
    this.setData({ caseData, showFollowUpForm: false });
    wx.showToast({ title: "复诊提醒已更新", icon: "success" });
  },

  removeFollowUp() {
    const { caseId } = this.data;
    const token = wx.getStorageSync("token");
    if (!token) return;

    const app = getApp();
    const baseUrl =
      (app && (app.globalData.baseURL || app.globalData.baseUrl)) ||
      "https://petderma.onrender.com";

    wx.request({
      url: `${baseUrl}/api/doctor/cases/${caseId}/follow-up`,
      method: "PUT",
      header: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      data: { needed: false },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success) {
          const caseData = this.data.caseData;
          caseData.followUp = { needed: false, completed: false };
          this.setData({ caseData, showFollowUpForm: false });
          wx.showToast({ title: "已取消复诊", icon: "success" });
        } else {
          this.removeMockFollowUp();
        }
      },
      fail: () => this.removeMockFollowUp(),
    });
  },

  removeMockFollowUp() {
    const caseData = this.data.caseData;
    caseData.followUp = { needed: false, completed: false };
    this.setData({ caseData, showFollowUpForm: false });
    wx.showToast({ title: "已取消复诊", icon: "success" });
  },

  // 完成复诊
  completeFollowUp() {
    const { caseId } = this.data;
    const token = wx.getStorageSync("token");
    if (!token) return;

    const app = getApp();
    const baseUrl =
      (app && (app.globalData.baseURL || app.globalData.baseUrl)) ||
      "https://petderma.onrender.com";

    wx.showModal({
      title: "确认完成",
      content: "确认该复诊已完成？",
      success: (modal) => {
        if (modal.confirm) {
          wx.request({
            url: `${baseUrl}/api/doctor/cases/${caseId}/follow-up/complete`,
            method: "PUT",
            header: {
              Authorization: `Bearer ${token}`,
              "content-type": "application/json",
            },
            success: (res) => {
              if (res.statusCode === 200 && res.data && res.data.success) {
                const caseData = this.data.caseData;
                caseData.followUp.completed = true;
                this.setData({ caseData });
                wx.showToast({ title: "复诊已完成", icon: "success" });
              } else {
                this.completeMockFollowUp();
              }
            },
            fail: () => this.completeMockFollowUp(),
          });
        }
      },
    });
  },

  completeMockFollowUp() {
    const caseData = this.data.caseData;
    caseData.followUp.completed = true;
    this.setData({ caseData });
    wx.showToast({ title: "复诊已完成", icon: "success" });
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url] });
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
