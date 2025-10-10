// 原生微信小程序WebSocket封装
class NativeWebSocket {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 2000;
    this.listeners = new Map();
    this.messageQueue = [];
    this.heartbeatTimer = null;
    this.heartbeatInterval = 30000; // 30秒心跳
  }

  connect(url, options = {}) {
    const { auth = {}, timeout = 20000 } = options;

    console.log("🔌 使用原生WebSocket连接:", url);

    // 构建WebSocket URL，包含认证信息
    const wsUrl = this.buildWebSocketUrl(url, auth);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.error("❌ WebSocket连接超时");
        this.close();
        reject(new Error("连接超时"));
      }, timeout);

      this.socket = wx.connectSocket({
        url: wsUrl,
        protocols: ["websocket"],
        success: () => {
          console.log("📡 WebSocket连接请求发送成功");
        },
        fail: (error) => {
          console.error("❌ WebSocket连接请求失败:", error);
          clearTimeout(timeoutId);
          reject(error);
        },
      });

      // 连接成功
      this.socket.onOpen(() => {
        clearTimeout(timeoutId);
        console.log("✅ WebSocket连接成功");
        this.connected = true;
        this.reconnectAttempts = 0;

        // 发送队列中的消息
        this.flushMessageQueue();

        // 启动心跳
        this.startHeartbeat();

        // 触发连接事件
        this.emit("connect");

        resolve(this);
      });

      // 连接失败
      this.socket.onError((error) => {
        clearTimeout(timeoutId);
        console.error("❌ WebSocket连接错误:", error);
        this.connected = false;
        this.emit("connect_error", error);

        // 尝试重连
        this.attemptReconnect(url, options);

        reject(error);
      });

      // 连接关闭
      this.socket.onClose((res) => {
        console.log("🔌 WebSocket连接关闭:", res);
        this.connected = false;
        this.stopHeartbeat();
        this.emit("disconnect", res.reason);

        // 如果不是主动关闭，尝试重连
        if (res.code !== 1000) {
          this.attemptReconnect(url, options);
        }
      });

      // 接收消息
      this.socket.onMessage((res) => {
        try {
          const data = JSON.parse(res.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("❌ 解析WebSocket消息失败:", error, res.data);
        }
      });
    });
  }

  // 构建WebSocket URL
  buildWebSocketUrl(baseUrl, auth) {
    // 将HTTP URL转换为WebSocket URL
    let wsUrl = baseUrl.replace(/^http/, "ws");

    // 添加原生WebSocket路径
    if (!wsUrl.includes("/ws")) {
      wsUrl += "/ws";
    }

    // 添加认证信息
    if (auth.token) {
      const separator = wsUrl.includes("?") ? "&" : "?";
      wsUrl += `${separator}token=${encodeURIComponent(auth.token)}`;
    }

    return wsUrl;
  }

  // 发送消息
  emit(event, data = {}) {
    const message = JSON.stringify({
      type: "event",
      event: event,
      data: data,
      timestamp: Date.now(),
    });

    if (this.connected && this.socket) {
      this.socket.send({
        data: message,
        success: () => {
          console.log(`📤 发送事件: ${event}`, data);
        },
        fail: (error) => {
          console.error(`❌ 发送事件失败: ${event}`, error);
        },
      });
    } else {
      // 连接未建立时，将消息加入队列
      this.messageQueue.push({ event, data });
      console.log(`📦 消息已加入队列: ${event}`);
    }
  }

  // 监听事件
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // 移除事件监听
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // 触发事件
  trigger(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ 事件回调执行失败: ${event}`, error);
        }
      });
    }
  }

  // 处理接收到的消息
  handleMessage(message) {
    const { type, event, data } = message;

    if (type === "event") {
      console.log(`📨 收到事件: ${event}`, data);
      this.trigger(event, data);
    } else if (type === "pong") {
      // 心跳响应
      console.log("💓 收到心跳响应");
    }
  }

  // 发送队列中的消息
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { event, data } = this.messageQueue.shift();
      this.emit(event, data);
    }
  }

  // 启动心跳
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        this.emit("ping");
      }
    }, this.heartbeatInterval);
  }

  // 停止心跳
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // 尝试重连
  attemptReconnect(url, options) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ 达到最大重连次数，停止重连");
      this.emit("reconnect_failed");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * this.reconnectAttempts;

    console.log(`🔄 ${delay}ms后尝试第${this.reconnectAttempts}次重连...`);

    setTimeout(() => {
      this.connect(url, options)
        .then(() => {
          console.log(`✅ 第${this.reconnectAttempts}次重连成功`);
          this.emit("reconnect", this.reconnectAttempts);
        })
        .catch((error) => {
          console.error(`❌ 第${this.reconnectAttempts}次重连失败:`, error);
          this.emit("reconnect_error", error);
        });
    }, delay);
  }

  // 关闭连接
  close() {
    this.connected = false;
    this.stopHeartbeat();

    if (this.socket) {
      this.socket.close({
        code: 1000,
        reason: "主动关闭",
      });
      this.socket = null;
    }
  }
}

// 全局实例
let nativeSocket = null;

// 连接函数
function connectNativeSocket({ baseUrl, token }) {
  if (nativeSocket && nativeSocket.connected) {
    return Promise.resolve(nativeSocket);
  }

  nativeSocket = new NativeWebSocket();

  return nativeSocket.connect(baseUrl, {
    auth: { token },
    timeout: 20000,
  });
}

// 获取socket实例
function getNativeSocket() {
  return nativeSocket;
}

module.exports = {
  connectNativeSocket,
  getNativeSocket,
  NativeWebSocket,
};
