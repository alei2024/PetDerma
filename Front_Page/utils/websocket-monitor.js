// WebSocket连接状态监控工具
class WebSocketMonitor {
  constructor() {
    this.connectionState = "disconnected";
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000;
    this.maxReconnectInterval = 5000;
    this.listeners = new Map();
  }

  // 设置连接状态
  setConnectionState(state) {
    const previousState = this.connectionState;
    this.connectionState = state;

    console.log(`WebSocket状态变化: ${previousState} -> ${state}`);

    // 通知所有监听器
    this.notifyListeners("stateChange", {
      previousState,
      currentState: state,
      timestamp: new Date(),
    });
  }

  // 添加事件监听器
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // 移除事件监听器
  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // 通知所有监听器
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("WebSocket监听器执行错误:", error);
        }
      });
    }
  }

  // 处理连接成功
  onConnect(socket) {
    this.setConnectionState("connected");
    this.reconnectAttempts = 0;

    console.log("✅ WebSocket连接成功");
    this.notifyListeners("connect", { socket });
  }

  // 处理连接错误
  onConnectError(error) {
    this.setConnectionState("error");

    console.error("❌ WebSocket连接错误:", error.message);

    // 分析错误类型并提供建议
    const suggestions = this.analyzeError(error);
    this.notifyListeners("connectError", {
      error,
      suggestions,
      timestamp: new Date(),
    });
  }

  // 处理断开连接
  onDisconnect(reason) {
    this.setConnectionState("disconnected");

    console.log("🔌 WebSocket断开连接:", reason);
    this.notifyListeners("disconnect", { reason, timestamp: new Date() });
  }

  // 处理重连
  onReconnect(attemptNumber) {
    this.setConnectionState("reconnecting");
    this.reconnectAttempts = attemptNumber;

    console.log(`🔄 WebSocket重连中... (第${attemptNumber}次尝试)`);
    this.notifyListeners("reconnect", { attemptNumber, timestamp: new Date() });
  }

  // 处理重连成功
  onReconnectSuccess(attemptNumber) {
    this.setConnectionState("connected");
    this.reconnectAttempts = 0;

    console.log(`✅ WebSocket重连成功 (第${attemptNumber}次尝试)`);
    this.notifyListeners("reconnectSuccess", {
      attemptNumber,
      timestamp: new Date(),
    });
  }

  // 处理重连失败
  onReconnectFailed() {
    this.setConnectionState("failed");

    console.error("❌ WebSocket重连失败，已达到最大重试次数");
    this.notifyListeners("reconnectFailed", {
      maxAttempts: this.maxReconnectAttempts,
      timestamp: new Date(),
    });
  }

  // 分析错误类型并提供建议
  analyzeError(error) {
    const suggestions = [];

    if (error.message.includes("timeout")) {
      suggestions.push("检查网络连接是否稳定");
      suggestions.push("确认服务器是否正常运行");
      suggestions.push("尝试增加连接超时时间");
    } else if (
      error.message.includes("认证") ||
      error.message.includes("auth")
    ) {
      suggestions.push("检查JWT Token是否有效");
      suggestions.push("确认Token是否已过期");
      suggestions.push("尝试重新登录获取新Token");
    } else if (error.message.includes("CORS")) {
      suggestions.push("检查服务器CORS配置");
      suggestions.push("确认允许的来源域名");
    } else if (error.message.includes("ECONNREFUSED")) {
      suggestions.push("确认服务器是否已启动");
      suggestions.push("检查服务器端口是否正确");
      suggestions.push("确认防火墙设置");
    } else {
      suggestions.push("检查网络连接");
      suggestions.push("查看服务器日志");
      suggestions.push("尝试重启应用");
    }

    return suggestions;
  }

  // 获取当前状态
  getStatus() {
    return {
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      timestamp: new Date(),
    };
  }

  // 重置状态
  reset() {
    this.connectionState = "disconnected";
    this.reconnectAttempts = 0;
    this.listeners.clear();
  }
}

// 创建全局监控实例
const websocketMonitor = new WebSocketMonitor();

// 导出监控实例和类
module.exports = websocketMonitor;
module.exports.WebSocketMonitor = WebSocketMonitor;
