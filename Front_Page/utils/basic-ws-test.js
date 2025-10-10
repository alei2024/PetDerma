// 基础WebSocket连接测试（不使用Socket.IO）
function testBasicWebSocket(baseUrl) {
  return new Promise((resolve, reject) => {
    console.log("=== 基础WebSocket测试 ===");
    console.log("测试地址:", baseUrl);

    // 尝试连接到一个简单的WebSocket端点
    const wsUrl =
      baseUrl.replace("http://", "ws://").replace("https://", "wss://") +
      "/ws-test";
    console.log("基础WebSocket URL:", wsUrl);

    try {
      const socketTask = wx.connectSocket({
        url: wsUrl,
        success: () => {
          console.log("✅ 基础WebSocket连接请求发送成功");
        },
        fail: (error) => {
          console.error("❌ 基础WebSocket连接请求失败:", error);
          // 这是预期的，因为我们没有在后端设置 /ws-test 端点
          resolve({
            success: false,
            message: "基础WebSocket测试完成（预期失败）",
            expected: true,
          });
        },
      });

      const timeout = setTimeout(() => {
        console.log("基础WebSocket测试超时（预期）");
        socketTask.close();
        resolve({
          success: false,
          message: "基础WebSocket测试超时（预期）",
          expected: true,
        });
      }, 3000);

      socketTask.onOpen(() => {
        console.log("🎉 基础WebSocket连接成功！");
        clearTimeout(timeout);
        socketTask.close();
        resolve({ success: true, message: "基础WebSocket连接成功" });
      });

      socketTask.onError((error) => {
        console.log("基础WebSocket连接错误（可能是预期的）:", error);
        clearTimeout(timeout);
        resolve({
          success: false,
          message: "基础WebSocket连接错误",
          expected: true,
        });
      });

      socketTask.onClose((res) => {
        console.log("基础WebSocket连接已关闭:", res);
      });
    } catch (error) {
      console.error("❌ 基础WebSocket测试异常:", error);
      resolve({
        success: false,
        message: "基础WebSocket测试异常",
        error: error.message,
      });
    }
  });
}

// 测试Socket.IO连接
function testSocketIOConnection(baseUrl) {
  return new Promise((resolve, reject) => {
    console.log("=== Socket.IO连接测试 ===");

    // 首先测试Socket.IO的HTTP端点
    wx.request({
      url: `${baseUrl}/socket.io/?EIO=4&transport=polling`,
      method: "GET",
      success: (res) => {
        console.log("✅ Socket.IO HTTP端点响应:", res.statusCode);
        console.log("响应内容:", res.data);
        resolve({ success: true, message: "Socket.IO HTTP端点可访问" });
      },
      fail: (error) => {
        console.error("❌ Socket.IO HTTP端点失败:", error);
        reject({
          success: false,
          message: "Socket.IO HTTP端点不可访问",
          error: error.errMsg,
        });
      },
    });
  });
}

// 完整的连接能力测试
async function testConnectionCapabilities(baseUrl) {
  console.log("🔍 开始连接能力测试...");
  const results = [];

  try {
    // 1. 测试HTTP连接
    console.log("--- 测试1: HTTP连接 ---");
    const httpResult = await new Promise((resolve) => {
      wx.request({
        url: `${baseUrl}/health`,
        method: "GET",
        success: (res) =>
          resolve({ success: true, statusCode: res.statusCode }),
        fail: (error) => resolve({ success: false, error: error.errMsg }),
      });
    });
    results.push({ test: "HTTP连接", result: httpResult });

    // 2. 测试Socket.IO HTTP端点
    console.log("--- 测试2: Socket.IO HTTP端点 ---");
    try {
      const socketIOResult = await testSocketIOConnection(baseUrl);
      results.push({ test: "Socket.IO HTTP", result: socketIOResult });
    } catch (error) {
      results.push({ test: "Socket.IO HTTP", result: error });
    }

    // 3. 测试基础WebSocket能力
    console.log("--- 测试3: 基础WebSocket能力 ---");
    const wsResult = await testBasicWebSocket(baseUrl);
    results.push({ test: "基础WebSocket", result: wsResult });

    console.log("🎯 连接能力测试完成");
    console.log("测试结果:", results);

    return { success: true, results };
  } catch (error) {
    console.error("❌ 连接能力测试异常:", error);
    return { success: false, error: error.message, results };
  }
}

module.exports = {
  testBasicWebSocket,
  testSocketIOConnection,
  testConnectionCapabilities,
};
