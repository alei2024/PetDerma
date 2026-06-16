Page({
  data: {
    petType: 'cat', // 默认为猫咪
    petName: '宠物', // 宠物名称
    imagePath: '', // 上传的图片路径
    allImages: [], // 所有上传的图片
    symptomDescription: '', // 症状描述
    currentTab: 'home', // 当前选中的建议标签
    markedArea: null, // 标记区域
    // 1. 新增 isSaved 状态（初始默认未收藏）
    isSaved: false,
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
      ],
      warning: '此结果仅供参考，请以专业兽医诊断为准。'
    }
  },

  onLoad: function(options) {
    console.log('结果页面接收到的参数:', options);
    
    // 如果有完整的诊断数据，使用传递的数据
    if (options.data) {
      try {
        const diagnosisData = JSON.parse(decodeURIComponent(options.data));
        console.log('解析的诊断数据:', diagnosisData);
        
        // 设置宠物信息
        if (diagnosisData.petInfo) {
          this.setData({
            petType: diagnosisData.petInfo.type || 'cat',
            petName: diagnosisData.petInfo.name || '宠物'
          });
        }
        
        // 设置图片（使用第一张图片作为主要展示图片）
        if (diagnosisData.imageList && diagnosisData.imageList.length > 0) {
          this.setData({
            imagePath: diagnosisData.imageList[0],
            allImages: diagnosisData.imageList
          });
        }
        
        // 设置症状描述
        if (diagnosisData.symptomDescription) {
          this.setData({
            symptomDescription: diagnosisData.symptomDescription
          });
        }
        
        // 设置AI分析结果
        if (diagnosisData.analysisResult) {
          const result = diagnosisData.analysisResult;
          this.setData({
            diagnosisResult: {
              diseaseName: result.diseaseName || '未知疾病',
              confidence: result.confidence || 0,
              severity: result.severity || 1,
              description: result.description || '暂无详细描述',
              homeAdvice: result.suggestions || result.homeAdvice || [
                '保持患处清洁干燥',
                '观察症状变化',
                '避免宠物抓挠患处'
              ],
              medicalAdvice: result.medicalAdvice || [
                '建议尽快前往宠物医院进行确诊',
                '可能需要进行详细的皮肤检查',
                '遵医嘱使用相关药物',
                '定期复诊观察恢复情况'
              ],
              preventAdvice: result.preventAdvice || [
                '定期给宠物洗澡并梳理毛发',
                '保持生活环境干净卫生',
                '避免与患病动物接触',
                '增强宠物免疫力，提供均衡饮食'
              ],
              warning: result.warning || '此结果仅供参考，请以专业兽医诊断为准。',
              // 添加额外的预测信息
              predictedClass: result.predictedClass,
              allProbabilities: this.formatProbabilities(result.allProbabilities || []),
              imageCount: result.imageCount || 1
            }
          });
        }
        
      } catch (e) {
        console.error('解析诊断数据失败:', e);
        wx.showToast({
          title: '数据解析失败',
          icon: 'none'
        });
      }
    } else {
      // 兼容旧的参数传递方式
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
    }

    // 2. 页面加载时，初始化 isSaved 状态（判断当前结果是否已收藏）
    this.initSavedStatus();
  },
  
  // 格式化概率数据，确保数值正确显示，只显示前三名
  formatProbabilities(probabilities) {
    if (!Array.isArray(probabilities)) {
      console.log('概率数据不是数组:', probabilities);
      return [];
    }
    const formatted = probabilities.map(item => {
      const prob = parseFloat(item.probability) || 0;
      return {
        ...item,
        probability: prob,
        displayProbability: (prob * 100).toFixed(1),
        // 使用中文名称，如果没有则使用英文
        displayName: item.diseaseName || item.class || '未知'
      };
    });
    
    // 只返回前三名
    const topThree = formatted.slice(0, 3);
    console.log('格式化后的概率数据（前三名）:', topThree);
    return topThree;
  },

  // 新增：初始化收藏状态（检查本地存储中是否已收藏当前结果）
  initSavedStatus() {
    try {
      // 获取本地所有收藏的结果
      const savedResults = wx.getStorageSync('savedDiagnosisResults') || [];
      const { diagnosisResult, petType, imagePath } = this.data;
      
      // 判断当前结果是否在收藏列表中（通过“疾病名+宠物类型+图片路径”唯一标识）
      const isSaved = savedResults.some(item => 
        item.result.diseaseName === diagnosisResult.diseaseName && 
        item.petType === petType && 
        item.imagePath === imagePath
      );
      
      // 更新 isSaved 状态
      this.setData({ isSaved });
    } catch (e) {
      console.error('初始化收藏状态失败:', e);
    }
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
  
  // 3. 修改 saveResult 方法：支持“收藏/取消收藏”切换
  saveResult: function() {
    const { isSaved, diagnosisResult, petType, imagePath } = this.data;
    
    try {
      // 获取已有的收藏记录
      let savedResults = wx.getStorageSync('savedDiagnosisResults') || [];
      
      if (!isSaved) {
        // 未收藏：添加到收藏列表
        const newResult = {
          id: new Date().getTime(), // 用时间戳作为唯一ID
          petType,
          imagePath,
          result: diagnosisResult,
          date: new Date().toISOString()
        };
        savedResults.unshift(newResult); // 新增收藏放在列表最前面
        wx.showToast({ title: '收藏成功', icon: 'success' });
      } else {
        // 已收藏：从列表中删除（取消收藏）
        savedResults = savedResults.filter(item => 
          !(item.result.diseaseName === diagnosisResult.diseaseName && 
            item.petType === petType && 
            item.imagePath === imagePath)
        );
        wx.showToast({ title: '取消收藏成功', icon: 'success' });
      }
      
      // 保存更新后的收藏记录到本地
      wx.setStorageSync('savedDiagnosisResults', savedResults);
      
      // 关键：切换 isSaved 状态（同步更新图标/文字）
      this.setData({ isSaved: !isSaved });
      
    } catch (e) {
      console.error('收藏操作失败', e);
      wx.showToast({
        title: isSaved ? '取消收藏失败' : '收藏失败',
        icon: 'none'
      });
    }
  },
  
  // 预约附近宠物医院复核
  bookOfflineReview: function() {
    const { diagnosisResult, petName } = this.data;
    // 保存当前诊断结果到本地，供其他页面使用
    wx.setStorageSync('latestDiagnosisResult', {
      petName,
      diseaseName: diagnosisResult.diseaseName,
      confidence: diagnosisResult.confidence,
      severity: diagnosisResult.severity,
      description: diagnosisResult.description,
      fromResultPage: true,
      time: new Date().toISOString(),
    });
    wx.navigateTo({
      url: `/pages/doctor/doctor`,
    });
  },

  // 发送给护理店获取护理建议
  sendToCareShop: function() {
    const { diagnosisResult, petName } = this.data;
    wx.setStorageSync('latestDiagnosisResult', {
      petName,
      diseaseName: diagnosisResult.diseaseName,
      confidence: diagnosisResult.confidence,
      severity: diagnosisResult.severity,
      description: diagnosisResult.description,
      fromResultPage: true,
      time: new Date().toISOString(),
      needCareAdvice: true,
    });
    wx.navigateTo({
      url: `/pages/doctor/doctor`,
    });
  },

  // 开始智能问诊
  startChat: function() {
    // 跳转到智能问诊页面，并传递相关参数
    wx.navigateTo({
      url: `/pages/diagnosis/chat/chat?petType=${this.data.petType}&diseaseName=${this.data.diagnosisResult.diseaseName}&from=result` // 添加from参数标识结果页跳转
    });
  }
})