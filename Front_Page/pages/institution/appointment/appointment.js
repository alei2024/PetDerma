Page({
  data: {
    selectedDate: "today",
    dateStats: { today: 0, tomorrow: 0, week: 0 },
    stats: { pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
    allAppointments: [],
    filteredAppointments: [],
  },

  onLoad() {
    this.loadAppointments();
  },

  onShow() {
    this.loadAppointments();
  },

  loadAppointments() {
    const token = wx.getStorageSync("token");
    const app = getApp();
    const baseUrl = (app && (app.globalData.baseURL || app.globalData.baseUrl)) || "https://petderma.onrender.com";

    if (token) {
      wx.request({
        url: `${baseUrl}/api/institution/appointments`,
        method: "GET",
        header: { Authorization: `Bearer ${token}` },
        success: (res) => {
          if (res.statusCode === 200 && res.data?.success) {
            const { appointments } = res.data.data;
            this.processAppointments(appointments || []);
            return;
          }
          this.loadMockAppointments();
        },
        fail: () => this.loadMockAppointments(),
      });
    } else {
      this.loadMockAppointments();
    }
  },

  loadMockAppointments() {
    const mockAppointments = [
      { id: "apt_001", petName: "豆豆", petType: "金毛", ownerName: "张女士", service: "皮肤复查", time: "09:30", date: "today", status: "pending", statusText: "待确认" },
      { id: "apt_002", petName: "咪咪", petType: "英短", ownerName: "李先生", service: "猫癣复诊", time: "10:00", date: "today", status: "confirmed", statusText: "已确认" },
      { id: "apt_003", petName: "旺财", petType: "柯基", ownerName: "王先生", service: "脓皮症复诊", time: "14:00", date: "today", status: "confirmed", statusText: "已确认" },
      { id: "apt_004", petName: "小白", petType: "比熊", ownerName: "赵女士", service: "泪痕复查", time: "15:30", date: "today", status: "completed", statusText: "已完成" },
      { id: "apt_005", petName: "花花", petType: "橘猫", ownerName: "陈女士", service: "皮肤检查", time: "09:00", date: "tomorrow", status: "pending", statusText: "待确认" },
      { id: "apt_006", petName: "布丁", petType: "泰迪", ownerName: "林先生", service: "过敏检测", time: "11:00", date: "tomorrow", status: "pending", statusText: "待确认" },
      { id: "apt_007", petName: "lucky", petType: "哈士奇", ownerName: "杨先生", service: "药浴护理", time: "16:00", date: "week", status: "pending", statusText: "待确认" },
    ];
    this.processAppointments(mockAppointments);
  },

  processAppointments(appointments) {
    const today = new Date();
    const todayStr = "today";
    const tomorrowStr = "tomorrow";
    const weekStr = "week";

    const todayApps = appointments.filter(a => a.date === todayStr);
    const tomorrowApps = appointments.filter(a => a.date === tomorrowStr);
    const weekApps = appointments.filter(a => a.date === weekStr);

    const all = [...todayApps, ...tomorrowApps, ...weekApps];

    const stats = {
      pending: all.filter(a => a.status === "pending").length,
      confirmed: all.filter(a => a.status === "confirmed").length,
      completed: all.filter(a => a.status === "completed").length,
      cancelled: all.filter(a => a.status === "cancelled").length,
    };

    this.setData({
      allAppointments: all,
      dateStats: { today: todayApps.length, tomorrow: tomorrowApps.length, week: weekApps.length },
      stats,
    });
    this.applyDateFilter();
  },

  selectDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ selectedDate: date }, () => this.applyDateFilter());
  },

  applyDateFilter() {
    const { selectedDate, allAppointments } = this.data;
    this.setData({
      filteredAppointments: allAppointments.filter(a => a.date === selectedDate),
    });
  },

  updateAppointmentStatus(id, status, statusText) {
    const token = wx.getStorageSync("token");
    const app = getApp();
    const baseUrl = (app && (app.globalData.baseURL || app.globalData.baseUrl)) || "https://petderma.onrender.com";

    if (token) {
      wx.request({
        url: `${baseUrl}/api/institution/appointments/${id}/status`,
        method: "PUT",
        header: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        data: { status, statusText },
        fail: () => {},
      });
    }

    const allAppointments = this.data.allAppointments.map(a => {
      if (a.id === id) return { ...a, status, statusText };
      return a;
    });
    this.setData({ allAppointments });
    this.processAppointments(allAppointments);
  },

  confirmAppointment(e) {
    const id = e.currentTarget.dataset.id;
    this.updateAppointmentStatus(id, "confirmed", "已确认");
    wx.showToast({ title: "已确认预约", icon: "success" });
  },

  rejectAppointment(e) {
    const id = e.currentTarget.dataset.id;
    this.updateAppointmentStatus(id, "cancelled", "已取消");
    wx.showToast({ title: "已拒绝预约", icon: "none" });
  },

  completeAppointment(e) {
    const id = e.currentTarget.dataset.id;
    this.updateAppointmentStatus(id, "completed", "已完成");
    wx.showToast({ title: "服务已完成", icon: "success" });
  },
});
