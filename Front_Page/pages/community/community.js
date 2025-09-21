// pages/community/community.js
Page({
  data: {
    searchKeyword: '',
    postList: [],
    isRefreshing: false,
    isLoadingMore: false,
    hasMore: true,
    currentPage: 1,
    pageSize: 10,
    showUserMenuModal: false,
    showPostMenuModal: false,
    currentPostId: null,
    // 模拟数据
    mockPosts: [
      {
        id: 'p001',
        username: '宠物达人小李',
        userAvatar: '/images_dogcat/三花猫.png',
        postTime: '2小时前',
        content: '我家猫咪最近出现了一些皮肤问题，有经验的朋友可以帮忙看看吗？主要是脖子和腋下有红斑，还有一些脱毛的情况。已经用了医生开的药膏，但效果不是很明显。',
        images: ['/images_dogcat/三花猫.png', '/images_dogcat/布偶猫.png'],
        tags: ['皮肤病', '求助', '猫咪'],
        likeCount: 12,
        commentCount: 8,
        collectCount: 5,
        isLiked: false,
        isCollected: false
      },
      {
        id: 'p002',
        username: '汪星人家长',
        userAvatar: '/images_dogcat/法斗.png',
        postTime: '5小时前',
        content: '分享一下我家狗狗治疗真菌感染的经验！经过两个月的治疗，终于完全康复了。主要用的是酮康唑洗液和口服药，配合营养补充。',
        images: ['/images_dogcat/法斗.png'],
        tags: ['真菌感染', '治疗经验', '狗狗'],
        likeCount: 28,
        commentCount: 15,
        collectCount: 22,
        isLiked: true,
        isCollected: true
      },
      {
        id: 'p003',
        username: '兽医小张',
        userAvatar: '/images_dogcat/柯基.png',
        postTime: '1天前',
        content: '春季宠物皮肤护理小贴士：\n1. 定期梳理，清除死毛\n2. 保持环境通风干燥\n3. 注意饮食营养均衡\n4. 及时清理耳朵和爪缝\n5. 发现异常及时就医',
        images: [],
        tags: ['护理知识', '专业建议', '春季'],
        likeCount: 45,
        commentCount: 23,
        collectCount: 38,
        isLiked: false,
        isCollected: false
      },
      {
        id: 'p004',
        username: '橘猫妈妈',
        userAvatar: '/images_dogcat/橘猫.png',
        postTime: '2天前',
        content: '推荐一款很好用的宠物洗护产品！我家橘猫用了之后毛发变得特别柔顺，而且没有皮屑了。价格也不贵，性价比很高。',
        images: ['/images_dogcat/橘猫.png'],
        tags: ['产品推荐', '洗护用品'],
        likeCount: 18,
        commentCount: 12,
        collectCount: 15,
        isLiked: false,
        isCollected: false
      },
      {
        id: 'p005',
        username: '边牧爸爸',
        userAvatar: '/images_dogcat/边牧.png',
        postTime: '3天前',
        content: '记录一下我家边牧的康复过程。从发现皮肤问题到完全治愈用了3个月时间，期间换了2家医院，最终在专业的宠物皮肤科治好了。',
        images: ['/images_dogcat/边牧.png', '/images_dogcat/哈士奇.png'],
        tags: ['康复记录', '皮肤科', '边牧'],
        likeCount: 35,
        commentCount: 18,
        collectCount: 25,
        isLiked: true,
        isCollected: false
      }
    ]
  },

  onLoad: function() {
    this.loadPosts();
  },

  onShow: function() {
    // 页面显示时刷新数据
    this.loadPosts();
  },

  // 加载帖子数据
  loadPosts: function() {
    // 模拟从服务器加载数据
    const startIndex = (this.data.currentPage - 1) * this.data.pageSize;
    const endIndex = startIndex + this.data.pageSize;
    const newPosts = this.data.mockPosts.slice(startIndex, endIndex);
    
    if (this.data.currentPage === 1) {
      this.setData({
        postList: newPosts,
        hasMore: newPosts.length === this.data.pageSize
      });
    } else {
      this.setData({
        postList: [...this.data.postList, ...newPosts],
        hasMore: newPosts.length === this.data.pageSize
      });
    }
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  // 执行搜索
  onSearch: function() {
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) return;
    
    // 模拟搜索
    const filteredPosts = this.data.mockPosts.filter(post => 
      post.content.includes(keyword) || 
      post.tags.some(tag => tag.includes(keyword)) ||
      post.username.includes(keyword)
    );
    
    this.setData({
      postList: filteredPosts,
      hasMore: false
    });
  },

  // 清除搜索
  clearSearch: function() {
    this.setData({
      searchKeyword: '',
      currentPage: 1
    });
    this.loadPosts();
  },

  // 下拉刷新
  onRefresh: function() {
    this.setData({
      isRefreshing: true,
      currentPage: 1
    });
    
    setTimeout(() => {
      this.loadPosts();
      this.setData({
        isRefreshing: false
      });
    }, 1000);
  },

  // 加载更多
  loadMore: function() {
    if (!this.data.hasMore || this.data.isLoadingMore) return;
    
    this.setData({
      isLoadingMore: true,
      currentPage: this.data.currentPage + 1
    });
    
    setTimeout(() => {
      this.loadPosts();
      this.setData({
        isLoadingMore: false
      });
    }, 500);
  },

  // 显示用户菜单
  showUserMenu: function() {
    this.setData({
      showUserMenuModal: true
    });
  },

  // 跳转我的收藏
  goToMyCollections: function() {
    wx.navigateTo({
      url: '/pages/community/my-collections/my-collections'
    });
    this.hideUserMenu();
  },

  // 跳转我的评论
  goToMyComments: function() {
    wx.navigateTo({
      url: '/pages/community/my-comments/my-comments'
    });
    this.hideUserMenu();
  },

  // 跳转我的发布
  goToMyPosts: function() {
    wx.navigateTo({
      url: '/pages/community/my-posts/my-posts'
    });
    this.hideUserMenu();
  },

  // 隐藏用户菜单

  // 隐藏用户菜单
  hideUserMenu: function() {
    this.setData({
      showUserMenuModal: false
    });
  },

  // 显示帖子菜单
  showPostMenu: function(e) {
    const postId = e.currentTarget.dataset.id;
    this.setData({
      showPostMenuModal: true,
      currentPostId: postId
    });
  },

  // 隐藏帖子菜单
  hidePostMenu: function() {
    this.setData({
      showPostMenuModal: false,
      currentPostId: null
    });
  },

  // 查看帖子详情
  viewPostDetail: function(e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/community/detail/detail?id=${postId}`
    });
  },

  // 发布帖子
  createPost: function() {
    wx.navigateTo({
      url: '/pages/community/post/post'
    });
  },

  // 切换点赞
  toggleLike: function(e) {
    const postId = e.currentTarget.dataset.id;
    const postList = this.data.postList.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !post.isLiked,
          likeCount: post.isLiked ? post.likeCount - 1 : post.likeCount + 1
        };
      }
      return post;
    });
    
    this.setData({ postList });
  },

  // 切换收藏
  toggleCollect: function(e) {
    const postId = e.currentTarget.dataset.id;
    const postList = this.data.postList.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isCollected: !post.isCollected,
          collectCount: post.isCollected ? post.collectCount - 1 : post.collectCount + 1
        };
      }
      return post;
    });
    
    this.setData({ postList });
  },

  // 显示评论
  showComments: function(e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/community/detail/detail?id=${postId}&tab=comments`
    });
  },

  // 分享帖子
  sharePost: function(e) {
    const postId = e.currentTarget.dataset.id;
    wx.showShareMenu({
      withShareTicket: true
    });
  },

  // 预览图片
  previewImage: function(e) {
    const urls = e.currentTarget.dataset.urls;
    const current = e.currentTarget.dataset.current;
    wx.previewImage({
      urls: urls,
      current: current
    });
  },

  // 我的收藏
  goToMyCollections: function() {
    this.hideUserMenu();
    wx.navigateTo({
      url: '/pages/community/my-collections/my-collections'
    });
  },

  // 我的评论
  goToMyComments: function() {
    this.hideUserMenu();
    wx.navigateTo({
      url: '/pages/community/my-comments/my-comments'
    });
  },

  // 举报帖子
  reportPost: function() {
    this.hidePostMenu();
    wx.showToast({
      title: '举报成功',
      icon: 'success'
    });
  },

  // 隐藏帖子
  hidePost: function() {
    this.hidePostMenu();
    wx.showToast({
      title: '已隐藏',
      icon: 'success'
    });
  }
})