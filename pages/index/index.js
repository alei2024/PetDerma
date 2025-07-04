// index.js
const app = getApp();

Page({
  data: {
    selectedPet: 'cat', // 默认选择猫咪
    hasNewPost: false,
    hasNewArticle: true,
    healthTip: '定期为宠物检查皮肤状况，发现异常及时就诊',
    tipsList: [
      '定期为宠物检查皮肤状况，发现异常及时就诊',
      '保持宠物被毛清洁干燥，定期给宠物洗澡和梳理',
      '选择适合宠物皮肤类型的洗护产品，避免刺激',
      '确保宠物有均衡的营养摄入，有助于皮肤健康',
      '注意防治体外寄生虫，定期驱虫很重要'
    ]
  },

  onLoad: function() {
    // 随机选择一条健康提示显示
    this.randomTip();
    
    // 检查是否有新消息和新文章
    this.checkNewContent();
  },
  
  onShow: function() {
    // 从全局获取用户的宠物类型偏好
    const petInfo = app.globalData.petInfo;
    if (petInfo && petInfo.length > 0) {
      // 如果用户有宠物信息，默认选择第一个宠物的类型
      this.setData({
        selectedPet: petInfo[0].type === 'dog' ? 'dog' : 'cat'
      });
    }
    
    // 每次页面显示时随机更换健康提示
    this.randomTip();
  },
  
  // 随机选择健康提示
  randomTip: function() {
    const index = Math.floor(Math.random() * this.data.tipsList.length);
    this.setData({
      healthTip: this.data.tipsList[index]
    });
  },
  
  // 检查新内容
  checkNewContent: function() {
    // 这里可以调用API检查是否有新的社区帖子和科普文章
    // 模拟数据
    this.setData({
      hasNewPost: Math.random() > 0.5,
      hasNewArticle: Math.random() > 0.3
    });
  },
  
  // 选择宠物类型
  selectPet: function(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      selectedPet: type
    });
    
    // 存储用户的宠物类型选择（临时，真实应用中应该关联到用户的宠物）
    wx.setStorageSync('selectedPetType', type);
  },
  
  // 页面导航
  navigateTo: function(e) {
    const url = e.currentTarget.dataset.url;
    
    // 如果是前往诊断页面，携带宠物类型参数
    if (url.includes('diagnosis')) {
      wx.navigateTo({
        url: `${url}?petType=${this.data.selectedPet}`
      });
    } else {
      wx.navigateTo({
        url: url
      });
    }
  }
})
