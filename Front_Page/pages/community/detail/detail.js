Page({
  data: {
    postDetail: {}, // 帖子详情数据
    commentList: [], // 评论列表
    showCommentInput: false, // 是否显示评论输入框
    replyToUser: '', // 回复的目标用户
    commentContent: '', // 评论内容
    commentImageList: [], // 评论图片列表
    sortType: 'time', // 评论排序类型（时间/热度）
    hasMoreComments: true, // 是否有更多评论
    isLoadingComments: false // 是否正在加载评论
  },

  onLoad(options) {
    const postId = options.id; // 从路由参数获取帖子ID
    this.fetchPostDetail(postId);
    this.fetchComments(postId);
  },

  // 获取帖子详情
  fetchPostDetail(postId) {
    wx.showLoading({ title: '加载中...' });
    wx.request({
      url: 'https://api.example.com/posts/' + postId,
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({ postDetail: res.data.data });
        } else {
          wx.showToast({ title: '获取帖子失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络异常', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 获取评论列表
  fetchComments(postId, page = 1) {
    if (!this.data.hasMoreComments) return;
    this.setData({ isLoadingComments: true });
    wx.request({
      url: 'https://api.example.com/comments',
      data: { postId, page, sort: this.data.sortType },
      success: (res) => {
        if (res.data.code === 200) {
          const newComments = this.data.commentList.concat(res.data.data.list);
          this.setData({ 
            commentList: newComments,
            hasMoreComments: res.data.data.hasMore,
            isLoadingComments: false
          });
        }
      }
    });
  },

  // 切换排序类型
  changeSortType(e) {
    const sortType = e.currentTarget.dataset.type;
    this.setData({ sortType });
    this.fetchComments(this.data.postDetail.id, 1); // 重新加载评论
  },

  // 点赞帖子
  toggleLike() {
    wx.request({
      url: 'https://api.example.com/posts/like',
      method: 'POST',
      data: { postId: this.data.postDetail.id },
      success: (res) => {
        if (res.data.code === 200) {
          const newPost = { ...this.data.postDetail };
          newPost.isLiked = !newPost.isLiked;
          newPost.likeCount = res.data.data.likeCount;
          this.setData({ postDetail: newPost });
        }
      }
    });
  },

  // 显示评论输入框
  showCommentInput(e) {
    const replyToUser = e.currentTarget.dataset.username || '';
    this.setData({ showCommentInput: true, replyToUser });
  },

  // 隐藏评论输入框
  hideCommentInput() {
    this.setData({ showCommentInput: false, commentContent: '', commentImageList: [] });
  },

  // 输入评论内容
  onCommentInput(e) {
    this.setData({ commentContent: e.detail.value });
  },

  // 发送评论
  sendComment() {
    if (!this.data.commentContent.trim()) return;
    const formData = { 
      postId: this.data.postDetail.id,
      content: this.data.commentContent,
      images: this.data.commentImageList,
      replyTo: this.data.replyToUser
    };
    wx.request({
      url: 'https://api.example.com/comments',
      method: 'POST',
      data: formData,
      success: (res) => {
        if (res.data.code === 200) {
          const newComment = res.data.data;
          this.setData({ 
            commentList: [newComment, ...this.data.commentList],
            commentContent: '',
            commentImageList: [],
            showCommentInput: false
          });
          // 更新帖子评论数
          const newPost = { ...this.data.postDetail };
          newPost.commentCount += 1;
          this.setData({ postDetail: newPost });
        }
      }
    });
  }
})