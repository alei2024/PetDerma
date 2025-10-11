const io = require("weapp.socket.io");
const websocketMonitor = require("./websocket-monitor");

let socket = null;

function connectSocket({ baseUrl, token }) {
  if (socket && socket.connected) return socket;

  console.log("正在连接WebSocket...", { baseUrl, hasToken: !!token });

  socket = io(baseUrl, {
    // 先用polling（HTTP轮询）避免微信小程序WebSocket兼容问题
    transports: ["polling", "websocket"],
    auth: { token },
    timeout: 20000,
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 5,
    path: "/socket.io",
    // 强制使用polling起步，成功后自动升级websocket
    upgrade: true,
    rememberUpgrade: false,
  });

  // 使用监控工具处理连接事件
  socket.on("connect", () => {
    websocketMonitor.onConnect(socket);
  });

  socket.on("connect_error", (err) => {
    websocketMonitor.onConnectError(err);

    // 如果是认证错误，清除token并重新登录
    if (err.message && err.message.includes("认证")) {
      console.log("认证失败，请重新登录");
      wx.removeStorageSync("token");
      wx.removeStorageSync("userInfo");
    }
  });

  socket.on("disconnect", (reason) => {
    websocketMonitor.onDisconnect(reason);
  });

  socket.on("reconnect", (attemptNumber) => {
    websocketMonitor.onReconnect(attemptNumber);
  });

  socket.on("reconnect_error", (error) => {
    console.error("WS reconnection error:", error);
  });

  socket.on("reconnect_failed", () => {
    websocketMonitor.onReconnectFailed();
  });

  // 重连成功事件
  socket.on("reconnect", (attemptNumber) => {
    websocketMonitor.onReconnectSuccess(attemptNumber);
  });

  // 常用业务事件
  socket.on("post_liked", (data) => {
    console.log("📨 收到post_liked事件:", data);
    websocketMonitor.notifyListeners("postLiked", data);
  });

  socket.on("post_favorited", (data) => {
    console.log("📨 收到post_favorited事件:", data);
    websocketMonitor.notifyListeners("postFavorited", data);
  });

  socket.on("post_commented", (data) => {
    console.log("📨 收到post_commented事件:", data);
    websocketMonitor.notifyListeners("postCommented", data);
  });

  return socket;
}

function getSocket() {
  return socket;
}

module.exports = {
  connectSocket,
  getSocket,
};
