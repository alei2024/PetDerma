// pages/user/health/health.js
const app = getApp();

Page({
  data: {
    petList: [],
    selectedPetId: null,
    healthForm: {
      weight: '',
      allergies: '',
      sterilized: '',
      deworming: {
        frequency: '',
        lastDate: ''
      },
      recentContact: '',
      skinDiseaseHistory: []
    },
    showSkinDiseaseForm: false,
    editingSkinDiseaseIndex: -1,
    skinDiseaseForm: {
      startDate: '',
      diseaseName: '',
      affectedAreas: [],
      symptoms: [],
      medication: '',
      isCured: '',
      notes: ''
    },
    loading: false
  },

  onLoad: function() {
    this.loadPetList();
  },

  onShow: function() {
    this.loadPetList();
  },

  // 加载宠物列表
  loadPetList: function() {
    const token = wx.getStorageSync('token');
    if (!token || token === 'test-token') {
      // 未登录时从本地存储加载
      const petList = wx.getStorageSync('petList') || [];
      this.setData({
        petList: petList
      });
      return;
    }

    this.setData({ loading: true });

    app.request({
      url: '/api/pets',
      method: 'GET',
    }).then((res) => {
      this.setData({ loading: false });
      if (res.statusCode === 200 && res.data.success) {
        const petList = res.data.data || [];
        this.setData({
          petList: petList
        });
        // 同时更新本地存储
        wx.setStorageSync('petList', petList);
      } else {
        console.error('获取宠物列表失败:', res.data);
        wx.showToast({
          title: res.data?.message || '获取宠物列表失败',
          icon: 'none'
        });
      }
    }).catch((error) => {
      this.setData({ loading: false });
      console.error('获取宠物列表错误:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  // 选择宠物
  selectPet: function(e) {
    const petId = e.currentTarget.dataset.petId;
    this.setData({
      selectedPetId: petId
    });
    this.loadHealthRecord(petId);
  },

  // 加载健康档案
  loadHealthRecord: function(petId) {
    const token = wx.getStorageSync('token');
    if (!token || token === 'test-token') {
      // 未登录时从本地存储加载
      const healthRecords = wx.getStorageSync('healthRecords') || {};
      const healthRecord = healthRecords[petId];
      if (healthRecord) {
        this.setData({
          healthForm: healthRecord
        });
      } else {
        this.resetHealthForm();
      }
      return;
    }

    app.request({
      url: `/api/health/${petId}`,
      method: 'GET',
    }).then((res) => {
      if (res.statusCode === 200 && res.data.success) {
        if (res.data.data) {
          const healthData = res.data.data;
          this.setData({
            healthForm: {
              weight: healthData.weight || '',
              allergies: healthData.allergies || '',
              sterilized: healthData.sterilized || '',
              deworming: {
                frequency: healthData.deworming?.frequency || '',
                lastDate: healthData.deworming?.lastDate ? healthData.deworming.lastDate.split('T')[0] : ''
              },
              recentContact: healthData.recentContact || '',
              skinDiseaseHistory: healthData.skinDiseaseHistory || []
            }
          });
        } else {
          this.resetHealthForm();
        }
      } else {
        console.error('获取健康档案失败:', res.data);
        this.resetHealthForm();
      }
    }).catch((error) => {
      console.error('获取健康档案错误:', error);
      this.resetHealthForm();
    });
  },

  // 重置健康表单
  resetHealthForm: function() {
    this.setData({
      healthForm: {
        weight: '',
        allergies: '',
        sterilized: '',
        deworming: {
          frequency: '',
          lastDate: ''
        },
        recentContact: '',
        skinDiseaseHistory: []
      }
    });
  },

  // 输入体重
  onWeightInput: function(e) {
    this.setData({
      'healthForm.weight': e.detail.value
    });
  },

  // 输入过敏史
  onAllergiesInput: function(e) {
    this.setData({
      'healthForm.allergies': e.detail.value
    });
  },

  // 选择绝育状态
  selectSterilized: function(e) {
    this.setData({
      'healthForm.sterilized': e.currentTarget.dataset.value
    });
  },

  // 选择驱虫频率
  selectDewormingFreq: function(e) {
    this.setData({
      'healthForm.deworming.frequency': e.currentTarget.dataset.value
    });
  },

  // 选择驱虫日期
  onDewormingDateChange: function(e) {
    this.setData({
      'healthForm.deworming.lastDate': e.detail.value
    });
  },

  // 输入近期接触史
  onRecentContactInput: function(e) {
    this.setData({
      'healthForm.recentContact': e.detail.value
    });
  },

  // 添加皮肤病史
  addSkinDiseaseHistory: function() {
    this.setData({
      showSkinDiseaseForm: true,
      editingSkinDiseaseIndex: -1,
      skinDiseaseForm: {
        startDate: '',
        diseaseName: '',
        affectedAreas: [],
        symptoms: [],
        medication: '',
        isCured: '',
        notes: ''
      }
    });
  },

  // 编辑皮肤病史
  editSkinDiseaseHistory: function(e) {
    const index = e.currentTarget.dataset.index;
    const history = this.data.healthForm.skinDiseaseHistory[index];
    this.setData({
      showSkinDiseaseForm: true,
      editingSkinDiseaseIndex: index,
      skinDiseaseForm: {
        startDate: history.startDate ? history.startDate.split('T')[0] : '',
        diseaseName: history.diseaseName || '',
        affectedAreas: history.affectedAreas || [],
        symptoms: history.symptoms || [],
        medication: history.medication || '',
        isCured: history.isCured || '',
        notes: history.notes || ''
      }
    });
  },

  // 删除皮肤病史
  deleteSkinDiseaseHistory: function(e) {
    const index = e.currentTarget.dataset.index;
    const history = this.data.healthForm.skinDiseaseHistory[index];
    
    wx.showModal({
      title: '删除记录',
      content: `确定要删除"${history.diseaseName}"的记录吗？`,
      success: (res) => {
        if (res.confirm) {
          const skinDiseaseHistory = [...this.data.healthForm.skinDiseaseHistory];
          skinDiseaseHistory.splice(index, 1);
          this.setData({
            'healthForm.skinDiseaseHistory': skinDiseaseHistory
          });
        }
      }
    });
  },

  // 关闭皮肤病史表单
  closeSkinDiseaseForm: function() {
    this.setData({
      showSkinDiseaseForm: false
    });
  },

  // 皮肤病史日期选择
  onSkinDiseaseDateChange: function(e) {
    this.setData({
      'skinDiseaseForm.startDate': e.detail.value
    });
  },

  // 输入患病名称
  onDiseaseNameInput: function(e) {
    this.setData({
      'skinDiseaseForm.diseaseName': e.detail.value
    });
  },

  // 切换患病部位
  toggleAffectedArea: function(e) {
    console.log('toggleAffectedArea clicked', e.currentTarget.dataset);
    console.log('Current affectedAreas:', this.data.skinDiseaseForm.affectedAreas);
    
    const area = e.currentTarget.dataset.area;
    const areas = [...this.data.skinDiseaseForm.affectedAreas];
    const index = areas.indexOf(area);
    
    if (index > -1) {
      areas.splice(index, 1);
      console.log('Removed area:', area);
    } else {
      areas.push(area);
      console.log('Added area:', area);
    }
    
    console.log('Updated affectedAreas:', areas);
    this.setData({
      'skinDiseaseForm.affectedAreas': areas
    });
    
    // 验证数据是否更新成功
    setTimeout(() => {
      console.log('After setData, affectedAreas:', this.data.skinDiseaseForm.affectedAreas);
    }, 100);
  },

  // 切换症状
  toggleSymptom: function(e) {
    console.log('toggleSymptom clicked', e.currentTarget.dataset);
    console.log('Current symptoms:', this.data.skinDiseaseForm.symptoms);
    
    const symptom = e.currentTarget.dataset.symptom;
    const symptoms = [...this.data.skinDiseaseForm.symptoms];
    const index = symptoms.indexOf(symptom);
    
    if (index > -1) {
      symptoms.splice(index, 1);
      console.log('Removed symptom:', symptom);
    } else {
      symptoms.push(symptom);
      console.log('Added symptom:', symptom);
    }
    
    console.log('Updated symptoms:', symptoms);
    this.setData({
      'skinDiseaseForm.symptoms': symptoms
    });
    
    // 验证数据是否更新成功
    setTimeout(() => {
      console.log('After setData, symptoms:', this.data.skinDiseaseForm.symptoms);
    }, 100);
  },

  // 输入用药
  onMedicationInput: function(e) {
    this.setData({
      'skinDiseaseForm.medication': e.detail.value
    });
  },

  // 选择是否治愈
  selectIsCured: function(e) {
    this.setData({
      'skinDiseaseForm.isCured': e.currentTarget.dataset.value
    });
  },

  // 输入皮肤病史备注
  onSkinDiseaseNotesInput: function(e) {
    this.setData({
      'skinDiseaseForm.notes': e.detail.value
    });
  },

  // 保存皮肤病史
  saveSkinDiseaseHistory: function() {
    const form = this.data.skinDiseaseForm;
    
    // 验证必填字段
    if (!form.startDate || !form.diseaseName || !form.isCured) {
      wx.showToast({
        title: '请填写必填信息',
        icon: 'none'
      });
      return;
    }

    const skinDiseaseHistory = [...this.data.healthForm.skinDiseaseHistory];
    
    if (this.data.editingSkinDiseaseIndex >= 0) {
      // 编辑现有记录
      skinDiseaseHistory[this.data.editingSkinDiseaseIndex] = {
        startDate: form.startDate,
        diseaseName: form.diseaseName,
        affectedAreas: form.affectedAreas,
        symptoms: form.symptoms,
        medication: form.medication,
        isCured: form.isCured,
        notes: form.notes
      };
    } else {
      // 添加新记录
      skinDiseaseHistory.push({
        startDate: form.startDate,
        diseaseName: form.diseaseName,
        affectedAreas: form.affectedAreas,
        symptoms: form.symptoms,
        medication: form.medication,
        isCured: form.isCured,
        notes: form.notes
      });
    }

    this.setData({
      'healthForm.skinDiseaseHistory': skinDiseaseHistory,
      showSkinDiseaseForm: false
    });

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  // 保存健康档案
  saveHealthRecord: function() {
    const form = this.data.healthForm;
    
    // 验证必填字段
    if (!form.sterilized || !form.deworming.frequency) {
      wx.showToast({
        title: '请填写绝育状态和驱虫频率',
        icon: 'none'
      });
      return;
    }

    this.performSaveHealthRecord(form);
  },

  // 执行保存健康档案
  performSaveHealthRecord: function(form) {
    const token = wx.getStorageSync('token');
    if (!token || token === 'test-token') {
      // 未登录时保存到本地存储
      this.saveHealthRecordToLocal(form);
      return;
    }

    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    const healthData = {
      weight: form.weight ? parseFloat(form.weight) : undefined,
      allergies: form.allergies || '无',
      sterilized: form.sterilized,
      deworming: {
        frequency: form.deworming.frequency,
        lastDate: form.deworming.lastDate || undefined
      },
      recentContact: form.recentContact || '',
      skinDiseaseHistory: form.skinDiseaseHistory || []
    };

    app.request({
      url: `/api/health/${this.data.selectedPetId}`,
      method: 'POST',
      data: healthData,
    }).then((res) => {
      wx.hideLoading();
      if (res.statusCode === 200 && res.data.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.data?.message || '保存失败',
          icon: 'none'
        });
      }
    }).catch((error) => {
      wx.hideLoading();
      console.error('保存健康档案错误:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  // 保存到本地存储（未登录时使用）
  saveHealthRecordToLocal: function(form) {
    const healthRecords = wx.getStorageSync('healthRecords') || {};
    healthRecords[this.data.selectedPetId] = form;
    wx.setStorageSync('healthRecords', healthRecords);

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  }
}) 