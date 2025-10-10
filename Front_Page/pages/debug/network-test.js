// 网络测试页面
Page({
  data: {
    testResults: [],
    isTesting: false,
    baseUrl: "http://localhost:3000",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQxMjkwZDAwMzljMzk3YmNlZDdmYTgiLCJpYXQiOjE3NTg1MzgzMDksImV4cCI6MTc1OTE0MzEwOX0.cDjRVTZ4iipw4Ggv2Sx4taBLkGZr7lj7wNkD6_SLx8Y",
  },

  onLoad() {
    console.log("网络测试页面加载");
  },

  // 开始网络测试
  async startNetworkTest() {
    this.setData({ isTesting: true, testResults: [] });

    const results = [];

    try {
      // 1. 检查网络状态
      const networkResult = await this.checkNetworkStatus();
      results.push(networkResult);

      // 2. 测试HTTP连接
      const httpResult = await this.testHttpConnection();
      results.push(httpResult);

      // 3. 测试WebSocket连接
      const wsResult = await this.testWebSocketConnection();
      results.push(wsResult);
    } catch (error) {
      console.error("网络测试异常:", error);
      results.push({
        name: "测试异常",
        status: "error",
        message: error.message,
      });
    }

    this.setData({
      testResults: results,
      isTesting: false,
    });
  },

  // 检查网络状态
  checkNetworkStatus() {
    return new Promise((resolve, reject) => {
      wx.getNetworkType({
        success: (res) => {
          const result = {
            name: "网络状态检查",
            status: res.networkType === "none" ? "error" : "success",
            message: `网络类型: ${res.networkType}`,
          };
          console.log("网络状态:", result);
          resolve(result);
        },
        fail: (error) => {
          const result = {
            name: "网络状态检查",
            status: "error",
            message: `获取失败: ${error.errMsg}`,
          };
          console.error("网络状态检查失败:", error);
          resolve(result);
        },
      });
    });
  },

  // 测试HTTP连接
  testHttpConnection() {
    return new Promise((resolve) => {
      wx.request({
        url: `${this.data.baseUrl}/health`,
        method: "GET",
        timeout: 10000,
        success: (res) => {
          const result = {
            name: "HTTP连接测试",
            status: res.statusCode === 200 ? "success" : "warning",
            message: `状态码: ${res.statusCode}, 响应: ${JSON.stringify(
              res.data
            )}`,
          };
          console.log("HTTP连接测试:", result);
          resolve(result);
        },
        fail: (error) => {
          const result = {
            name: "HTTP连接测试",
            status: "error",
            message: `连接失败: ${error.errMsg}`,
          };
          console.error("HTTP连接测试失败:", error);
          resolve(result);
        },
      });
    });
  },

  // 测试WebSocket连接
  testWebSocketConnection() {
    return new Promise((resolve) => {
      const wsUrl = this.data.baseUrl.replace("http", "ws");
      console.log("测试WebSocket连接:", wsUrl);

      const socketTask = wx.connectSocket({
        url: wsUrl,
        header: {
          Authorization: `Bearer ${this.data.token}`,
        },
        success: () => {
          console.log("WebSocket连接请求已发送");
        },
        fail: (error) => {
          const result = {
            name: "WebSocket连接测试",
            status: "error",
            message: `连接请求失败: ${error.errMsg}`,
          };
          console.error("WebSocket连接请求失败:", error);
          resolve(result);
        },
      });

      let timeout = setTimeout(() => {
        socketTask.close();
        const result = {
          name: "WebSocket连接测试",
          status: "error",
          message: "连接超时 (10秒)",
        };
        console.error("WebSocket连接超时");
        resolve(result);
      }, 10000);

      socketTask.onOpen(() => {
        console.log("WebSocket连接成功");
        clearTimeout(timeout);
        const result = {
          name: "WebSocket连接测试",
          status: "success",
          message: "连接成功",
        };
        socketTask.close();
        resolve(result);
      });

      socketTask.onError((error) => {
        console.error("WebSocket连接错误:", error);
        clearTimeout(timeout);
        const result = {
          name: "WebSocket连接测试",
          status: "error",
          message: `连接错误: ${error.errMsg}`,
        };
        resolve(result);
      });

      socketTask.onClose(() => {
        console.log("WebSocket连接已关闭");
      });
    });
  },

  // 清空测试结果
  clearResults() {
    this.setData({ testResults: [] });
  },

  // 复制测试结果
  copyResults() {
    const results = this.data.testResults;
    const text = results
      .map((r) => `${r.name}: ${r.status} - ${r.message}`)
      .join("\n");

    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: "已复制到剪贴板",
          icon: "success",
        });
      },
    });
  },
});
