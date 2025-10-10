const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // 存储在线用户
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*", // 允许所有来源，开发环境使用
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000, // 增加ping超时时间
      pingInterval: 25000, // 增加ping间隔
      connectTimeout: 45000, // 增加连接超时时间
      transports: ["polling", "websocket"], // 先polling后websocket
      allowEIO3: true, // 兼容EIO3
      path: "/socket.io", // 与客户端保持一致（不带尾部斜杠）
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // JWT认证中间件 - 开发环境宽松模式
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.split(" ")[1];

        console.log("WebSocket认证尝试，token:", token ? "已提供" : "未提供");

        // 开发环境：允许无token连接或使用测试用户
        const isDevelopment = process.env.NODE_ENV !== "production";

        if (isDevelopment && (!token || token === "test-token")) {
          console.log("⚠️ 开发模式：使用测试用户");
          socket.userId = "507f1f77bcf86cd799439011";
          socket.user = {
            id: "507f1f77bcf86cd799439011",
            nickName: "测试用户",
            avatar: "/uploads/user_default.png",
          };
          console.log("✅ WebSocket认证通过（开发模式）");
          return next();
        }

        if (!token) {
          console.log("WebSocket认证失败：未提供token");
          return next(new Error("未提供认证令牌"));
        }

        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "S3cReT_2025_Xyz!AbCdEfGh123456"
        );

        console.log("JWT解码成功，用户ID:", decoded.userId);

        const user = await User.findById(decoded.userId);

        if (!user) {
          console.log("WebSocket认证失败：用户不存在");
          return next(new Error("用户不存在"));
        }

        if (user.status !== "active") {
          console.log("WebSocket认证失败：用户状态异常");
          return next(new Error("用户已被禁用"));
        }

        socket.userId = user._id.toString();
        socket.user = {
          id: user._id,
          nickName: user.nickName,
          avatar: user.avatar,
        };

        console.log("WebSocket认证成功，用户:", user.nickName);
        next();
      } catch (error) {
        console.error("WebSocket认证错误:", error.message);
        if (error.name === "TokenExpiredError") {
          next(new Error("认证令牌已过期"));
        } else if (error.name === "JsonWebTokenError") {
          next(new Error("认证令牌无效"));
        } else {
          next(new Error("认证失败: " + error.message));
        }
      }
    });
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`用户 ${socket.user.nickName} 已连接 (${socket.id})`);

      // 存储在线用户
      this.connectedUsers.set(socket.userId, {
        socketId: socket.id,
        user: socket.user,
        lastSeen: new Date(),
      });

      // 通知其他用户有新用户上线
      socket.broadcast.emit("user_online", {
        userId: socket.userId,
        user: socket.user,
      });

      // 处理房间管理
      socket.on("join_post", (data) => {
        this.handleJoinPost(socket, data);
      });

      socket.on("leave_post", (data) => {
        this.handleLeavePost(socket, data);
      });

      // 处理实时点赞
      socket.on("like_post", (data) => {
        this.handleLikePost(socket, data);
      });

      // 处理实时评论
      socket.on("comment_post", (data) => {
        this.handleCommentPost(socket, data);
      });

      // 处理实时收藏
      socket.on("favorite_post", (data) => {
        this.handleFavoritePost(socket, data);
      });

      // 处理实时转发
      socket.on("share_post", (data) => {
        this.handleSharePost(socket, data);
      });

      // 处理断开连接
      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });
    });
  }

  // 处理点赞
  handleLikePost(socket, data) {
    const { postId, isLiked, likeCount } = data;

    // 广播给所有用户
    socket.broadcast.emit("post_liked", {
      postId,
      userId: socket.userId,
      user: socket.user,
      isLiked,
      likeCount,
      timestamp: new Date(),
    });
  }

  // 处理评论
  handleCommentPost(socket, data) {
    const { postId, comment } = data;

    // 广播给所有用户
    socket.broadcast.emit("post_commented", {
      postId,
      comment,
      userId: socket.userId,
      user: socket.user,
      timestamp: new Date(),
    });
  }

  // 处理收藏
  handleFavoritePost(socket, data) {
    const { postId, isFavorited, favoriteCount } = data;

    // 广播给所有用户
    socket.broadcast.emit("post_favorited", {
      postId,
      userId: socket.userId,
      user: socket.user,
      isFavorited,
      favoriteCount,
      timestamp: new Date(),
    });
  }

  // 处理转发
  handleSharePost(socket, data) {
    const { postId, shareComment, shareCount } = data;

    // 广播给所有用户
    socket.broadcast.emit("post_shared", {
      postId,
      userId: socket.userId,
      user: socket.user,
      shareComment,
      shareCount,
      timestamp: new Date(),
    });
  }

  // 处理加入帖子房间
  handleJoinPost(socket, data) {
    const { postId } = data;
    if (!postId) return;

    const roomName = `post_${postId}`;
    socket.join(roomName);

    console.log(`用户 ${socket.user.nickName} 加入帖子房间: ${roomName}`);

    // 通知房间内其他用户
    socket.to(roomName).emit("user_joined_post", {
      postId,
      userId: socket.userId,
      user: socket.user,
      timestamp: new Date(),
    });
  }

  // 处理离开帖子房间
  handleLeavePost(socket, data) {
    const { postId } = data;
    if (!postId) return;

    const roomName = `post_${postId}`;
    socket.leave(roomName);

    console.log(`用户 ${socket.user.nickName} 离开帖子房间: ${roomName}`);

    // 通知房间内其他用户
    socket.to(roomName).emit("user_left_post", {
      postId,
      userId: socket.userId,
      user: socket.user,
      timestamp: new Date(),
    });
  }

  // 处理断开连接
  handleDisconnect(socket) {
    console.log(`用户 ${socket.user?.nickName} 已断开连接`);

    // 从在线用户列表中移除
    this.connectedUsers.delete(socket.userId);

    // 通知其他用户
    socket.broadcast.emit("user_offline", {
      userId: socket.userId,
      user: socket.user,
    });
  }

  // 发送系统通知
  sendNotification(userId, notification) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.io.to(user.socketId).emit("notification", notification);
    }
  }

  // 广播系统消息
  broadcastSystemMessage(message) {
    this.io.emit("system_message", {
      message,
      timestamp: new Date(),
    });
  }

  // 获取在线用户列表
  getOnlineUsers() {
    return Array.from(this.connectedUsers.values());
  }

  // 检查用户是否在线
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }
}

module.exports = new SocketService();
