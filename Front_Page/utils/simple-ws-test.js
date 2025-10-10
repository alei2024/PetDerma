// 最简单的WebSocket连接测试
function testSimpleWebSocket(baseUrl) {
  return new Promise((resolve, reject) => {
    console.log("=== 开始简单WebSocket测试 ===");
    console.log("测试地址:", baseUrl);

    // 构造WebSocket URL - Socket.IO默认路径
    const wsUrl =
      baseUrl.replace("http://", "ws://").replace("https://", "wss://") +
      "/socket.io/?EIO=4&transport=websocket";
    console.log("WebSocket URL:", wsUrl);

    try {
      const socketTask = wx.connectSocket({
        url: wsUrl,
        success: () => {
          console.log("✅ WebSocket连接请求发送成功");
        },
        fail: (error) => {
          console.error("❌ WebSocket连接请求失败:", error);
          reject(error);
        },
      });

      // 设置超时
      const timeout = setTimeout(() => {
        console.error("❌ WebSocket连接超时");
        socketTask.close();
        reject(new Error("连接超时"));
      }, 10000);

      // 连接成功
      socketTask.onOpen(() => {
        console.log("🎉 WebSocket连接成功！");
        clearTimeout(timeout);
        socketTask.close();
        resolve({ success: true, message: "连接成功" });
      });

      // 连接错误
      socketTask.onError((error) => {
        console.error("❌ WebSocket连接错误:", error);
        clearTimeout(timeout);
        reject(error);
      });

      // 连接关闭
      socketTask.onClose((res) => {
        console.log("WebSocket连接已关闭:", res);
      });
    } catch (error) {
      console.error("❌ WebSocket测试异常:", error);
      reject(error);
    }
  });
}

// 测试HTTP连接
function testHttpConnection(baseUrl) {
  return new Promise((resolve, reject) => {
    console.log("=== 测试HTTP连接 ===");
    console.log("测试URL:", `${baseUrl}/health`);

    wx.request({
      url: `${baseUrl}/health`,
      method: "GET",
      timeout: 5000,
      success: (res) => {
        console.log("✅ HTTP连接成功:", res.statusCode);
        console.log("响应数据:", res.data);
        resolve(res);
      },
      fail: (error) => {
        console.error("❌ HTTP连接失败:", error);
        reject(error);
      },
    });
  });
}

// 完整测试流程
async function runFullTest(baseUrl) {
  console.log("🚀 开始完整网络测试...");

  try {
    // 1. 测试HTTP连接
    await testHttpConnection(baseUrl);
    console.log("✅ HTTP测试通过");

    // 2. 测试WebSocket连接
    await testSimpleWebSocket(baseUrl);
    console.log("✅ WebSocket测试通过");

    console.log("🎉 所有测试通过！");
    return { success: true, message: "所有测试通过" };
  } catch (error) {
    console.error("❌ 测试失败:", error);
    return { success: false, error: error.message || error.errMsg };
  }
}

module.exports = {
  testSimpleWebSocket,
  testHttpConnection,
  runFullTest,
};
