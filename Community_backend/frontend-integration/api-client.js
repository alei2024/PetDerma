// 微信小程序API客户端示例
class CommunityAPIClient {
  constructor() {
    this.baseURL = "http://localhost:3000/api"; // 替换为你的服务器地址
    this.token = null;
  }

  // 设置认证token
  setToken(token) {
    this.token = token;
  }

  // 通用请求方法
  async request(url, options = {}) {
    const config = {
      url: `${this.baseURL}${url}`,
      method: options.method || "GET",
      data: options.data,
      header: {
        "Content-Type": "application/json",
        ...options.header,
      },
    };

    if (this.token) {
      config.header.Authorization = `Bearer ${this.token}`;
    }

    return new Promise((resolve, reject) => {
      wx.request({
        ...config,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            reject(new Error(`请求失败: ${res.statusCode}`));
          }
        },
        fail: (error) => {
          reject(error);
        },
      });
    });
  }

  // 认证相关API
  async wechatLogin(code) {
    return this.request("/auth/wechat-login", {
      method: "POST",
      data: { code },
    });
  }

  async getUserInfo() {
    return this.request("/auth/user-info");
  }

  async updateUserInfo(userData) {
    return this.request("/auth/user-info", {
      method: "PUT",
      data: userData,
    });
  }

  // 社区相关API
  async getCommunityHomeData(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/frontend/community/home?${queryString}`);
  }

  async getPostDetail(postId) {
    return this.request(`/frontend/community/posts/${postId}`);
  }

  async getUserProfile(userId) {
    return this.request(`/frontend/community/users/${userId}`);
  }

  async getOnlineUsers() {
    return this.request("/frontend/community/online-users");
  }

  async getNotifications() {
    return this.request("/frontend/community/notifications");
  }

  // 帖子相关API
  async createPost(postData) {
    return this.request("/posts", {
      method: "POST",
      data: postData,
    });
  }

  async updatePost(postId, postData) {
    return this.request(`/posts/${postId}`, {
      method: "PUT",
      data: postData,
    });
  }

  async deletePost(postId) {
    return this.request(`/posts/${postId}`, {
      method: "DELETE",
    });
  }

  async getPosts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/posts?${queryString}`);
  }

  async getPopularTags() {
    return this.request("/posts/tags");
  }

  // 互动相关API
  async likePost(postId) {
    return this.request(`/interactions/posts/${postId}/like`, {
      method: "POST",
    });
  }

  async favoritePost(postId) {
    return this.request(`/interactions/posts/${postId}/favorite`, {
      method: "POST",
    });
  }

  async sharePost(postId, comment = "") {
    return this.request(`/interactions/posts/${postId}/share`, {
      method: "POST",
      data: { comment },
    });
  }

  async createComment(postId, commentData) {
    return this.request(`/interactions/posts/${postId}/comments`, {
      method: "POST",
      data: commentData,
    });
  }

  async getPostComments(postId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(
      `/interactions/posts/${postId}/comments?${queryString}`
    );
  }

  async deleteComment(commentId) {
    return this.request(`/interactions/comments/${commentId}`, {
      method: "DELETE",
    });
  }

  // 文件上传API
  async uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${this.baseURL}/upload/image`,
        filePath: filePath,
        name: "file",
        header: {
          Authorization: `Bearer ${this.token}`,
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        },
        fail: reject,
      });
    });
  }

  async uploadImages(filePaths) {
    const uploadPromises = filePaths.map((filePath) =>
      this.uploadImage(filePath)
    );
    return Promise.all(uploadPromises);
  }

  async uploadAvatar(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${this.baseURL}/upload/avatar`,
        filePath: filePath,
        name: "file",
        header: {
          Authorization: `Bearer ${this.token}`,
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        },
        fail: reject,
      });
    });
  }
}

// 使用示例
const apiClient = new CommunityAPIClient();

// 微信登录
wx.login({
  success: async (res) => {
    try {
      const loginResult = await apiClient.wechatLogin(res.code);
      apiClient.setToken(loginResult.data.token);
      console.log("登录成功:", loginResult);
    } catch (error) {
      console.error("登录失败:", error);
    }
  },
});

// 获取社区首页数据
async function loadCommunityData() {
  try {
    const data = await apiClient.getCommunityHomeData({
      page: 1,
      limit: 10,
    });
    console.log("社区数据:", data);
    return data;
  } catch (error) {
    console.error("获取社区数据失败:", error);
  }
}

// 点赞帖子
async function likePost(postId) {
  try {
    const result = await apiClient.likePost(postId);
    console.log("点赞结果:", result);
    return result;
  } catch (error) {
    console.error("点赞失败:", error);
  }
}

// 上传图片
async function uploadPostImages(filePaths) {
  try {
    const results = await apiClient.uploadImages(filePaths);
    console.log("上传结果:", results);
    return results.map((result) => result.data.url);
  } catch (error) {
    console.error("上传失败:", error);
  }
}

module.exports = CommunityAPIClient;
