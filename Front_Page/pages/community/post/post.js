// pages/community/post/post.js
Page({
  data: {
    postContent: '',
    imageList: [],
    selectedTags: [],
    customTagInput: '',
    allowComments: true,
    isAnonymous: false,
    showPublishConfirm: false,
    isPublishing: false,
    canPublish: false,
    
    // 预设标签
    petTypeTags: ['猫咪', '狗狗', '兔子', '鸟类', '其他宠物'],
    problemTags: ['皮肤病', '脱毛', '红斑', '真菌', '过敏', '寄生虫', '湿疹', '皮屑'],
    contentTags: ['求助', '分享经验', '产品推荐', '治疗记录', '日常护理', '科普知识']
  },

  onLoad: function() {
    // 页面加载时的初始化
  },

  // 内容输入
  onContentInput: function(e) {
    const content = e.detail.value;
    this.setData({
      postContent: content,
      canPublish: this.checkCanPublish(content, this.data.imageList, this.data.selectedTags)
    });
  },

  // 检查是否可以发布
  checkCanPublish: function(content, images, tags) {
    return content.trim().length > 0 || images.length > 0;
  },

  // 选择图片
  chooseImage: function() {
    const that = this;
    const remainingCount = 9 - this.data.imageList.length;
    
    wx.chooseMedia({
      count: remainingCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const newImages = res.tempFiles.map(file => file.tempFilePath);
        const updatedImageList = [...that.data.imageList, ...newImages];
        that.setData({
          imageList: updatedImageList,
          canPublish: that.checkCanPublish(that.data.postContent, updatedImageList, that.data.selectedTags)
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
      imageList: imageList,
      canPublish: this.checkCanPublish(this.data.postContent, imageList, this.data.selectedTags)
    });
  },

  // 切换标签
  toggleTag: function(e) {
    const tag = e.currentTarget.dataset.tag;
    let selectedTags = [...this.data.selectedTags];
    
    const index = selectedTags.indexOf(tag);
    if (index >= 0) {
      selectedTags.splice(index, 1);
    } else {
      if (selectedTags.length < 5) {
        selectedTags.push(tag);
      } else {
        wx.showToast({
          title: '最多只能选择5个标签',
          icon: 'none'
        });
        return;
      }
    }
    
    this.setData({
      selectedTags: selectedTags,
      canPublish: this.checkCanPublish(this.data.postContent, this.data.imageList, selectedTags)
    });
  },

  // 移除标签
  removeTag: function(e) {
    const tag = e.currentTarget.dataset.tag;
    const selectedTags = this.data.selectedTags.filter(t => t !== tag);
    this.setData({
      selectedTags: selectedTags,
      canPublish: this.checkCanPublish(this.data.postContent, this.data.imageList, selectedTags)
    });
  },

  // 自定义标签输入
  onCustomTagInput: function(e) {
    this.setData({
      customTagInput: e.detail.value
    });
  },

  // 添加自定义标签
  addCustomTag: function() {
    const tag = this.data.customTagInput.trim();
    if (!tag) {
      wx.showToast({
        title: '请输入标签内容',
        icon: 'none'
      });
      return;
    }
    
    if (this.data.selectedTags.includes(tag)) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none'
      });
      return;
    }
    
    if (this.data.selectedTags.length >= 5) {
      wx.showToast({
        title: '最多只能选择5个标签',
        icon: 'none'
      });
      return;
    }
    
    const selectedTags = [...this.data.selectedTags, tag];
    this.setData({
      selectedTags: selectedTags,
      customTagInput: '',
      canPublish: this.checkCanPublish(this.data.postContent, this.data.imageList, selectedTags)
    });
  },

  // 允许评论设置
  onAllowCommentsChange: function(e) {
    this.setData({
      allowComments: e.detail.value
    });
  },

  // 匿名发布设置
  onAnonymousChange: function(e) {
    this.setData({
      isAnonymous: e.detail.value
    });
  },

  // 发布帖子
  publishPost: function() {
    if (!this.data.canPublish) {
      wx.showToast({
        title: '请输入内容或添加图片',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      showPublishConfirm: true
    });
  },

  // 隐藏发布确认弹窗
  hidePublishConfirm: function() {
    this.setData({
      showPublishConfirm: false
    });
  },

  // 确认发布
  confirmPublish: function() {
    this.setData({
      showPublishConfirm: false,
      isPublishing: true
    });
    
    // 模拟发布过程
    setTimeout(() => {
      this.setData({
        isPublishing: false
      });
      
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 1500
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 2000);
  },

  // 预览图片
  previewImage: function(e) {
    const current = e.currentTarget.dataset.src;
    wx.previewImage({
      urls: this.data.imageList,
      current: current
    });
  },

  // 页面卸载时的处理
  onUnload: function() {
    // 如果有未发布的内容，询问是否保存草稿
    if (this.data.postContent.trim() || this.data.imageList.length > 0) {
      // 可以在这里实现草稿保存功能
    }
  }
}) 