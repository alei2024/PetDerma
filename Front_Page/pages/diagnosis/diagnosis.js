Page({
  data: {
    petType: 'cat', // 默认为猫咪
    imagePath: '', // 上传的图片路径
    isLoading: false, // 是否正在加载
    examples: [
      {
        image: '/images/example_cat1.png',
        label: '猫咪皮肤病示例1'
      },
      {
        image: '/images/example_cat2.png',
        label: '猫咪皮肤病示例2'
      },
      {
        image: '/images/example_dog1.png',
        label: '狗狗皮肤病示例1'
      },
      {
        image: '/images/example_dog2.png',
        label: '狗狗皮肤病示例2'
      }
    ]
  },

  onLoad: function(options) {
    // 如果从首页传递了宠物类型参数
    if (options.petType) {
      this.setData({
        petType: options.petType
      });
    } else {
      // 尝试从本地存储获取上次选择的类型
      const savedPetType = wx.getStorageSync('selectedPetType');
      if (savedPetType) {
        this.setData({
          petType: savedPetType
        });
      }
    }
    
    // 根据宠物类型更新示例图片显示
    this.updateExamples();
  },
  
  // 切换宠物类型
  switchPetType: function(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      petType: type
    });
    
    // 更新示例图片
    this.updateExamples();
    
    // 保存选择
    wx.setStorageSync('selectedPetType', type);
  },
  
  // 根据宠物类型更新示例图片
  updateExamples: function() {
    // 在实际应用中，这里可以根据不同的宠物类型显示不同的示例图片
    // 这里简单实现：猫只显示猫的示例，狗只显示狗的示例
    const filtered = this.data.examples.filter(item => {
      if (this.data.petType === 'cat') {
        return item.label.includes('猫');
      } else {
        return item.label.includes('狗');
      }
    });
    
    this.setData({
      filteredExamples: filtered
    });
  },
  
  // 选择图片
  chooseImage: function() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        that.setData({
          imagePath: res.tempFiles[0].tempFilePath
        });
      }
    });
  },
  
  // 开始诊断
  startDiagnosis: function() {
    if (!this.data.imagePath) {
      wx.showToast({
        title: '请先上传图片',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载中
    this.setData({
      isLoading: true
    });
    
    // 模拟AI诊断过程（实际应用中这里应该调用后端API）
    setTimeout(() => {
      // 诊断完成，隐藏加载
      this.setData({
        isLoading: false
      });
      
      // 将图片信息传递到结果页面
      wx.navigateTo({
        url: `/pages/diagnosis/result/result?petType=${this.data.petType}&imagePath=${this.data.imagePath}`
      });
    }, 2000); // 模拟2秒的处理时间
  }
}) 