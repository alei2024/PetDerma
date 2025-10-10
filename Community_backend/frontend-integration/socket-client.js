// 微信小程序WebSocket客户端示例
class CommunitySocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.eventHandlers = new Map();
  }

  // 连接WebSocket
  connect(token) {
    return new Promise((resolve, reject) => {
      try {
        // 微信小程序中使用wx.connectSocket
        this.socket = wx.connectSocket({
          url: "ws://localhost:3000", // 替换为你的服务器地址
          header: {
            Authorization: `Bearer ${token}`,
          },
        });

        this.socket.onOpen(() => {
          console.log("WebSocket连接已建立");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.onMessage((res) => {
          try {
            const data = JSON.parse(res.data);
            this.handleMessage(data);
          } catch (error) {
            console.error("解析WebSocket消息失败:", error);
          }
        });

        this.socket.onClose(() => {
          console.log("WebSocket连接已关闭");
          this.isConnected = false;
          this.handleReconnect();
        });

        this.socket.onError((error) => {
          console.error("WebSocket连接错误:", error);
          this.isConnected = false;
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // 处理消息
  handleMessage(data) {
    const { type, payload } = data;

    if (this.eventHandlers.has(type)) {
      this.eventHandlers.get(type).forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`处理事件 ${type} 失败:`, error);
        }
      });
    }
  }

  // 注册事件处理器
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  // 移除事件处理器
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // 发送消息
  send(type, data) {
    if (this.isConnected && this.socket) {
      this.socket.send({
        data: JSON.stringify({ type, data }),
      });
    } else {
      console.warn("WebSocket未连接，无法发送消息");
    }
  }

  // 加入房间
  joinRoom(roomId) {
    this.send("join_room", { roomId });
  }

  // 离开房间
  leaveRoom(roomId) {
    this.send("leave_room", { roomId });
  }

  // 点赞帖子
  likePost(postId) {
    this.send("like_post", { postId });
  }

  // 评论帖子
  commentPost(postId, comment) {
    this.send("comment_post", { postId, comment });
  }

  // 收藏帖子
  favoritePost(postId) {
    this.send("favorite_post", { postId });
  }

  // 转发帖子
  sharePost(postId, comment = "") {
    this.send("share_post", { postId, comment });
  }

  // 发送私聊消息
  sendPrivateMessage(toUserId, message) {
    this.send("private_message", { toUserId, message });
  }

  // 开始输入
  startTyping(postId) {
    this.send("typing_start", { postId });
  }

  // 停止输入
  stopTyping(postId) {
    this.send("typing_stop", { postId });
  }

  // 处理重连
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect(this.token).catch((error) => {
          console.error("重连失败:", error);
        });
      }, this.reconnectInterval);
    } else {
      console.error("达到最大重连次数，停止重连");
    }
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// 使用示例
const socketClient = new CommunitySocketClient();

// 连接WebSocket
socketClient
  .connect("your-jwt-token")
  .then(() => {
    console.log("WebSocket连接成功");

    // 加入帖子房间
    socketClient.joinRoom("post_123");

    // 监听实时点赞
    socketClient.on("post_liked", (data) => {
      console.log("收到点赞通知:", data);
      // 更新UI
    });

    // 监听实时评论
    socketClient.on("post_commented", (data) => {
      console.log("收到评论通知:", data);
      // 更新UI
    });

    // 监听用户在线状态
    socketClient.on("user_online", (data) => {
      console.log("用户上线:", data);
    });

    socketClient.on("user_offline", (data) => {
      console.log("用户下线:", data);
    });
  })
  .catch((error) => {
    console.error("WebSocket连接失败:", error);
  });

module.exports = CommunitySocketClient;
