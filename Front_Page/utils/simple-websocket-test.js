// 简化的WebSocket连接测试
function testWebSocketConnection(baseUrl, token) {
  return new Promise((resolve, reject) => {
    console.log("开始WebSocket连接测试...");
    console.log("服务器地址:", baseUrl);
    console.log("Token状态:", token ? "已提供" : "未提供");

    // 使用微信小程序原生WebSocket API - Socket.IO路径
    let wsUrl;
    if (baseUrl.startsWith("https://")) {
      wsUrl =
        baseUrl.replace("https://", "wss://") +
        "/socket.io/?EIO=4&transport=websocket";
    } else if (baseUrl.startsWith("http://")) {
      wsUrl =
        baseUrl.replace("http://", "ws://") +
        "/socket.io/?EIO=4&transport=websocket";
    } else {
      wsUrl = `ws://${baseUrl}/socket.io/?EIO=4&transport=websocket`;
    }
    console.log("原始URL:", baseUrl);
    console.log("Socket.IO WebSocket URL:", wsUrl);

    const socketTask = wx.connectSocket({
      url: wsUrl,
      success: () => {
        console.log("WebSocket连接请求已发送");
      },
      fail: (error) => {
        console.error("WebSocket连接请求失败:", error);
        console.error("错误详情:", JSON.stringify(error));
        reject(new Error(`连接请求失败: ${error.errMsg || "未知错误"}`));
      },
    });

    let timeout = setTimeout(() => {
      console.error("WebSocket连接超时");
      socketTask.close();
      reject(new Error("连接超时 (15秒)"));
    }, 15000);

    socketTask.onOpen(() => {
      console.log("✅ WebSocket连接成功");
      clearTimeout(timeout);
      socketTask.close();
      resolve({ success: true, message: "连接成功" });
    });

    socketTask.onError((error) => {
      console.error("❌ WebSocket连接错误:", error);
      clearTimeout(timeout);
      reject(new Error(`连接错误: ${error.errMsg || "连接失败"}`));
    });

    socketTask.onClose(() => {
      console.log("WebSocket连接已关闭");
    });
  });
}

// 测试HTTP连接
function testHttpConnection(baseUrl) {
  return new Promise((resolve, reject) => {
    console.log("测试HTTP连接:", baseUrl);

    wx.request({
      url: `${baseUrl}/health`,
      method: "GET",
      timeout: 10000,
      success: (res) => {
        console.log("✅ HTTP连接成功:", res.statusCode);
        resolve({ success: true, statusCode: res.statusCode, data: res.data });
      },
      fail: (error) => {
        console.error("❌ HTTP连接失败:", error);
        reject(new Error(`HTTP连接失败: ${error.errMsg}`));
      },
    });
  });
}

// 检查网络状态
function checkNetworkStatus() {
  return new Promise((resolve, reject) => {
    wx.getNetworkType({
      success: (res) => {
        console.log("网络类型:", res.networkType);
        if (res.networkType === "none") {
          reject(new Error("无网络连接"));
        } else {
          resolve({ networkType: res.networkType });
        }
      },
      fail: (error) => {
        console.error("获取网络状态失败:", error);
        reject(new Error(`获取网络状态失败: ${error.errMsg}`));
      },
    });
  });
}

// 完整的连接测试
async function performConnectionTest(baseUrl, token) {
  const results = [];

  try {
    // 1. 检查网络状态
    console.log("=== 步骤1: 检查网络状态 ===");
    const networkResult = await checkNetworkStatus();
    results.push({
      step: "网络状态",
      status: "success",
      message: `网络类型: ${networkResult.networkType}`,
    });

    // 2. 测试HTTP连接
    console.log("=== 步骤2: 测试HTTP连接 ===");
    const httpResult = await testHttpConnection(baseUrl);
    results.push({
      step: "HTTP连接",
      status: "success",
      message: `状态码: ${httpResult.statusCode}`,
    });

    // 3. 测试WebSocket连接
    console.log("=== 步骤3: 测试WebSocket连接 ===");
    const wsResult = await testWebSocketConnection(baseUrl, token);
    results.push({
      step: "WebSocket连接",
      status: "success",
      message: wsResult.message,
    });

    console.log("✅ 所有连接测试通过");
    return { success: true, results };
  } catch (error) {
    console.error("❌ 连接测试失败:", error.message);
    results.push({ step: "连接测试", status: "error", message: error.message });
    return { success: false, error: error.message, results };
  }
}

module.exports = {
  testWebSocketConnection,
  testHttpConnection,
  checkNetworkStatus,
  performConnectionTest,
};
