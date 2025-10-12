// 微信小程序原生WebSocket封装
let socket = null;
let isConnected = false;
let eventListeners = new Map();

function connectSocket({ baseUrl, token }) {
  if (socket && isConnected) return socket;

  console.log("正在连接WebSocket...", { baseUrl, hasToken: !!token });

  // 将HTTP URL转换为WebSocket URL
  const wsUrl = baseUrl.replace(/^https?:/, "ws:") + "/ws";

  try {
    socket = wx.connectSocket({
      url: wsUrl,
      header: {
        Authorization: `Bearer ${token}`,
      },
      protocols: ["websocket"],
    });

    socket.onOpen(() => {
      console.log("✅ WebSocket连接成功");
      isConnected = true;

      // 触发连接成功事件
      triggerEvent("connect", {});
    });

    socket.onMessage((res) => {
      try {
        const data = JSON.parse(res.data);
        console.log("📨 收到WebSocket消息:", data);

        // 根据消息类型触发相应事件
        if (data.type) {
          triggerEvent(data.type, data.payload || data);
        }
      } catch (error) {
        console.error("解析WebSocket消息失败:", error);
      }
    });

    socket.onClose((res) => {
      console.log("❌ WebSocket连接关闭:", res);
      isConnected = false;

      // 触发断开连接事件
      triggerEvent("disconnect", res);

      // 自动重连
      setTimeout(() => {
        if (!isConnected) {
          console.log("🔄 尝试重新连接WebSocket...");
          connectSocket({ baseUrl, token });
        }
      }, 3000);
    });

    socket.onError((error) => {
      console.error("❌ WebSocket连接错误:", error);
      isConnected = false;

      // 触发错误事件
      triggerEvent("error", error);
    });

    // 添加事件监听方法
    socket.on = function (event, callback) {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      eventListeners.get(event).push(callback);
    };

    // 添加事件发送方法
    socket.emit = function (event, data) {
      if (isConnected) {
        const message = JSON.stringify({
          type: event,
          payload: data,
          timestamp: Date.now(),
        });

        socket.send({
          data: message,
          success: () => {
            console.log(`📤 WebSocket事件发送成功: ${event}`, data);
          },
          fail: (error) => {
            console.error(`❌ WebSocket事件发送失败: ${event}`, error);
          },
        });
      } else {
        console.warn("⚠️ WebSocket未连接，无法发送事件:", event);
      }
    };

    // 添加连接状态属性
    Object.defineProperty(socket, "connected", {
      get: () => isConnected,
    });

    return socket;
  } catch (error) {
    console.error("❌ 创建WebSocket连接失败:", error);
    return null;
  }
}

// 触发事件
function triggerEvent(event, data) {
  if (eventListeners.has(event)) {
    eventListeners.get(event).forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`事件回调执行失败 ${event}:`, error);
      }
    });
  }
}

function getSocket() {
  return socket;
}

module.exports = {
  connectSocket,
  getSocket,
};
