Page({
  data: {
    currentStatus: 'pending',
    allAppointments: [],
    filteredAppointments: [],
    statusCounts: {
      pending: 0,
      confirmed: 0,
      today: 0,
      completed: 0,
      cancelled: 0,
    },
  },

  onLoad() {
    this.loadAppointments();
  },

  onShow() {
    this.loadAppointments();
  },

  loadAppointments() {
    let appointments = [];
    try {
      const stored = wx.getStorageSync('doctorAppointments');
      if (stored) {
        appointments = JSON.parse(stored);
      } else {
        // 初次使用时初始化演示数据
        appointments = this.initMockData();
      }
    } catch (e) {
      appointments = this.initMockData();
    }

    this.setData({ allAppointments: appointments });
    this.applyFilter();
    this.updateCounts();
  },

  initMockData() {
    const now = new Date();
    const today = now.toISOString();
    const tomorrow = new Date(now.getTime() + 86400000).toISOString();
    const yesterday = new Date(now.getTime() - 86400000).toISOString();

    const mock = [
      {
        id: 'appt_mock_001',
        caseId: 'mock_001',
        petName: '豆豆',
        ownerName: '张女士',
        date: today,
        serviceType: '皮肤病复核',
        severity: '中',
        hasReport: true,
        status: 'pending',
        notes: '',
      },
      {
        id: 'appt_mock_002',
        caseId: 'mock_003',
        petName: '旺财',
        ownerName: '王先生',
        date: tomorrow,
        serviceType: '皮肤病复核',
        severity: '重',
        hasReport: false,
        status: 'confirmed',
        notes: '',
      },
      {
        id: 'appt_mock_003',
        caseId: '',
        petName: '咪咪',
        ownerName: '李先生',
        date: today,
        serviceType: '洗护护理',
        severity: '轻',
        hasReport: true,
        status: 'today',
        notes: '',
      },
      {
        id: 'appt_mock_004',
        caseId: 'mock_004',
        petName: '小白',
        ownerName: '赵女士',
        date: yesterday,
        serviceType: '皮肤病复核',
        severity: '轻',
        hasReport: true,
        status: 'completed',
        notes: '',
      },
      {
        id: 'appt_mock_005',
        caseId: '',
        petName: '团子',
        ownerName: '刘女士',
        date: yesterday,
        serviceType: '皮肤病复核',
        severity: '中',
        hasReport: false,
        status: 'cancelled',
        notes: '',
      },
    ];

    // 给已完成预约添加到店记录
    mock[3].visitNotes = {
      diagnosis: '湿疹（轻度），建议保持环境干燥',
      suggestTest: true,
      suggestFollowUp: true,
      followUpNote: '7天后复诊',
      remarks: '患处有扩散趋势，建议尽早复查',
    };

    wx.setStorageSync('doctorAppointments', JSON.stringify(mock));
    return mock;
  },

  applyFilter() {
    const { allAppointments, currentStatus } = this.data;
    let filtered = allAppointments;

    if (currentStatus === 'pending') {
      filtered = allAppointments.filter(a => a.status === 'pending');
    } else if (currentStatus === 'confirmed') {
      filtered = allAppointments.filter(a => a.status === 'confirmed');
    } else if (currentStatus === 'today') {
      filtered = allAppointments.filter(a => a.status === 'today');
    } else if (currentStatus === 'completed') {
      filtered = allAppointments.filter(a => a.status === 'completed');
    } else if (currentStatus === 'cancelled') {
      filtered = allAppointments.filter(a => a.status === 'cancelled');
    }

    this.setData({ filteredAppointments: filtered });
  },

  updateCounts() {
    const { allAppointments } = this.data;
    this.setData({
      statusCounts: {
        pending: allAppointments.filter(a => a.status === 'pending').length,
        confirmed: allAppointments.filter(a => a.status === 'confirmed').length,
        today: allAppointments.filter(a => a.status === 'today').length,
        completed: allAppointments.filter(a => a.status === 'completed').length,
        cancelled: allAppointments.filter(a => a.status === 'cancelled').length,
      },
    });
  },

  switchStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ currentStatus: status });
    this.applyFilter();
  },

  // 确认预约
  confirmAppt(e) {
    const id = e.currentTarget.dataset.id;
    this.updateApptStatus(id, 'confirmed');
    wx.showToast({ title: '已确认预约', icon: 'success' });
  },

  // 修改时间
  rescheduleAppt(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '修改预约时间',
      editable: true,
      placeholderText: '输入新的预约时间',
      success: (res) => {
        if (res.confirm) {
          this.updateApptField(id, 'date', res.content || new Date().toISOString());
          wx.showToast({ title: '时间已修改', icon: 'success' });
        }
      },
    });
  },

  // 联系用户
  contactOwner(e) {
    wx.showModal({
      title: '联系用户',
      content: '暂无联系方式（演示数据）',
      confirmText: '知道了',
    });
  },

  // 标记到店
  markArrived(e) {
    const id = e.currentTarget.dataset.id;
    this.updateApptStatus(id, 'today');
    wx.showToast({ title: '用户已到店', icon: 'success' });
  },

  // 标记完成 + 填写到店信息
  markCompleted(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '填写到店信息',
      content: '是否填写到店诊断记录？',
      success: (modal) => {
        if (modal.confirm) {
          // 弹出到店记录表单
          wx.showModal({
            title: '实际判断',
            editable: true,
            placeholderText: '如：疑似真菌感染',
            success: (res) => {
              if (res.confirm) {
                this.updateApptField(id, 'visitNotes', {
                  diagnosis: res.content || '已到店检查',
                  suggestTest: true,
                  suggestFollowUp: true,
                  followUpNote: '7天后复诊',
                  remarks: '',
                });
                this.updateApptStatus(id, 'completed');
                wx.showToast({ title: '已完成', icon: 'success' });
              }
            },
          });
        }
      },
    });
  },

  // 取消预约
  cancelAppt(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '取消预约',
      content: '确定取消该预约？',
      success: (res) => {
        if (res.confirm) {
          this.updateApptStatus(id, 'cancelled');
          wx.showToast({ title: '已取消', icon: 'none' });
        }
      },
    });
  },

  // 查看AI报告
  viewReport(e) {
    const id = e.currentTarget.dataset.id;
    const appt = this.data.allAppointments.find(a => a.id === id);
    if (appt && appt.caseId) {
      wx.navigateTo({ url: `/pages/doctor/cases/detail/detail?id=${appt.caseId}` });
    } else {
      wx.showToast({ title: '无关联AI报告', icon: 'none' });
    }
  },

  // 工具函数
  updateApptStatus(id, newStatus) {
    const { allAppointments } = this.data;
    const appt = allAppointments.find(a => a.id === id);
    if (appt) {
      appt.status = newStatus;
      this.setData({ allAppointments });
      wx.setStorageSync('doctorAppointments', JSON.stringify(allAppointments));
      this.applyFilter();
      this.updateCounts();
    }
  },

  updateApptField(id, field, value) {
    const { allAppointments } = this.data;
    const appt = allAppointments.find(a => a.id === id);
    if (appt) {
      appt[field] = value;
      this.setData({ allAppointments });
      wx.setStorageSync('doctorAppointments', JSON.stringify(allAppointments));
      this.applyFilter();
    }
  },

  statusText(status) {
    const map = {
      pending: '待确认',
      confirmed: '已确认',
      today: '今日到店',
      completed: '已完成',
      cancelled: '已取消',
    };
    return map[status] || status;
  },

  formatDate(dateStr) {
    if (!dateStr) return '未设置';
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[d.getDay()];
    return `${month}月${day}日 ${weekDay} ${hours}:${mins}`;
  },
});
