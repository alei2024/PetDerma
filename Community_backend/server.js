const app = require("./app");
const socketService = require("./services/socketService");
const nativeWebSocketService = require("./services/nativeWebSocketService");

const PORT = process.env.PORT || 3000;

// 启动服务器 - 监听所有网络接口（允许局域网访问）
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📱 环境: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 本地访问: http://localhost:${PORT}`);
  console.log(`🌐 局域网访问: http://172.28.16.1:${PORT}`);
});

// 初始化WebSocket服务
socketService.initialize(server);

// 初始化原生WebSocket服务
nativeWebSocketService.initialize(server);

// 优雅关闭
process.on("SIGTERM", () => {
  console.log("SIGTERM 信号 received. 关闭服务器...");
  server.close(() => {
    console.log("服务器已关闭");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT 信号 received. 关闭服务器...");
  server.close(() => {
    console.log("服务器已关闭");
    process.exit(0);
  });
});

// 处理未捕获的异常
process.on("uncaughtException", (error) => {
  console.error("未捕获的异常:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("未处理的Promise拒绝:", reason);
  process.exit(1);
});
