const app = getApp();
const modelService = require('./model/modelService_real.js');

Page({
  // 跳转到智能问诊页面
  goToAIConsult() {
    wx.navigateTo({
      url: '/pages/diagnosis/chat/chat',
    });
  },
  data: {
    // 宠物列表（从首页获取或使用默认数据）
    petList: [],
    selectedPetId: 'p1', // 默认选中第一个宠物
    imageList: [], // 上传的图片列表
    symptomDescription: '', // 症状描述
    showGuideModal: false, // 是否显示拍摄指南弹窗
    isLoading: false, // 是否正在加载
  },

  onLoad: function(options) {
    // 初始化宠物列表
    this.initPetList();
  },

  onShow: function() {
    // 页面显示时刷新宠物列表（同步最新数据）
    this.initPetList();
  },

  
  // 初始化宠物列表（与宠物管理页面同步）
  initPetList() {
    // 从宠物管理页面同步数据
    const petList = wx.getStorageSync('petList') || [];
    const processedPets = petList.map((p, idx) => ({ 
      id: p.id || p._id || `p${idx+1}`,
      name: p.name || `宠物${idx+1}`,
      avatar: p.avatar ? (p.avatar.url || p.avatar) : '/images/default_pet.png',
      type: p.type || 'cat',
      lastDiagnosis: p.lastDiagnosis || null,
      healthStatus: p.healthStatus || 'unknown'
    }));
    // 尝试获取上次选择的宠物ID
    const lastSelectedId = wx.getStorageSync('lastSelectedPetId');
    // 检查该ID是否存在于当前宠物列表中
    const isIdValid = processedPets.some(pet => pet.id === lastSelectedId);
    const targetId = isIdValid ? lastSelectedId : processedPets[0]?.id;
    this.setData({ 
      petList: processedPets,
      selectedPetId: targetId
    });
  },
  
  // 诊断页面宠物选择（独立于首页）
  selectPet: function(e) {
    const petId = e.currentTarget.dataset.id;
    if (!petId) return;
    
    // 仅在诊断页面数据中查找选中的宠物
    const selectedPet = this.data.petList.find(pet => pet.id === petId);
    if (!selectedPet) return;
    
    this.setData({ selectedPetId: petId });
    // 保存用户选择的宠物ID到本地存储
    wx.setStorageSync('lastSelectedPetId', petId);
    
    // 可以在这里处理诊断相关的逻辑
    try {
      wx.setStorageSync('lastSelectedPetForDiagnosis', {
        id: petId,
        name: selectedPet.name,
        avatar: selectedPet.avatar,
        type: selectedPet.type,
        timestamp: Date.now()
      });
    } catch (e) {
      console.log('保存诊断页面选中宠物失败:', e);
    }
  },

  // 获取当前选中的宠物信息（诊断页面专用）
  getCurrentSelectedPet: function() {
    const selectedId = this.data.selectedPetId;
    return this.data.petList.find(pet => pet.id === selectedId) || null;
  },

  // 选择图片
  chooseImage: function() {
    const that = this;
    const remainingCount = 9 - this.data.imageList.length;
    
    if (remainingCount <= 0) {
      wx.showToast({
        title: '最多只能上传9张图片',
        icon: 'none'
      });
      return;
    }
    
    wx.chooseMedia({
      count: remainingCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const newImages = res.tempFiles.map(file => file.tempFilePath);
        that.setData({
          imageList: [...that.data.imageList, ...newImages]
        });
      }
    });
  },
  
  // 删除图片
  deleteImage: function(e) {
    const index = e.currentTarget.dataset.index;
    const imageList = [...this.data.imageList];
    imageList.splice(index, 1);
    this.setData({
      imageList: imageList
    });
  },
  
  // 输入症状描述
  onDescInput: function(e) {
    this.setData({
      symptomDescription: e.detail.value
    });
  },
  
  // 显示拍摄指南
  showGuide: function() {
    this.setData({
      showGuideModal: true
    });
  },
  
  // 隐藏拍摄指南
  hideGuide: function() {
    this.setData({
      showGuideModal: false
    });
  },
  
  // 开始智能分析
  startAnalysis: function() {
    if (this.data.imageList.length === 0) {
      wx.showToast({
        title: '请先上传至少一张图片',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.symptomDescription.trim()) {
      wx.showToast({
        title: '请描述宠物症状',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载中
    this.setData({
      isLoading: true
    });
    
    // 调用模型预测服务
    this.performDiagnosis();
  },

  // 执行诊断分析
  async performDiagnosis() {
    try {
      const selectedPet = this.data.petList.find(pet => pet.id === this.data.selectedPetId);
      
      // 检查服务器健康状态
      const isHealthy = await modelService.checkServerHealth();
      if (!isHealthy) {
        throw new Error('服务器暂时不可用，请稍后重试');
      }
      
      // 调用模型预测服务
      const predictionResult = await modelService.predictSkinDisease(this.data.imageList);
      
      // 构造诊断数据
      const diagnosisData = {
        petInfo: {
          ...selectedPet,
          id: selectedPet.id || selectedPet._id || this.data.selectedPetId
        },
        imageList: this.data.imageList,
        symptomDescription: this.data.symptomDescription,
        analysisResult: {
          diseaseName: predictionResult.diseaseName,
          confidence: predictionResult.confidence,
          severity: predictionResult.severity,
          description: predictionResult.description,
          suggestions: predictionResult.suggestions.homeAdvice || [],
          medicalAdvice: predictionResult.suggestions.medicalAdvice || [],
          preventAdvice: predictionResult.suggestions.preventAdvice || [],
          warning: predictionResult.warning,
          // 添加详细的预测信息
          predictedClass: predictionResult.predictedClass,
          allProbabilities: predictionResult.allProbabilities,
          imageCount: predictionResult.imageCount || this.data.imageList.length
        }
      };
      
      // 关闭加载中
      this.setData({
        isLoading: false
      });
      
      // 跳转到结果页面
      wx.navigateTo({
        url: `/pages/diagnosis/result/result?data=${encodeURIComponent(JSON.stringify(diagnosisData))}`
      });
      
    } catch (error) {
      console.error('诊断分析失败:', error);
      
      // 关闭加载中
      this.setData({
        isLoading: false
      });
      
      // 根据错误类型显示不同的提示
      let errorMessage = '分析失败，请重试';
      if (error.message.includes('服务器')) {
        errorMessage = '服务器暂时不可用，请检查网络连接后重试';
      } else if (error.message.includes('网络')) {
        errorMessage = '网络连接失败，请检查网络设置';
      } else if (error.message.includes('图片')) {
        errorMessage = '图片格式不支持，请重新选择图片';
      }
      
      wx.showModal({
        title: '诊断失败',
        content: errorMessage,
        showCancel: true,
        cancelText: '取消',
        confirmText: '重试',
        success: (res) => {
          if (res.confirm) {
            // 用户选择重试
            this.startAnalysis();
          }
        }
      });
    }
  },
})