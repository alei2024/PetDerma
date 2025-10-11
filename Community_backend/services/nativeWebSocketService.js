const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

class NativeWebSocketService {
  constructor() {
    this.wss = null;
    this.connectedClients = new Map(); // 存储连接的客户端
    this.rooms = new Map(); // 存储房间信息
  }

  initialize(server) {
    // 创建WebSocket服务器，监听 /ws 路径
    this.wss = new WebSocket.Server({
      server,
      path: "/ws",
      verifyClient: (info) => {
        return true; // 开发环境允许所有连接
      },
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.wss.on("connection", (ws, req) => {
      // 解析URL参数获取token
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get("token");

      this.handleConnection(ws, token);
    });
  }

  async handleConnection(ws, token) {
    try {
      // 认证用户
      const user = await this.authenticateUser(token);

      // 设置客户端信息
      const clientId = this.generateClientId();
      ws.clientId = clientId;
      ws.userId = user.id;
      ws.user = user;

      // 存储连接
      this.connectedClients.set(clientId, {
        ws,
        userId: user.id,
        user,
        rooms: new Set(),
        lastSeen: new Date(),
      });

      // 发送连接成功消息
      this.sendMessage(ws, "connect", {
        message: "连接成功",
        userId: user.id,
        user: user,
      });

      // 设置消息处理
      ws.on("message", (data) => {
        this.handleMessage(ws, data);
      });

      // 设置断开连接处理
      ws.on("close", () => {
        this.handleDisconnect(ws);
      });

      // 设置错误处理
      ws.on("error", (error) => {
        console.error("❌ WebSocket错误:", error);
      });

      // 心跳处理
      ws.on("ping", () => {
        ws.pong();
      });
    } catch (error) {
      console.error("❌ WebSocket认证失败:", error.message);
      this.sendMessage(ws, "connect_error", {
        message: "认证失败: " + error.message,
      });
      ws.close();
    }
  }

  async authenticateUser(token) {
    if (!token || token === "test-token") {
      // 开发环境测试用户 - 使用有效的ObjectId格式
      return {
        id: "507f1f77bcf86cd799439011", // 有效的ObjectId格式
        nickName: "测试用户",
        avatar: null,
      };
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new Error("用户不存在");
      }

      return {
        id: user._id.toString(),
        nickName: user.nickName,
        avatar: user.avatar,
      };
    } catch (error) {
      throw new Error("Token无效: " + error.message);
    }
  }

  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());
      const { type, event, data: eventData } = message;

      if (type === "event") {
        this.handleEvent(ws, event, eventData);
      }
    } catch (error) {
      console.error("❌ 解析消息失败:", error);
    }
  }

  handleEvent(ws, event, data) {
    const client = this.connectedClients.get(ws.clientId);
    if (!client) return;

    switch (event) {
      case "join_post":
        this.handleJoinPost(ws, data);
        break;
      case "leave_post":
        this.handleLeavePost(ws, data);
        break;
      case "ping":
        this.sendMessage(ws, "pong", { timestamp: Date.now() });
        break;
      default:
    }
  }

  handleJoinPost(ws, data) {
    const { postId } = data;
    if (!postId) return;

    const client = this.connectedClients.get(ws.clientId);
    if (!client) return;

    const roomName = `post_${postId}`;

    // 添加到房间
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    this.rooms.get(roomName).add(ws.clientId);
    client.rooms.add(roomName);

    console.log(`📡 用户 ${client.user.nickName} 加入房间: ${roomName}`);

    // 通知房间内其他用户
    this.broadcastToRoom(
      roomName,
      "user_joined_post",
      {
        postId,
        userId: client.userId,
        user: client.user,
        timestamp: new Date(),
      },
      ws.clientId
    );
  }

  handleLeavePost(ws, data) {
    const { postId } = data;
    if (!postId) return;

    const client = this.connectedClients.get(ws.clientId);
    if (!client) return;

    const roomName = `post_${postId}`;

    // 从房间移除
    if (this.rooms.has(roomName)) {
      this.rooms.get(roomName).delete(ws.clientId);
      if (this.rooms.get(roomName).size === 0) {
        this.rooms.delete(roomName);
      }
    }
    client.rooms.delete(roomName);

    console.log(`📡 用户 ${client.user.nickName} 离开房间: ${roomName}`);

    // 通知房间内其他用户
    this.broadcastToRoom(
      roomName,
      "user_left_post",
      {
        postId,
        userId: client.userId,
        user: client.user,
        timestamp: new Date(),
      },
      ws.clientId
    );
  }

  handleDisconnect(ws) {
    const client = this.connectedClients.get(ws.clientId);
    if (!client) return;

    // 从所有房间移除
    client.rooms.forEach((roomName) => {
      if (this.rooms.has(roomName)) {
        this.rooms.get(roomName).delete(ws.clientId);
        if (this.rooms.get(roomName).size === 0) {
          this.rooms.delete(roomName);
        }
      }
    });

    // 移除客户端
    this.connectedClients.delete(ws.clientId);
  }

  // 发送消息给特定客户端
  sendMessage(ws, event, data) {
    if (ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: "event",
        event,
        data,
        timestamp: Date.now(),
      });
      ws.send(message);
    }
  }

  // 广播消息到房间
  broadcastToRoom(roomName, event, data, excludeClientId = null) {
    if (!this.rooms.has(roomName)) return;

    const clientIds = this.rooms.get(roomName);
    clientIds.forEach((clientId) => {
      if (clientId === excludeClientId) return;

      const client = this.connectedClients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, event, data);
      }
    });
  }

  // 广播消息到所有连接
  broadcast(event, data, excludeClientId = null) {
    this.connectedClients.forEach((client, clientId) => {
      if (clientId === excludeClientId) return;

      if (client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, event, data);
      }
    });
  }

  generateClientId() {
    return (
      "client_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  // 获取房间内的客户端数量
  getRoomSize(roomName) {
    return this.rooms.has(roomName) ? this.rooms.get(roomName).size : 0;
  }

  // 获取在线用户数量
  getOnlineUserCount() {
    return this.connectedClients.size;
  }
}

module.exports = new NativeWebSocketService();
