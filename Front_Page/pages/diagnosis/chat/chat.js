const app = getApp();

Page({
  data: {
    petType: 'cat', // 默认为猫咪
    diseaseName: '', // 疾病名称
    currentDate: '', // 当前日期
    messages: [], // 聊天消息列表
    inputMessage: '', // 输入框内容
    isTyping: false, // 是否显示正在输入
    scrollToMessage: '', // 滚动到指定消息
    userAvatar: '', // 用户头像
    messageId: 0, // 消息ID计数器
    quickQuestions: [] // 快捷问题列表
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
    
    // 设置当前日期
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    this.setData({
      currentDate: `${year}年${month}月${day}日`
    });
    
    // 获取用户头像
    if (app.globalData.userInfo && app.globalData.userInfo.avatarUrl) {
      this.setData({
        userAvatar: app.globalData.userInfo.avatarUrl
      });
    }
    
    // 设置快捷问题
    this.setQuickQuestions();
  },
  
  // 设置快捷问题
  setQuickQuestions: function() {
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
    
    // 模拟AI回复（实际应用中这里应该调用AI接口）
    setTimeout(() => {
      this.aiReply(content);
    }, 1000);
  },
  
  // AI回复
  aiReply: function(userMessage) {
    // 这里应该是调用AI接口获取回复
    // 这里使用简单的模拟回复
    let reply = this.getSimulatedReply(userMessage);
    
    const messageId = this.data.messageId + 1;
    const aiMessage = {
      id: messageId,
      type: 'system',
      content: reply,
      time: new Date().getTime()
    };
    
    // 隐藏正在输入，添加AI回复
    this.setData({
      isTyping: false,
      messages: [...this.data.messages, aiMessage],
      messageId: messageId,
      scrollToMessage: `msg-${messageId}`
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