const app = getApp();

Page({
  data: {
    diagnosisRecords: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    currentPage: 1,
    pageSize: 10,
    showFilter: false,
    filterType: 'all', // all, favorite
  },

  onLoad: function(options) {
    this.loadDiagnosisRecords();
  },

  onShow: function() {
    // 页面显示时刷新数据
    this.refreshData();
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.refreshData();
  },

  // 上拉加载更多
  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreRecords();
    }
  },

  // 刷新数据
  refreshData: function() {
    this.setData({
      currentPage: 1,
      hasMore: true,
      refreshing: true
    });
    this.loadDiagnosisRecords(true);
  },

  // 加载诊断记录
  loadDiagnosisRecords: function(isRefresh = false) {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (!isRefresh) {
      this.setData({ loading: true });
    }

    const { currentPage, pageSize, filterType } = this.data;
    const params = {
      page: currentPage,
      limit: pageSize
    };

    // 如果筛选收藏记录
    if (filterType === 'favorite') {
      params.favorite = 'true';
    }

    app.request({
      url: '/api/diagnosis',
      method: 'GET',
      data: params
    }).then((res) => {
      if (res.statusCode === 200 && res.data.success) {
        const { records, pagination } = res.data.data;
        
        // 处理概率数据格式，只保留前三名并按概率排序
        const processedRecords = records.map(record => {
          if (record.diagnosisResult && record.diagnosisResult.allProbabilities) {
            // 按概率从高到低排序
            const sorted = record.diagnosisResult.allProbabilities.sort((a, b) => {
              const probA = parseFloat(a.probability) || 0;
              const probB = parseFloat(b.probability) || 0;
              return probB - probA;
            });
            
            // 只保留前三名并格式化
            record.diagnosisResult.allProbabilities = sorted.slice(0, 3).map(prob => ({
              ...prob,
              probability: (prob.probability * 100).toFixed(1), // 转换为百分比并保留1位小数
              displayName: prob.diseaseName || prob.class || '未知'
            }));
          }
          return record;
        });

        let newRecords = processedRecords;
        if (!isRefresh && currentPage > 1) {
          newRecords = [...this.data.diagnosisRecords, ...processedRecords];
        }

        this.setData({
          diagnosisRecords: newRecords,
          hasMore: pagination.current < pagination.pages,
          loading: false,
          refreshing: false
        });

        // 停止下拉刷新
        if (isRefresh) {
          wx.stopPullDownRefresh();
        }
      } else {
        this.setData({
          loading: false,
          refreshing: false
        });
        wx.showToast({
          title: res.data?.message || '加载失败',
          icon: 'none'
        });
      }
    }).catch((error) => {
      console.error('加载诊断记录失败:', error);
      this.setData({
        loading: false,
        refreshing: false
      });
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  // 加载更多记录
  loadMoreRecords: function() {
    this.setData({
      currentPage: this.data.currentPage + 1
    });
    this.loadDiagnosisRecords();
  },

  // 切换筛选类型
  switchFilter: function(e) {
    const filterType = e.currentTarget.dataset.type;
    this.setData({
      filterType: filterType,
      currentPage: 1,
      hasMore: true
    });
    this.loadDiagnosisRecords(true);
  },

  // 显示筛选弹窗
  showFilterModal: function() {
    this.setData({
      showFilter: true
    });
  },

  // 隐藏筛选弹窗
  hideFilterModal: function() {
    this.setData({
      showFilter: false
    });
  },

  // 查看诊断详情
  viewDiagnosisDetail: function(e) {
    const recordId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/user/diagnosis-detail/diagnosis-detail?id=${recordId}`
    });
  },

  // 切换收藏状态
  toggleFavorite: function(e) {
    const recordId = e.currentTarget.dataset.id;
    const record = this.data.diagnosisRecords.find(item => item._id === recordId);
    
    if (!record) return;

    wx.showLoading({
      title: '处理中...',
      mask: true
    });

    app.request({
      url: `/api/diagnosis/${recordId}/favorite`,
      method: 'PATCH'
    }).then((res) => {
      wx.hideLoading();
      if (res.statusCode === 200 && res.data.success) {
        // 更新本地数据
        const records = this.data.diagnosisRecords.map(item => {
          if (item._id === recordId) {
            return { ...item, isFavorite: res.data.data.isFavorite };
          }
          return item;
        });
        
        this.setData({
          diagnosisRecords: records
        });

        wx.showToast({
          title: res.data.data.isFavorite ? '收藏成功' : '取消收藏成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.data?.message || '操作失败',
          icon: 'none'
        });
      }
    }).catch((error) => {
      wx.hideLoading();
      console.error('切换收藏状态失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  // 删除诊断记录
  deleteDiagnosis: function(e) {
    const recordId = e.currentTarget.dataset.id;
    const record = this.data.diagnosisRecords.find(item => item._id === recordId);
    
    if (!record) return;

    wx.showModal({
      title: '删除诊断记录',
      content: `确定要删除"${record.diagnosisResult.diseaseName}"的诊断记录吗？`,
      success: (res) => {
        if (res.confirm) {
          this.performDelete(recordId);
        }
      }
    });
  },

  // 执行删除
  performDelete: function(recordId) {
    // 检查是否已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '删除中...',
      mask: true
    });

    app.request({
      url: `/api/diagnosis/${recordId}`,
      method: 'DELETE'
    }).then((res) => {
      wx.hideLoading();
      console.log('删除响应:', res);
      if (res.statusCode === 200 && res.data.success) {
        // 从本地数据中移除
        const records = this.data.diagnosisRecords.filter(item => item._id !== recordId);
        this.setData({
          diagnosisRecords: records
        });

        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.data?.message || '删除失败',
          icon: 'none'
        });
      }
    }).catch((error) => {
      wx.hideLoading();
      console.error('删除诊断记录失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  // 格式化日期
  formatDate: function(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString();
    }
  },

  // 获取严重程度文本
  getSeverityText: function(severity) {
    const severityMap = {
      1: '轻微',
      2: '轻度', 
      3: '中度',
      4: '重度',
      5: '严重'
    };
    return severityMap[severity] || '未知';
  },

  // 阻止事件冒泡
  stopPropagation: function(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
  },

  // 跳转到诊断页面
  goToDiagnosis: function() {
    wx.navigateTo({
      url: '/pages/diagnosis/diagnosis'
    });
  }
});
