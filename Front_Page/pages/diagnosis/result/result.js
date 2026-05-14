Page({
  data: {
    petType: 'cat', // 默认为猫咪
    petName: '宠物', // 宠物名称
    petId: '', // 宠物ID
    imagePath: '', // 上传的图片路径
    allImages: [], // 所有上传的图片
    symptomDescription: '', // 症状描述
    currentTab: 'home', // 当前选中的建议标签
    markedArea: null, // 标记区域
    // 1. 新增 isSaved 状态（初始默认未收藏）
    isSaved: false,
    // 2. 新增按钮禁用状态
    isButtonDisabled: false,
    diagnosisRecordId: '', // 诊断记录ID
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
    // 如果有完整的诊断数据，使用传递的数据
    if (options.data) {
      try {
        const diagnosisData = JSON.parse(decodeURIComponent(options.data));
        
        // 设置宠物信息
        if (diagnosisData.petInfo) {
          this.setData({
            petType: diagnosisData.petInfo.type || 'cat',
            petName: diagnosisData.petInfo.name || '宠物',
            petId: diagnosisData.petInfo.id || diagnosisData.petInfo._id || ''
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
      return [];
    }
    
    // 按概率从高到低排序
    const sorted = probabilities.sort((a, b) => {
      const probA = parseFloat(a.probability) || 0;
      const probB = parseFloat(b.probability) || 0;
      return probB - probA;
    });
    
    const formatted = sorted.map(item => {
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
  
  // 3. 修改 saveResult 方法：支持"收藏/取消收藏"切换，使用后端API
  saveResult: function() {
    const { isSaved, isButtonDisabled, diagnosisResult, petType, petName, allImages, symptomDescription } = this.data;
    
    // 检查按钮是否已禁用
    if (isButtonDisabled) {
      return;
    }
    
    // 检查是否已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    // 立即禁用按钮，防止重复点击
    this.setData({ isButtonDisabled: true });
    
    if (!isSaved) {
      // 未收藏：创建诊断记录并收藏
      this.createDiagnosisRecord();
    } else {
      // 已收藏：取消收藏（这里需要记录ID，暂时使用本地存储的方式）
      this.toggleFavoriteStatus();
    }
  },

  // 创建诊断记录
  createDiagnosisRecord: function() {
    const { diagnosisResult, petType, petName, allImages, symptomDescription } = this.data;
    const app = getApp();
    
    wx.showLoading({
      title: '保存中...',
      mask: true
    });
    
    // 准备诊断数据
    const diagnosisData = {
      petId: this.data.petId || 'unknown',
      petName: petName,
      petType: petType,
      images: allImages, // 暂时直接使用图片路径
      symptomDescription: symptomDescription,
      diagnosisResult: {
        diseaseName: diagnosisResult.diseaseName,
        confidence: diagnosisResult.confidence,
        severity: diagnosisResult.severity,
        description: diagnosisResult.description,
        allProbabilities: diagnosisResult.allProbabilities || []
      }
    };
    
    // 尝试使用后端API
    app.request({
      url: '/api/diagnosis',
      method: 'POST',
      data: diagnosisData
    }).then((res) => {
      wx.hideLoading();
      if (res.statusCode === 200 && res.data.success) {
        // 保存记录ID到本地，用于后续操作
        wx.setStorageSync('currentDiagnosisRecordId', res.data.data._id);
        this.setData({ 
          isSaved: true,
          diagnosisRecordId: res.data.data._id,
          isButtonDisabled: true // 保持按钮禁用状态
        });
        wx.showToast({ 
          title: '保存成功', 
          icon: 'success' 
        });
      } else {
        // API失败，使用本地存储
        this.saveToLocalStorage();
      }
    }).catch((error) => {
      wx.hideLoading();
      console.error('创建诊断记录失败:', error);
      // 网络错误，使用本地存储作为备用方案
      this.saveToLocalStorage();
    });
  },

  // 保存到本地存储（备用方案）
  saveToLocalStorage: function() {
    const { diagnosisResult, petType, petName, allImages, symptomDescription } = this.data;
    
    try {
      const newResult = {
        id: new Date().getTime(),
        petId: this.data.petId || 'unknown',
        petName: petName,
        petType: petType,
        images: allImages,
        symptomDescription: symptomDescription,
        result: diagnosisResult,
        date: new Date().toISOString(),
        isLocal: true // 标记为本地存储
      };
      
      // 获取已有的收藏记录
      let savedResults = wx.getStorageSync('savedDiagnosisResults') || [];
      savedResults.unshift(newResult);
      
      // 保存到本地存储
      wx.setStorageSync('savedDiagnosisResults', savedResults);
      
      this.setData({ 
        isSaved: true,
        diagnosisRecordId: newResult.id,
        isButtonDisabled: true // 保持按钮禁用状态
      });
      
      wx.showToast({ 
        title: '保存成功', 
        icon: 'success' 
      });
    } catch (e) {
      console.error('存储失败:', e);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  // 切换收藏状态
  toggleFavoriteStatus: function() {
    const { diagnosisRecordId } = this.data;
    const app = getApp();
    
    if (!diagnosisRecordId) {
      // 如果没有记录ID，使用本地存储方式
      this.toggleLocalFavorite();
      return;
    }
    
    wx.showLoading({
      title: '处理中...',
      mask: true
    });
    
    app.request({
      url: `/api/diagnosis/${diagnosisRecordId}/favorite`,
      method: 'PATCH'
    }).then((res) => {
      wx.hideLoading();
      if (res.statusCode === 200 && res.data.success) {
        this.setData({ 
          isSaved: res.data.data.isFavorite,
          isButtonDisabled: true // 保持按钮禁用状态
        });
        wx.showToast({ 
          title: res.data.data.isFavorite ? '收藏成功' : '取消收藏成功', 
          icon: 'success' 
        });
      } else {
        // 操作失败时重新启用按钮
        this.setData({ isButtonDisabled: false });
        wx.showToast({
          title: res.data?.message || '操作失败',
          icon: 'none'
        });
      }
    }).catch((error) => {
      wx.hideLoading();
      console.error('切换收藏状态失败:', error);
      // 网络错误时重新启用按钮
      this.setData({ isButtonDisabled: false });
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  // 本地收藏切换（备用方案）
  toggleLocalFavorite: function() {
    const { isSaved, diagnosisResult, petType, imagePath } = this.data;
    
    try {
      let savedResults = wx.getStorageSync('savedDiagnosisResults') || [];
      
      if (!isSaved) {
        const newResult = {
          id: new Date().getTime(),
          petType,
          imagePath,
          result: diagnosisResult,
          date: new Date().toISOString()
        };
        savedResults.unshift(newResult);
        wx.showToast({ title: '收藏成功', icon: 'success' });
      } else {
        savedResults = savedResults.filter(item => 
          !(item.result.diseaseName === diagnosisResult.diseaseName && 
            item.petType === petType && 
            item.imagePath === imagePath)
        );
        wx.showToast({ title: '取消收藏成功', icon: 'success' });
      }
      
      wx.setStorageSync('savedDiagnosisResults', savedResults);
      this.setData({ 
        isSaved: !isSaved,
        isButtonDisabled: true // 保持按钮禁用状态
      });
      
    } catch (e) {
      console.error('本地收藏操作失败', e);
      // 操作失败时重新启用按钮
      this.setData({ isButtonDisabled: false });
      wx.showToast({
        title: isSaved ? '取消收藏失败' : '收藏失败',
        icon: 'none'
      });
    }
  },
  
  // 跳到附近医院页(带诊断作为推荐过滤)
  findHospital: function () {
    const disease = this.data.diagnosisResult?.diseaseName || "";
    wx.navigateTo({
      url: `/pages/hospital/hospital?disease=${encodeURIComponent(disease)}`,
    });
  },

  // 上传单张本地临时图,返回服务器 URL;已是远程/静态路径则原样返回
  _uploadOne(filePath) {
    const app = getApp();
    const baseUrl = app.globalData.baseURL || app.globalData.baseUrl;
    const token = wx.getStorageSync("token");
    if (!filePath || /^https?:\/\//.test(filePath) || filePath.startsWith("/images/")) {
      return Promise.resolve(filePath);
    }
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${baseUrl}/api/upload/image`,
        filePath,
        name: "file",
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: (res) => {
          try {
            const body = JSON.parse(res.data || "{}");
            if (res.statusCode >= 200 && res.statusCode < 300 && body.success && body.data?.url) {
              resolve(body.data.url);
            } else {
              reject(new Error(body.message || "上传失败"));
            }
          } catch (e) {
            reject(new Error("响应解析失败"));
          }
        },
        fail: (err) => reject(new Error(err.errMsg || "网络错误")),
      });
    });
  },

  // 加入病灶跟踪
  addToTracking: function () {
    const token = wx.getStorageSync("token");
    if (!token) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }
    const { petId, petName, petType, allImages, diagnosisResult, diagnosisRecordId } = this.data;
    if (!petId) {
      wx.showToast({ title: "缺少宠物信息", icon: "none" });
      return;
    }
    wx.showModal({
      title: "建立跟踪档案",
      content: "为这个患处起个名字(例如:背部红斑)",
      editable: true,
      placeholderText: "背部红斑",
      success: async (mres) => {
        if (!mres.confirm) return;
        const lesionName = (mres.content || "").trim() || "未命名患处";
        const app = getApp();
        wx.showLoading({ title: "上传中...", mask: true });

        // 1. 把本地临时图先上传成永久 URL
        let uploadedImages = [];
        try {
          for (const p of allImages || []) {
            const url = await this._uploadOne(p);
            uploadedImages.push(url);
          }
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: `图片上传失败:${err.message}`, icon: "none" });
          return;
        }

        wx.showLoading({ title: "创建中...", mask: true });
        app
          .request({
            url: "/api/tracking",
            method: "POST",
            data: {
              petId,
              petName,
              petType,
              lesionName,
              bodyPart: "未指定",
              diagnosisName: diagnosisResult.diseaseName,
              firstEntry: {
                imageList: uploadedImages,
                severity: diagnosisResult.severity || 3,
                confidence: diagnosisResult.confidence || 0,
                rednessScore: 50,
                areaScore: 50,
                notes: "首次记录(诊断结果自动导入)",
                diagnosisRecordId: diagnosisRecordId || null,
              },
            },
          })
          .then((res) => {
            wx.hideLoading();
            if (res.statusCode === 201 && res.data.success) {
              wx.showToast({ title: "已加入跟踪", icon: "success" });
              setTimeout(() => {
                wx.navigateTo({
                  url: `/pages/user/tracking/detail/detail?id=${res.data.data._id}`,
                });
              }, 600);
            } else {
              wx.showToast({ title: res.data?.message || "创建失败", icon: "none" });
            }
          })
          .catch(() => {
            wx.hideLoading();
            wx.showToast({ title: "网络错误", icon: "none" });
          });
      },
    });
  },

  // 开始智能问诊
  startChat: function() {
    // 跳转到智能问诊页面，并传递相关参数
    const params = {
      petType: this.data.petType,
      diseaseName: this.data.diagnosisResult.diseaseName,
      petId: this.data.petId,
      petName: this.data.petName,
      from: 'result'
    };
    
    // 构建URL参数
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key] || '')}`)
      .join('&');
    
    wx.navigateTo({
      url: `/pages/diagnosis/chat/chat?${queryString}`
    });
  }
})

