const { io } = require("socket.io-client");

// 最终WebSocket连接测试
const finalTest = () => {
  console.log("=== 最终WebSocket连接测试 ===");
  console.log("时间:", new Date().toISOString());
  
  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQxMjkwZDAwMzljMzk3YmNlZDdmYTgiLCJpYXQiOjE3NTg1MzgzMDksImV4cCI6MTc1OTE0MzEwOX0.cDjRVTZ4iipw4Ggv2Sx4taBLkGZr7lj7wNkD6_SLx8Y";
  
  console.log("1. 测试服务器健康状态...");
  
  // 先测试HTTP连接
  fetch('http://localhost:3000/health')
    .then(res => res.json())
    .then(data => {
      console.log("✅ 服务器健康检查通过:", data.message);
      
      console.log("2. 开始WebSocket连接测试...");
      
      const socket = io("http://localhost:3000", {
        auth: { token: TOKEN },
        transports: ["websocket"],
        timeout: 30000,
        reconnection: false, // 禁用重连，专注测试连接
        forceNew: true
      });

      let connected = false;
      let timeout = setTimeout(() => {
        if (!connected) {
          console.error("❌ WebSocket连接超时 (30秒)");
          socket.disconnect();
          process.exit(1);
        }
      }, 30000);

      socket.on("connect", () => {
        connected = true;
        clearTimeout(timeout);
        console.log("✅ WebSocket连接成功！");
        console.log("Socket ID:", socket.id);
        console.log("连接时间:", new Date().toISOString());
        
        // 测试发送消息
        socket.emit("join_room", "test_room");
        console.log("✅ 已加入测试房间");
        
        // 测试业务事件
        setTimeout(() => {
          socket.emit("like_post", {
            postId: "test_post_123",
            isLiked: true,
            likeCount: 1
          });
          console.log("✅ 已发送测试消息");
        }, 1000);
        
        // 3秒后关闭连接
        setTimeout(() => {
          console.log("✅ 测试完成，关闭连接");
          socket.disconnect();
          process.exit(0);
        }, 3000);
      });

      socket.on("connect_error", (err) => {
        connected = true;
        clearTimeout(timeout);
        console.error("❌ WebSocket连接失败:", err.message);
        console.error("错误详情:", err);
        process.exit(1);
      });

      socket.on("disconnect", (reason) => {
        console.log("🔌 WebSocket断开连接:", reason);
      });

      // 监听服务端事件
      socket.on("post_liked", (data) => {
        console.log("📨 收到服务端推送:", data);
      });

    })
    .catch(error => {
      console.error("❌ 服务器健康检查失败:", error.message);
      console.log("请确保后端服务器正在运行: npm start");
      process.exit(1);
    });
};

// 检查环境
console.log("Node.js版本:", process.version);
console.log("当前目录:", process.cwd());
console.log("");

finalTest();

