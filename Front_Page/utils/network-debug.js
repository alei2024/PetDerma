// 微信小程序网络调试工具
class NetworkDebugger {
  constructor() {
    this.debugInfo = [];
  }

  // 检查网络状态
  checkNetworkStatus() {
    return new Promise((resolve, reject) => {
      wx.getNetworkType({
        success: (res) => {
          console.log("网络类型:", res.networkType);
          this.addDebugInfo("网络类型", res.networkType);

          if (res.networkType === "none") {
            reject(new Error("无网络连接"));
          } else {
            resolve(res);
          }
        },
        fail: (error) => {
          console.error("获取网络状态失败:", error);
          reject(error);
        },
      });
    });
  }

  // 测试域名连通性
  testDomainConnectivity(domain) {
    return new Promise((resolve, reject) => {
      const testUrl = `${domain}/health`;
      console.log("测试域名连通性:", testUrl);

      wx.request({
        url: testUrl,
        method: "GET",
        timeout: 5000,
        success: (res) => {
          console.log("域名连通性测试成功:", res.statusCode);
          this.addDebugInfo("域名连通性", `成功 (${res.statusCode})`);
          resolve(res);
        },
        fail: (error) => {
          console.error("域名连通性测试失败:", error);
          this.addDebugInfo("域名连通性", `失败: ${error.errMsg}`);
          reject(error);
        },
      });
    });
  }

  // 检查微信小程序网络配置
  checkMiniProgramNetworkConfig() {
    const accountInfo = wx.getAccountInfoSync();
    console.log("小程序信息:", accountInfo);
    this.addDebugInfo("小程序信息", accountInfo);

    // 检查是否在开发工具中
    const isDevTools = accountInfo.miniProgram.envVersion === "develop";
    console.log("是否在开发工具中:", isDevTools);
    this.addDebugInfo("开发工具", isDevTools ? "是" : "否");

    return {
      accountInfo,
      isDevTools,
    };
  }

  // 测试WebSocket连接
  testWebSocketConnection(url, token) {
    return new Promise((resolve, reject) => {
      console.log("开始WebSocket连接测试...");

      const socketTask = wx.connectSocket({
        url: url.replace("http", "ws"),
        header: {
          Authorization: `Bearer ${token}`,
        },
        success: () => {
          console.log("WebSocket连接请求已发送");
        },
        fail: (error) => {
          console.error("WebSocket连接请求失败:", error);
          this.addDebugInfo("WebSocket连接", `请求失败: ${error.errMsg}`);
          reject(error);
        },
      });

      let timeout = setTimeout(() => {
        socketTask.close();
        reject(new Error("WebSocket连接超时"));
      }, 10000);

      socketTask.onOpen(() => {
        console.log("WebSocket连接成功");
        clearTimeout(timeout);
        this.addDebugInfo("WebSocket连接", "成功");
        socketTask.close();
        resolve();
      });

      socketTask.onError((error) => {
        console.error("WebSocket连接错误:", error);
        clearTimeout(timeout);
        this.addDebugInfo("WebSocket连接", `错误: ${error.errMsg}`);
        reject(error);
      });

      socketTask.onClose(() => {
        console.log("WebSocket连接已关闭");
      });
    });
  }

  // 添加调试信息
  addDebugInfo(key, value) {
    this.debugInfo.push({
      key,
      value,
      timestamp: new Date().toISOString(),
    });
  }

  // 获取调试信息
  getDebugInfo() {
    return this.debugInfo;
  }

  // 清空调试信息
  clearDebugInfo() {
    this.debugInfo = [];
  }

  // 显示调试信息
  showDebugInfo() {
    console.log("=== 网络调试信息 ===");
    this.debugInfo.forEach((info) => {
      console.log(`${info.key}: ${info.value} (${info.timestamp})`);
    });
    console.log("==================");
  }

  // 完整的网络诊断
  async fullDiagnosis(baseUrl, token) {
    console.log("开始完整网络诊断...");
    this.clearDebugInfo();

    try {
      // 1. 检查网络状态
      await this.checkNetworkStatus();

      // 2. 检查小程序配置
      this.checkMiniProgramNetworkConfig();

      // 3. 测试域名连通性
      await this.testDomainConnectivity(baseUrl);

      // 4. 测试WebSocket连接
      await this.testWebSocketConnection(baseUrl, token);

      console.log("网络诊断完成，所有测试通过");
      return { success: true, message: "网络诊断通过" };
    } catch (error) {
      console.error("网络诊断失败:", error);
      this.showDebugInfo();
      return {
        success: false,
        error: error.message,
        debugInfo: this.getDebugInfo(),
      };
    }
  }
}

// 创建全局调试实例
const networkDebugger = new NetworkDebugger();

module.exports = networkDebugger;
