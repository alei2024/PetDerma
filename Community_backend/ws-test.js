const { io } = require("socket.io-client");

// 替换为你的token
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQxMjkwZDAwMzljMzk3YmNlZDdmYTgiLCJpYXQiOjE3NTg1MzgzMDksImV4cCI6MTc1OTE0MzEwOX0.cDjRVTZ4iipw4Ggv2Sx4taBLkGZr7lj7wNkD6_SLx8Y";
const POST_ID = "68d12ed14cb763f7a4d6835a";

const socket = io("http://localhost:3000", {
  auth: { token: TOKEN },
  transports: ["websocket"]
});

socket.on("connect", () => {
  console.log("WS connected", socket.id);

  // 加入帖子房间（这样能接收该帖子的实时事件）
  socket.emit("join_room", `post_${POST_ID}`);

  // 模拟点一次赞（仅作为演示。实际点赞请用HTTP接口，然后看看这里能否收到推送）
  setTimeout(() => {
    console.log("Emit like_post (demo broadcast)");
    socket.emit("like_post", {
      postId: POST_ID,
      isLiked: true,
      likeCount: 1
    });
  }, 1000);
});

// 监听服务端推送
socket.on("post_liked", (data) => console.log("post_liked", data));
socket.on("post_commented", (data) => console.log("post_commented", data));
socket.on("post_favorited", (data) => console.log("post_favorited", data));
socket.on("system_message", (data) => console.log("system_message", data));
socket.on("notification", (data) => console.log("notification", data));

socket.on("connect_error", (err) => {
  console.error("WS connect_error", err.message);
});