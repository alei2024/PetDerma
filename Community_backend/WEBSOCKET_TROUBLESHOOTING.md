# WebSocket 连接问题排查指南

## 问题描述

在使用 Postman 模拟发帖子时，出现 WebSocket 连接超时错误：

```
WS connect_error: Error: timeout
```

## 解决方案总结

### 1. 修复前端连接配置

- ✅ 将 `baseUrl` 从 `http://172.28.16.1:3000` 改为 `http://localhost:3000`
- ✅ 增加连接超时时间到 20 秒
- ✅ 启用自动重连机制

### 2. 优化后端 WebSocket 配置

- ✅ 放宽 CORS 配置，允许所有来源（开发环境）
- ✅ 增加 ping 超时和连接超时时间
- ✅ 支持多种传输方式（websocket + polling）

### 3. 增强错误处理

- ✅ 添加详细的连接状态日志
- ✅ 区分不同类型的连接错误
- ✅ 提供具体的错误解决建议

## 测试结果

- ✅ 后端服务器运行正常
- ✅ WebSocket 连接测试成功
- ✅ JWT Token 认证正常
- ✅ 微信小程序模拟连接成功

## 使用说明

### 启动后端服务

```bash
cd Community_backend
npm start
```

### 测试 WebSocket 连接

```bash
# 基础连接测试
node test-websocket.js

# 微信小程序模拟测试
node test-miniprogram-websocket.js
```

### 前端配置

确保 `Front_Page/app.js` 中的配置正确：

```javascript
globalData: {
  baseUrl: "http://localhost:3000", // 本地开发
  token: "your-jwt-token-here"
}
```

## 常见问题排查

### 1. 连接超时

**症状**: `WS connect_error: Error: timeout`
**原因**: 网络连接问题或服务器未启动
**解决**:

- 检查服务器是否运行
- 确认网络连接正常
- 检查防火墙设置

### 2. 认证失败

**症状**: `WS connect_error: Error: 认证失败`
**原因**: JWT Token 无效或过期
**解决**:

- 检查 Token 是否正确
- 确认 Token 未过期
- 重新登录获取新 Token

### 3. CORS 错误

**症状**: `WS connect_error: Error: CORS`
**原因**: 跨域请求被阻止
**解决**:

- 检查服务器 CORS 配置
- 确认允许的来源域名

### 4. 连接被拒绝

**症状**: `WS connect_error: Error: ECONNREFUSED`
**原因**: 服务器未启动或端口错误
**解决**:

- 确认服务器已启动
- 检查端口是否正确
- 确认防火墙设置

## 监控工具

项目现在包含了 WebSocket 连接状态监控工具，可以：

- 实时监控连接状态
- 提供详细的错误分析
- 自动重连机制
- 事件通知系统

## 生产环境配置

在生产环境中，需要：

1. 修改 `baseUrl` 为实际的服务器地址
2. 配置正确的 CORS 策略
3. 使用 HTTPS 和 WSS 协议
4. 设置适当的超时时间

## 联系支持

如果问题仍然存在，请提供：

1. 完整的错误日志
2. 网络环境信息
3. 服务器配置信息
4. 客户端配置信息

