// pages/debug/community-test.js
const app = getApp();

Page({
  data: {
    posts: [], // 确保初始化为空数组
    testResults: [], // 确保初始化为空数组
    isLoading: false,
  },

  onLoad: function () {
    console.log("社区功能测试页面加载");
    // 不自动运行测试，等待用户手动点击
  },

  // 运行所有测试
  async runTests() {
    this.setData({ isLoading: true, testResults: [] }); // 重置为空数组

    const tests = [
      { name: "测试获取帖子列表", fn: this.testGetPosts },
      { name: "测试创建帖子", fn: this.testCreatePost },
      { name: "测试点赞功能", fn: this.testLikePost },
      { name: "测试收藏功能", fn: this.testFavoritePost },
      { name: "测试评论功能", fn: this.testCommentPost },
    ];

    for (let test of tests) {
      try {
        console.log(`🧪 开始${test.name}...`);
        const result = await test.fn.call(this);
        this.addTestResult(test.name, true, result);
      } catch (error) {
        console.error(`❌ ${test.name}失败:`, error);
        this.addTestResult(test.name, false, error.message);
      }
    }

    this.setData({ isLoading: false });
  },

  // 添加测试结果
  addTestResult(testName, success, message) {
    const results = Array.isArray(this.data.testResults)
      ? [...this.data.testResults]
      : [];
    results.push({
      name: testName,
      success,
      message: typeof message === "string" ? message : JSON.stringify(message),
      time: new Date().toLocaleTimeString(),
    });
    this.setData({ testResults: results });
  },

  // 测试获取帖子列表
  async testGetPosts() {
    const res = await app.request({
      url: "/api/posts",
      method: "GET",
    });

    if (res.data && res.data.success) {
      this.setData({ posts: res.data.data || [] });
      return `获取到 ${res.data.data?.length || 0} 个帖子`;
    } else {
      throw new Error(res.data?.message || "获取帖子列表失败");
    }
  },

  // 测试创建帖子
  async testCreatePost() {
    // 随机选择测试图片 - 使用正确的绝对路径
    const testImages = [
      "/images_test/大狗.jpg",
      "/images_test/小狗.jpg",
      "/images_test/灰猫.jpg",
      "/images_test/黑猫.jpg",
      "/images_test/上传1.png",
      "/images_test/上传2.jpg",
    ];

    const randomImages = [];
    const imageCount = Math.floor(Math.random() * 3) + 1; // 1-3张图片
    for (let i = 0; i < imageCount; i++) {
      const randomIndex = Math.floor(Math.random() * testImages.length);
      if (!randomImages.includes(testImages[randomIndex])) {
        randomImages.push(testImages[randomIndex]);
      }
    }

    const testPost = {
      title: `测试帖子 ${Date.now()}`,
      content:
        "这是一个测试帖子，用于验证社区功能是否正常工作。包含了随机的宠物图片，用来测试图片显示功能。",
      type: "text",
      images: randomImages,
      tags: ["测试", "社区", "图片"],
    };

    const res = await app.request({
      url: "/api/posts",
      method: "POST",
      data: testPost,
    });

    if (res.data && res.data.success) {
      const newPost = res.data.data;
      // 将新帖子添加到列表顶部
      const currentPosts = Array.isArray(this.data.posts)
        ? this.data.posts
        : [];
      const posts = [newPost, ...currentPosts];
      this.setData({ posts });
      return `创建帖子成功，ID: ${newPost._id}`;
    } else {
      throw new Error(res.data?.message || "创建帖子失败");
    }
  },

  // 测试点赞功能
  async testLikePost() {
    const posts = this.data.posts;
    if (posts.length === 0) {
      throw new Error("没有可用的帖子进行点赞测试");
    }

    const postId = posts[0]._id;
    const res = await app.request({
      url: `/api/interactions/posts/${postId}/like`,
      method: "POST",
    });

    if (res.data && res.data.success) {
      // 更新本地帖子数据
      const updatedPosts = this.data.posts.map((post) => {
        if (post._id === postId) {
          return {
            ...post,
            likeCount: (post.likeCount || 0) + (res.data.data.liked ? 1 : -1),
          };
        }
        return post;
      });
      this.setData({ posts: updatedPosts });

      return `点赞成功，帖子ID: ${postId}，当前点赞数: ${
        res.data.data.likeCount || 0
      }`;
    } else {
      throw new Error(res.data?.message || "点赞失败");
    }
  },

  // 测试收藏功能
  async testFavoritePost() {
    const posts = this.data.posts;
    if (posts.length === 0) {
      throw new Error("没有可用的帖子进行收藏测试");
    }

    const postId = posts[0]._id;
    const res = await app.request({
      url: `/api/interactions/posts/${postId}/favorite`,
      method: "POST",
    });

    if (res.data && res.data.success) {
      // 更新本地帖子数据
      const updatedPosts = this.data.posts.map((post) => {
        if (post._id === postId) {
          return {
            ...post,
            favoriteCount:
              (post.favoriteCount || 0) + (res.data.data.favorited ? 1 : -1),
          };
        }
        return post;
      });
      this.setData({ posts: updatedPosts });

      return `收藏成功，帖子ID: ${postId}，当前收藏数: ${
        res.data.data.favoriteCount || 0
      }`;
    } else {
      throw new Error(res.data?.message || "收藏失败");
    }
  },

  // 测试评论功能
  async testCommentPost() {
    const posts = this.data.posts;
    if (posts.length === 0) {
      throw new Error("没有可用的帖子进行评论测试");
    }

    const postId = posts[0]._id;
    const testComment = {
      content: `测试评论 ${Date.now()}`,
    };

    const res = await app.request({
      url: `/api/interactions/posts/${postId}/comments`,
      method: "POST",
      data: testComment,
    });

    if (res.data && res.data.success) {
      // 更新本地帖子数据
      const updatedPosts = this.data.posts.map((post) => {
        if (post._id === postId) {
          return {
            ...post,
            commentCount: (post.commentCount || 0) + 1,
          };
        }
        return post;
      });
      this.setData({ posts: updatedPosts });

      return `评论成功，帖子ID: ${postId}，当前评论数: ${
        (this.data.posts.find((p) => p._id === postId)?.commentCount || 0) + 1
      }`;
    } else {
      throw new Error(res.data?.message || "评论失败");
    }
  },

  // 重新运行测试
  onRetryTap() {
    this.runTests();
  },

  // 单独测试方法
  async singleTestGetPosts() {
    this.setData({ isLoading: true });
    try {
      console.log("🧪 开始测试获取帖子列表...");
      const result = await this.testGetPosts();
      this.addTestResult("测试获取帖子列表", true, result);
    } catch (error) {
      console.error("❌ 测试获取帖子列表失败:", error);
      this.addTestResult("测试获取帖子列表", false, error.message);
    }
    this.setData({ isLoading: false });
  },

  async singleTestCreatePost() {
    this.setData({ isLoading: true });
    try {
      console.log("🧪 开始测试创建帖子...");
      const result = await this.testCreatePost();
      this.addTestResult("测试创建帖子", true, result);
    } catch (error) {
      console.error("❌ 测试创建帖子失败:", error);
      this.addTestResult("测试创建帖子", false, error.message);
    }
    this.setData({ isLoading: false });
  },

  async singleTestLikePost() {
    this.setData({ isLoading: true });
    try {
      console.log("🧪 开始测试点赞功能...");
      const result = await this.testLikePost();
      this.addTestResult("测试点赞功能", true, result);
    } catch (error) {
      console.error("❌ 测试点赞功能失败:", error);
      this.addTestResult("测试点赞功能", false, error.message);
    }
    this.setData({ isLoading: false });
  },

  async singleTestFavoritePost() {
    this.setData({ isLoading: true });
    try {
      console.log("🧪 开始测试收藏功能...");
      const result = await this.testFavoritePost();
      this.addTestResult("测试收藏功能", true, result);
    } catch (error) {
      console.error("❌ 测试收藏功能失败:", error);
      this.addTestResult("测试收藏功能", false, error.message);
    }
    this.setData({ isLoading: false });
  },

  async singleTestCommentPost() {
    this.setData({ isLoading: true });
    try {
      console.log("🧪 开始测试评论功能...");
      const result = await this.testCommentPost();
      this.addTestResult("测试评论功能", true, result);
    } catch (error) {
      console.error("❌ 测试评论功能失败:", error);
      this.addTestResult("测试评论功能", false, error.message);
    }
    this.setData({ isLoading: false });
  },

  // 查看帖子详情
  onPostTap(e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/community/detail/detail?id=${postId}`,
    });
  },
});
