const app = getApp();
const config = require('../../../config/environment.js');

Page({
  data: {
    petType: 'cat', // 默认为猫咪
    diseaseName: '', // 疾病名称
    petId: '', // 宠物ID
    petName: '', // 宠物名称
    currentDate: '', // 当前日期
    messages: [], // 聊天消息列表
    showQuickQuestions: true, // 是否显示快捷问题
    inputMessage: '', // 输入框内容
    isTyping: false, // 是否显示正在输入
    scrollToMessage: '', // 滚动到指定消息
    userAvatar: '', // 用户头像
    messageId: 0, // 消息ID计数器
    quickQuestions: [], // 快捷问题列表
    chatId: '', // 会话ID（Coze格式）
    isConnected: false, // 是否已连接到智能体
    isLoading: false, // 是否正在加载
    hasInitialized: false // 是否已经初始化（发送了你好）
  },

  onLoad: function(options) {
    // 获取传递的参数
    if (options.petType) {
      this.setData({
        petType: options.petType
      });
    }
    
    if (options.diseaseName) {
      this.setData({
        diseaseName: options.diseaseName
      });
    }

    if (options.petId) {
      this.setData({
        petId: options.petId
      });
    }

    if (options.petName) {
      this.setData({
        petName: options.petName
      });
    }
    
    // 根据跳转来源控制显示（from='diagnose'为智能诊断页跳转，from='result'为诊断结果页跳转）
    const from = (options.from || '').trim().toLowerCase(); // 处理空格和大小写问题
    console.log('跳转来源from:', from); // 添加日志便于调试
    this.setData({
      showQuickQuestions: from === 'result' // 修正后严格匹配小写无空格的'result'
    });
    
    // 设置当前日期
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    this.setData({
      currentDate: `${year}年${month}月${day}日`
    });
    
    // 获取用户头像
    if (app.globalData.userInfo && app.globalData.userInfo.avatar) {
      let avatarUrl = app.globalData.userInfo.avatar;
      // 如果avatar是对象，尝试获取url属性
      if (typeof avatarUrl === 'object' && avatarUrl.url) {
        avatarUrl = avatarUrl.url;
      }
      // 确保avatarUrl是字符串且不是图片ID
      if (typeof avatarUrl === 'string' && avatarUrl.trim()) {
        // 如果是图片ID格式（24位十六进制），转换为完整URL
        if (/^[0-9a-fA-F]{24}$/.test(avatarUrl)) {
          avatarUrl = `${config.baseUrl}/api/images/${avatarUrl}`;
        }
        // 如果是相对路径，确保以/开头
        else if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('/')) {
          avatarUrl = '/' + avatarUrl;
        }
        
      this.setData({
          userAvatar: avatarUrl
      });
      }
    }
    
    // 设置快捷问题
    this.setQuickQuestions();

    // 初始化智能体连接并自动发送"你好"
    this.initCozeConnection();
  },
  
  // 页面显示时更新用户头像
  onShow: function() {
    // 每次页面显示时重新获取用户头像，确保头像信息是最新的
    if (app.globalData.userInfo && app.globalData.userInfo.avatar) {
      let avatarUrl = app.globalData.userInfo.avatar;
      // 如果avatar是对象，尝试获取url属性
      if (typeof avatarUrl === 'object' && avatarUrl.url) {
        avatarUrl = avatarUrl.url;
      }
      // 确保avatarUrl是字符串且不是图片ID
      if (typeof avatarUrl === 'string' && avatarUrl.trim()) {
        // 如果是图片ID格式（24位十六进制），转换为完整URL
        if (/^[0-9a-fA-F]{24}$/.test(avatarUrl)) {
          avatarUrl = `${config.baseUrl}/api/images/${avatarUrl}`;
        }
        // 如果是相对路径，确保以/开头
        else if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('/')) {
          avatarUrl = '/' + avatarUrl;
        }
        
        this.setData({
          userAvatar: avatarUrl
        });
      }
    }
  },
  
  // 设置快捷问题
  setQuickQuestions: function() {
    console.log('当前疾病名称:', this.data.diseaseName); // 调试疾病名称是否正确
    console.log('当前宠物类型:', this.data.petType); // 调试宠物类型是否正确
    // 根据疾病类型设置不同的快捷问题
    let questions = [
      "这种病会传染吗？",
      "需要去医院就诊吗？",
      "大概需要多久能治愈？",
      "有什么日常护理建议？"
    ];
    
    // 根据宠物类型和疾病名称添加特定问题
    if (this.data.petType === 'cat') {
      if (this.data.diseaseName.includes('皮肤癣')) {
        questions.push("猫咪皮肤癣有哪些常见症状？");
        questions.push("如何预防猫咪皮肤癣复发？");
      }
    } else {
      if (this.data.diseaseName.includes('螨虫')) {
        questions.push("狗狗螨虫病有哪些常见症状？");
        questions.push("如何预防狗狗螨虫病复发？");
      }
    }
    
    this.setData({
      quickQuestions: questions
    });
  },
  
  // 输入框内容变化
  onInput: function(e) {
    this.setData({
      inputMessage: e.detail.value
    });
  },
  
  // 发送快捷问题
  sendQuickQuestion: function(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({
      inputMessage: question
    });
    this.sendMessage();
  },
  
  // 初始化Coze智能体连接并自动发送"你好"
  initCozeConnection: function() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 检查是否有宠物ID
    if (!this.data.petId) {
      console.warn('没有宠物ID，将使用模拟模式');
      return;
    }

    // 如果已经初始化过，不再重复
    if (this.data.hasInitialized) {
      return;
    }

    // 自动发送"你好"消息
    this.sendInitialHello();
  },

  // 发送初始"你好"消息
  sendInitialHello: function() {
    const token = wx.getStorageSync('token');
    const { petId } = this.data;

    // 显示正在加载
    this.setData({
      isLoading: true,
      isTyping: true
    });

    // 发送宠物问诊请求（首次对话，自动发送"你好"）
    wx.request({
      url: `${config.baseUrl}/api/consultation/pet-consultation`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        petId: petId,
        question: '你好'
      },
      success: (res) => {
        console.log('初始问诊响应:', res.data);
        
        // 检查是否需要先进行诊断
        if (!res.data.success && res.data.error === 'NO_DIAGNOSIS_RECORD') {
          this.handleNoDiagnosisRecord();
          return;
        }
        
        this.handleInitialResponse(res.data);
      },
      fail: (error) => {
        console.error('初始问诊失败:', error);
        this.handleCozeError(error);
      }
    });
  },

  // 处理初始响应
  handleInitialResponse: function(response) {
    this.setData({ 
      isLoading: false,
      isTyping: false,
      hasInitialized: true
    });

    if (response.success && response.data) {
      // 保存chatId
      if (response.data.chatId) {
        this.setData({ chatId: response.data.chatId });
        console.log('保存chatId:', response.data.chatId);
      }

      // 提取智能体回复内容
      let replyContent = response.data.response || '';
      
      if (!replyContent) {
        replyContent = '您好！我是PetDerma智能助手，很高兴为您服务！';
      }

      // 添加AI回复到消息列表
      const messageId = this.data.messageId + 1;
      const aiMessage = {
        id: messageId,
        type: 'system',
        content: replyContent,
        time: new Date().getTime()
      };

      this.setData({
        messages: [...this.data.messages, aiMessage],
        messageId: messageId,
        scrollToMessage: `msg-${messageId}`,
        isConnected: true
      });

      console.log('✅ 智能体初始化成功，已显示欢迎消息');
    } else {
      this.handleCozeError(response);
    }
  },
  
  // 发送消息
  sendMessage: function() {
    const content = this.data.inputMessage.trim();
    if (!content) return;
    
    // 创建用户消息
    const messageId = this.data.messageId + 1;
    const userMessage = {
      id: messageId,
      type: 'user',
      content: content,
      time: new Date().getTime()
    };
    
    // 添加到消息列表
    this.setData({
      messages: [...this.data.messages, userMessage],
      inputMessage: '',
      messageId: messageId,
      scrollToMessage: `msg-${messageId}`
    });
    
    // 显示AI正在输入
    this.setData({
      isTyping: true
    });
    
    // 发送到Coze智能体
    this.sendToCoze(content);
  },

  // 发送消息到Coze智能体
  sendToCoze: function(message) {
    const token = wx.getStorageSync('token');
    const { petId, chatId } = this.data;

    // 发送消息
    wx.request({
      url: `${config.baseUrl}/api/consultation/send-message`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        chatId: chatId,
        message: message,
        petId: petId
      },
      success: (res) => {
        console.log('Coze智能体响应:', res.data);
        this.handleCozeResponse(res.data);
      },
      fail: (error) => {
        console.error('发送到Coze失败:', error);
        this.handleCozeError(error);
      }
    });
  },


  // 处理Coze智能体响应
  handleCozeResponse: function(response) {
    this.setData({ isTyping: false });

    if (response.success && response.data) {
      // 更新chatId（如果有新的）
      if (response.data.chatId && response.data.chatId !== this.data.chatId) {
        this.setData({ chatId: response.data.chatId });
        console.log('更新chatId:', response.data.chatId);
      }

      // 提取智能体回复内容
      let replyContent = '';
      
      // 新的响应格式：直接从data.reply获取
      if (response.data.reply) {
        replyContent = response.data.reply;
      } else if (response.data.response) {
        replyContent = response.data.response;
      } else {
        // 调试信息
        console.log('无法解析的响应结构:', response.data);
        replyContent = '抱歉，我暂时无法理解您的问题，请尝试重新描述。';
      }

      // 添加AI回复到消息列表
      const messageId = this.data.messageId + 1;
      const aiMessage = {
        id: messageId,
        type: 'system',
        content: replyContent,
        time: new Date().getTime()
      };

      this.setData({
        messages: [...this.data.messages, aiMessage],
        messageId: messageId,
        scrollToMessage: `msg-${messageId}`
      });
    } else {
      this.handleCozeError(response);
    }
  },

  // 处理没有诊断记录的情况
  handleNoDiagnosisRecord: function() {
    this.setData({ isTyping: false });

    const messageId = this.data.messageId + 1;
    const aiMessage = {
      id: messageId,
      type: 'system',
      content: '您好！我注意到您还没有为宠物进行皮肤病诊断。为了给您提供更准确的健康建议，建议您先进行皮肤病诊断，然后再进行智能问诊。\n\n请返回诊断页面，上传宠物图片进行诊断。',
      time: new Date().getTime()
    };
    
    this.setData({
      messages: [...this.data.messages, aiMessage],
      messageId: messageId,
      scrollToMessage: `msg-${messageId}`
    });

    wx.showModal({
      title: '提示',
      content: '请先进行皮肤病诊断，然后再进行智能问诊。是否返回诊断页面？',
      confirmText: '去诊断',
      cancelText: '继续问诊',
      success: (res) => {
        if (res.confirm) {
          // 返回诊断页面
          wx.navigateBack({
            delta: 2 // 返回两级页面
          });
        }
      }
    });
  },

  // 处理Coze智能体错误
  handleCozeError: function(error) {
    this.setData({ isTyping: false });

    console.error('Coze智能体错误:', error);
    
    // 使用模拟回复作为备用
    const fallbackReply = this.getSimulatedReply(this.data.inputMessage || '');
    
    const messageId = this.data.messageId + 1;
    const aiMessage = {
      id: messageId,
      type: 'system',
      content: fallbackReply + '\n\n（当前使用模拟回复，智能体连接异常）',
      time: new Date().getTime()
    };
    
    this.setData({
      messages: [...this.data.messages, aiMessage],
      messageId: messageId,
      scrollToMessage: `msg-${messageId}`
    });

    wx.showToast({
      title: '智能体连接异常，已切换到模拟模式',
      icon: 'none',
      duration: 2000
    });
  },
  
  // 模拟AI回复（简单的关键词匹配）
  getSimulatedReply: function(userMessage) {
    // 转换为小写进行匹配
    const message = userMessage.toLowerCase();
    
    // 猫咪皮肤癣相关回复
    if (this.data.petType === 'cat' && this.data.diseaseName.includes('皮肤癣')) {
      if (message.includes('传染')) {
        return "是的，猫咪皮肤癣具有传染性，可以传染给其他宠物和人类。建议隔离患病猫咪，避免与其他宠物接触，并注意个人卫生。";
      }
      if (message.includes('就诊') || message.includes('医院')) {
        return "建议尽快带猫咪去宠物医院就诊。兽医会通过皮肤刮片检查确认真菌类型，并制定合适的治疗方案。";
      }
      if (message.includes('多久') || message.includes('治愈')) {
        return "猫咪皮肤癣的治疗通常需要4-6周的时间，具体取决于病情严重程度和治疗方法。坚持完整疗程非常重要，即使症状消失也要继续治疗一段时间。";
      }
      if (message.includes('护理')) {
        return "日常护理建议：1. 保持猫咪皮肤清洁干燥；2. 使用兽医推荐的抗真菌洗液定期洗澡；3. 定期更换猫咪的床垫和玩具；4. 避免猫咪舔舐患处，必要时使用伊丽莎白圈。";
      }
      if (message.includes('症状')) {
        return "猫咪皮肤癣的常见症状包括：皮肤局部脱毛、发红、皮屑增多、结痂、瘙痒等。通常在头部、耳朵、爪子等部位最为常见。";
      }
      if (message.includes('预防') || message.includes('复发')) {
        return "预防猫咪皮肤癣复发的方法：1. 定期给猫咪洗澡并梳理毛发；2. 保持生活环境干净卫生，定期消毒；3. 增强猫咪免疫力，提供均衡营养；4. 避免与患病动物接触；5. 定期体检。";
      }
    }
    
    // 狗狗螨虫病相关回复
    if (this.data.petType === 'dog' && this.data.diseaseName.includes('螨虫')) {
      if (message.includes('传染')) {
        return "是的，狗狗螨虫病具有传染性，可以传染给其他宠物，但大多数犬类螨虫不会感染人类。建议隔离患病狗狗，避免与其他宠物接触。";
      }
      if (message.includes('就诊') || message.includes('医院')) {
        return "建议尽快带狗狗去宠物医院就诊。兽医会通过皮肤刮片检查确认螨虫类型，并制定合适的治疗方案，可能包括外用药物和口服药物。";
      }
      if (message.includes('多久') || message.includes('治愈')) {
        return "狗狗螨虫病的治疗通常需要4-8周的时间，具体取决于螨虫类型和病情严重程度。坚持完整疗程非常重要，需要定期复查确认螨虫是否完全清除。";
      }
      if (message.includes('护理')) {
        return "日常护理建议：1. 隔离患病犬只，防止传染；2. 使用兽医推荐的杀螨洗液定期洗澡；3. 定期清洗狗狗的窝和玩具；4. 避免狗狗抓挠患处，必要时使用伊丽莎白圈；5. 按时给药，完成全程治疗。";
      }
      if (message.includes('症状')) {
        return "狗狗螨虫病的常见症状包括：剧烈瘙痒、皮肤红肿、脱毛、皮屑增多、结痂、皮肤增厚等。通常在耳朵、肘部、腹部等部位最为常见。";
      }
      if (message.includes('预防') || message.includes('复发')) {
        return "预防狗狗螨虫病复发的方法：1. 定期给狗狗洗澡，使用专业洗护产品；2. 保持环境卫生，定期消毒；3. 定期驱虫；4. 增强狗狗免疫力，提供均衡营养；5. 避免与患病动物接触；6. 定期体检。";
      }
    }
    
    // 通用回复
    if (message.includes('谢谢') || message.includes('感谢')) {
      return "不客气，很高兴能帮到您！如果还有其他问题，随时可以咨询我。";
    }
    
    // 默认回复
    return "关于这个问题，我建议您咨询专业兽医获取更准确的建议。每只宠物的情况可能有所不同，专业医生能根据实际情况给出最合适的建议。";
  },
  
  // 开始语音输入
  startVoiceInput: function() {
    // 实际应用中这里应该调用微信的录音API
    wx.showToast({
      title: '语音输入功能开发中',
      icon: 'none'
    });
  }
})