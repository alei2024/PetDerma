Page({
  data: {
    petType: 'cat', // 默认为猫咪
    imagePath: '', // 上传的图片路径
    currentTab: 'home', // 当前选中的建议标签
    markedArea: null, // 标记区域
    diagnosisResult: {
      diseaseName: '猫咪皮肤癣', // 示例疾病名称
      confidence: 85, // 可信度百分比
      severity: 3, // 严重程度，1-5
      description: '猫咪皮肤癣是由真菌引起的常见皮肤病，主要表现为皮肤局部脱毛、发红、皮屑增多等症状。该病具有传染性，可能传染给其他宠物或人类。', // 疾病描述
      homeAdvice: [
        '保持患处清洁干燥，避免抓挠',
        '使用兽医推荐的抗真菌洗液给猫咪洗澡',
        '定期更换猫咪的床垫和玩具',
        '使用伊丽莎白圈防止猫咪舔舐患处'
      ],
      medicalAdvice: [
        '建议尽快前往宠物医院进行确诊',
        '可能需要进行皮肤刮片检查确认真菌类型',
        '遵医嘱使用抗真菌药物',
        '定期复诊观察恢复情况'
      ],
      preventAdvice: [
        '定期给猫咪洗澡并梳理毛发',
        '保持生活环境干净卫生',
        '避免与患病动物接触',
        '增强猫咪免疫力，提供均衡饮食'
      ]
    }
  },

  onLoad: function(options) {
    // 获取传递的参数
    if (options.petType) {
      this.setData({
        petType: options.petType
      });
    }
    
    if (options.imagePath) {
      this.setData({
        imagePath: options.imagePath
      });
    }
    
    // 根据宠物类型更新诊断结果（实际应用中应该是从AI分析结果获取）
    this.updateDiagnosisResult();
  },
  
  // 更新诊断结果（模拟数据）
  updateDiagnosisResult: function() {
    // 这里模拟不同宠物类型的不同诊断结果
    let result = this.data.diagnosisResult;
    
    if (this.data.petType === 'dog') {
      result = {
        diseaseName: '犬皮肤螨虫病',
        confidence: 78,
        severity: 4,
        description: '犬皮肤螨虫病是由蠕形螨引起的常见皮肤病，主要表现为严重瘙痒、皮肤红肿、结痂和脱毛。该病具有传染性，需要及时治疗。',
        homeAdvice: [
          '隔离患病犬只，防止传染给其他宠物',
          '使用兽医推荐的杀螨洗液给狗狗洗澡',
          '定期清洗狗狗的窝和玩具',
          '避免狗狗抓挠患处，必要时使用伊丽莎白圈'
        ],
        medicalAdvice: [
          '建议尽快就医，进行皮肤刮片检查确认螨虫类型',
          '遵医嘱使用外用杀螨药物',
          '严重情况可能需要口服药物治疗',
          '定期复诊检查治疗效果'
        ],
        preventAdvice: [
          '定期给狗狗洗澡，使用专业洗护产品',
          '保持环境卫生，定期消毒',
          '定期驱虫',
          '增强狗狗免疫力，提供均衡营养'
        ]
      };
    }
    
    this.setData({
      diagnosisResult: result
    });
  },
  
  // 切换建议标签
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tab
    });
  },
  
  // 收藏结果
  saveResult: function() {
    // 保存诊断结果到本地存储
    try {
      // 获取已有的收藏记录
      let savedResults = wx.getStorageSync('savedDiagnosisResults') || [];
      
      // 添加新的诊断结果
      const newResult = {
        id: new Date().getTime(),
        petType: this.data.petType,
        imagePath: this.data.imagePath,
        result: this.data.diagnosisResult,
        date: new Date().toISOString()
      };
      
      savedResults.unshift(newResult);
      
      // 保存更新后的收藏记录
      wx.setStorageSync('savedDiagnosisResults', savedResults);
      
      wx.showToast({
        title: '收藏成功',
        icon: 'success'
      });
    } catch (e) {
      console.error('保存诊断结果失败', e);
      wx.showToast({
        title: '收藏失败',
        icon: 'none'
      });
    }
  },
  
  // 开始智能问诊
  startChat: function() {
    // 跳转到智能问诊页面，并传递相关参数
    wx.navigateTo({
      url: `/pages/diagnosis/chat/chat?petType=${this.data.petType}&diseaseName=${this.data.diagnosisResult.diseaseName}`
    });
  }
}) 