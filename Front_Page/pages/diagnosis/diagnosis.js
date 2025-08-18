const app = getApp();

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
    console.log('诊断页面加载，使用独立的宠物数据');
    // 初始化宠物列表
    this.initPetList();
    this.validateDataIndependence();
  },

  onShow: function() {
    // 页面显示时刷新宠物列表（同步最新数据）
    this.initPetList();
  },

  // 验证数据独立性（开发调试用）
  validateDataIndependence: function() {
    setTimeout(() => {
      console.log('=== 诊断页面数据独立性验证 ===');
      console.log('诊断页面宠物列表:', this.data.petList);
      console.log('当前选中宠物ID:', this.data.selectedPetId);
      
      // 检查是否有全局数据引用
      if (app.globalData && app.globalData.petInfo) {
        console.log('全局宠物数据存在，但诊断页面不使用:', app.globalData.petInfo);
      }
      
      // 验证ID前缀
      const hasCorrectPrefix = this.data.petList.every(pet => 
        pet.id && pet.id.startsWith('diagnosis_')
      );
      console.log('所有宠物ID都有诊断前缀:', hasCorrectPrefix);
      console.log('=== 验证完成 ===');
    }, 100);
  },
  
  // 初始化宠物列表（与宠物管理页面同步）
  initPetList() {
    // 从宠物管理页面同步数据
    const petList = wx.getStorageSync('petList') || [];
    const processedPets = petList.map((p, idx) => ({ 
      id: p.id || `p${idx+1}`,
      name: p.name || `宠物${idx+1}`,
      avatar: p.avatar || '/images/default_pet.png',
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
    try {
      wx.setStorageSync('lastSelectedPetId', petId);
    } catch (e) {
      console.log('保存选中宠物ID失败:', e);
    }
    
    // 可以在这里处理诊断相关的逻辑
    console.log('诊断页面选择宠物:', selectedPet.name);
    
    // 如果需要，可以保存最后选择的宠物到独立的存储中
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
    
    // 模拟AI分析过程（实际应用中这里应该调用后端API）
    setTimeout(() => {
      const selectedPet = this.data.petList.find(pet => pet.id === this.data.selectedPetId);
      
      // 构造诊断数据
      const diagnosisData = {
        petInfo: selectedPet,
        imageList: this.data.imageList,
        symptomDescription: this.data.symptomDescription,
        // 模拟AI分析结果
        analysisResult: {
          diseaseName: '皮肤炎症',
          confidence: 85,
          severity: '中度',
          description: '根据图片分析，患处出现红肿和脱毛现象，初步诊断为皮肤炎症。',
          suggestions: [
            '保持患处清洁干燥',
            '避免宠物抓挠患处', 
            '及时就医进行专业诊断',
            '遵医嘱使用药物治疗'
          ],
          warning: '此结果仅供参考，请以专业兽医诊断为准。'
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
    }, 2000);
  },
})