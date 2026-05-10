const { processImageUrl } = require("../../utils/image-loader");

Page({
  data: {
    doctorAvatar: "/images/user_default.png",
    doctorName: "",
    stats: { total: 0, pendingReview: 0, followUpNeeded: 0 },
    recentCases: [],
  },

  onLoad() {
    this.loadDoctorInfo();
    this.loadCases();
  },

  onShow() {
    this.loadCases();
  },

  // 加载医生信息
  loadDoctorInfo() {
    const userInfo = wx.getStorageSync("userInfo");
    if (userInfo) {
      this.setData({
        doctorName: userInfo.nickName || userInfo.nickname || "合作医生",
        doctorAvatar: processImageUrl(userInfo.avatar) || "/images/user_default.png",
      });
    }
  },

  // 加载病例数据
  loadCases() {
    const token = wx.getStorageSync("token");
    if (!token) {
      this.setData({
        stats: { total: 0, pendingReview: 0, followUpNeeded: 0 },
        recentCases: [],
      });
      return;
    }

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
          const { cases, stats } = res.data.data;
          this.setData({
            stats: stats || { total: 0, pendingReview: 0, followUpNeeded: 0 },
            recentCases: (cases || []).slice(0, 5),
          });
        } else if (res.statusCode === 404) {
          // API 可能尚未部署，加载模拟数据
          this.loadMockData();
        } else {
          wx.showToast({ title: "加载失败", icon: "none" });
        }
      },
      fail: () => {
        wx.hideLoading();
        this.loadMockData();
      },
    });
  },

  // 加载模拟数据（后端 API 尚未就绪时使用）
  loadMockData() {
    const cases = wx.getStorageSync("doctorMockCases");
    if (cases) {
      const parsed = JSON.parse(cases);
      this.setData({
        recentCases: parsed.slice(0, 5),
        stats: {
          total: parsed.length,
          pendingReview: parsed.filter((c) => !c.aiSummary).length,
          followUpNeeded: parsed.filter(
            (c) => c.followUp && c.followUp.needed && !c.followUp.completed
          ).length,
        },
      });
    }
  },

  // 跳转病例列表
  viewCases() {
    wx.navigateTo({ url: "/pages/doctor/cases/cases" });
  },

  // 跳转待处理病例
  viewPendingCases() {
    wx.navigateTo({ url: "/pages/doctor/cases/cases?filter=pending" });
  },

  // 跳转需复诊病例
  viewFollowUpCases() {
    wx.navigateTo({ url: "/pages/doctor/cases/cases?filter=followup" });
  },

  // 跳转病例详情
  viewCaseDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/doctor/cases/detail/detail?id=${id}` });
  },

  // 生成模拟测试数据
  generateMockData() {
    const token = wx.getStorageSync("token");
    if (token) {
      // 先尝试调用 API 播种数据
      const app = getApp();
      const baseUrl = (app && (app.globalData.baseURL || app.globalData.baseUrl)) || "https://petderma.onrender.com";

      wx.showLoading({ title: "生成演示数据...", mask: true });

      wx.request({
        url: `${baseUrl}/api/doctor/seed-demo`,
        method: "POST",
        header: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        success: (res) => {
          wx.hideLoading();
          if (res.statusCode === 200 && res.data && res.data.success) {
            wx.showToast({ title: res.data.message || "演示数据已就绪", icon: "success" });
            this.loadCases();
            return;
          }
          this.loadLocalMockData();
        },
        fail: () => {
          wx.hideLoading();
          this.loadLocalMockData();
        },
      });
    } else {
      this.loadLocalMockData();
    }
  },

  loadLocalMockData() {
    const mockCases = [
      {
        _id: "mock_001",
        userId: { nickName: "张女士", phoneNumber: "138****1234" },
        petId: { name: "豆豆", avatar: "", species: "犬", breed: "金毛" },
        severity: "中",
        weight: 28.5,
        allergies: "花粉",
        sterilized: "是",
        skinDiseaseHistory: [
          {
            diseaseName: "湿疹",
            symptoms: ["红斑", "瘙痒", "掉毛"],
            affectedAreas: ["背部", "腹部"],
            medication: "红霉素软膏",
            isCured: "否",
            startDate: "2026-04-15",
          },
        ],
        recentContact: "近期去过宠物公园",
        createdAt: "2026-04-15",
        aiSummary:
          "患宠：豆豆（犬）；宠主：张女士；体重：28.5kg；诊断疾病：湿疹；症状表现：红斑、瘙痒、掉毛；患病部位：背部、腹部。建议进行过敏原检测并保持环境干燥。",
        trend:
          "初次就诊，症状表现为中度的皮肤红斑和瘙痒，建议持续观察并按时用药。",
        followUp: { needed: true, date: "2026-05-20", note: "复查皮肤恢复情况", completed: false },
      },
      {
        _id: "mock_002",
        userId: { nickName: "李先生", phoneNumber: "139****5678" },
        petId: { name: "咪咪", avatar: "", species: "猫", breed: "英短" },
        severity: "轻",
        weight: 4.2,
        allergies: "无",
        sterilized: "是",
        skinDiseaseHistory: [
          {
            diseaseName: "猫癣",
            symptoms: ["掉毛", "结痂"],
            affectedAreas: ["面部"],
            medication: "特比萘芬",
            isCured: "是",
            startDate: "2026-03-01",
          },
        ],
        createdAt: "2026-03-01",
        aiSummary:
          "患宠：咪咪（猫）；宠主：李先生；体重：4.2kg；诊断疾病：猫癣；症状表现：掉毛、结痂；患病部位：面部。已治愈，恢复良好。",
        trend:
          "1 次就诊记录，已痊愈。建议定期检查皮肤状态。",
        followUp: { needed: false, completed: false },
      },
      {
        _id: "mock_003",
        userId: { nickName: "王先生", phoneNumber: "137****9012" },
        petId: { name: "旺财", avatar: "", species: "犬", breed: "柯基" },
        severity: "重",
        weight: 12.0,
        allergies: "食物过敏",
        sterilized: "否",
        skinDiseaseHistory: [
          {
            diseaseName: "脓皮症",
            symptoms: ["渗液", "结痂", "红斑", "瘙痒"],
            affectedAreas: ["全身", "爪缝"],
            medication: "抗生素+药浴",
            isCured: "否",
            startDate: "2026-05-01",
          },
          {
            diseaseName: "过敏性皮炎",
            symptoms: ["红斑", "瘙痒"],
            affectedAreas: ["腹部"],
            medication: "抗组胺药",
            isCured: "是",
            startDate: "2026-01-10",
          },
        ],
        recentContact: "家中新养了一只猫",
        createdAt: "2026-05-01",
        aiSummary:
          "患宠：旺财（犬）；宠主：王先生；体重：12.0kg；诊断疾病：脓皮症；症状表现：渗液、结痂、红斑、瘙痒；患病部位：全身、爪缝。有食物过敏史，复发风险较高。建议进行过敏原排查。",
        trend:
          "该宠物共有 2 次就诊记录。既往过敏性皮炎已治愈，目前脓皮症正在治疗中，病情有复发趋势，需要持续关注。",
        followUp: { needed: true, date: "2026-05-25", note: "复查脓皮症恢复情况，建议做过敏原检测", completed: false },
      },
      {
        _id: "mock_004",
        userId: { nickName: "赵女士", phoneNumber: "136****3456" },
        petId: { name: "小白", avatar: "", species: "犬", breed: "比熊" },
        severity: "轻",
        weight: 5.8,
        allergies: "无",
        sterilized: "是",
        skinDiseaseHistory: [
          {
            diseaseName: "泪痕炎",
            symptoms: ["红斑"],
            affectedAreas: ["面部"],
            medication: "氯霉素眼药水",
            isCured: "是",
            startDate: "2026-02-20",
          },
        ],
        createdAt: "2026-02-20",
        aiSummary:
          "患宠：小白（犬）；宠主：赵女士；体重：5.8kg；诊断疾病：泪痕炎；症状表现：红斑；患病部位：面部。已治愈，情况良好。",
        trend: "初次就诊，已痊愈。建议定期清洁眼部。",
        followUp: { needed: false, completed: false },
      },
    ];

    wx.setStorageSync("doctorMockCases", JSON.stringify(mockCases));
    wx.showToast({ title: "测试数据已导入", icon: "success" });
    this.loadCases();
  },

  // 刷新数据
  refreshData() {
    wx.showToast({ title: "正在刷新...", icon: "loading" });
    this.loadCases();
  },

  // 严重程度样式
  severityClass(severity) {
    if (severity === "轻") return "light";
    if (severity === "中") return "medium";
    if (severity === "重") return "heavy";
    return "";
  },

  // 格式化时间
  formatTime(date) {
    return getApp().formatTime(date);
  },

  onAvatarError() {
    this.setData({ doctorAvatar: "/images/user_default.png" });
  },
});
