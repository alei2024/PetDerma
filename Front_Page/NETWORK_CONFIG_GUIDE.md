# 微信小程序网络配置指南

## 问题描述

在微信小程序中遇到 WebSocket 连接超时错误：

```
WebSocket连接错误: timeout(env: Windows,mp,1.06.2412050; lib: 3.8.10)
```

## 解决方案

### 1. 开发环境配置

#### 1.1 微信开发者工具设置

1. 打开微信开发者工具
2. 点击右上角"详情"
3. 在"本地设置"中：
   - ✅ 勾选"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"
   - ✅ 勾选"开启调试模式"

#### 1.2 网络请求配置

确保在开发环境中使用正确的配置：

```javascript
// Front_Page/app.js
globalData: {
  baseUrl: "http://localhost:3000", // 本地开发
  token: "your-jwt-token-here"
}
```

### 2. 生产环境配置

#### 2.1 服务器域名配置

1. 登录微信公众平台
2. 进入"开发" -> "开发管理" -> "开发设置"
3. 在"服务器域名"中添加：
   - request 合法域名：`https://your-domain.com`
   - socket 合法域名：`wss://your-domain.com`

#### 2.2 生产环境代码配置

```javascript
// Front_Page/config/environment.js
const ENV = {
  production: {
    baseUrl: "https://your-domain.com",
    wsUrl: "wss://your-domain.com",
    debug: false,
  },
};
```

### 3. 常见问题排查

#### 3.1 域名未配置

**错误**: `request:fail url not in domain list`
**解决**: 在微信公众平台配置合法域名

#### 3.2 HTTPS 证书问题

**错误**: `request:fail ssl handshake error`
**解决**: 确保服务器使用有效的 HTTPS 证书

#### 3.3 网络超时

**错误**: `WebSocket连接错误: timeout`
**解决**:

- 检查网络连接
- 增加超时时间
- 检查服务器状态

#### 3.4 本地开发问题

**错误**: 本地开发时连接失败
**解决**:

- 确保勾选"不校验合法域名"
- 检查本地服务器是否运行
- 使用正确的 IP 地址

### 4. 调试工具

项目已集成网络调试工具，可以：

- 检查网络状态
- 测试域名连通性
- 诊断 WebSocket 连接
- 提供详细的错误信息

### 5. 测试步骤

1. **启动后端服务器**

   ```bash
   cd Community_backend
   npm start
   ```

2. **在微信开发者工具中测试**

   - 打开项目
   - 查看控制台日志
   - 检查网络诊断结果

3. **检查连接状态**
   - 查看 WebSocket 连接日志
   - 确认认证成功
   - 测试实时功能

### 6. 最佳实践

1. **开发阶段**

   - 使用本地服务器
   - 开启调试模式
   - 不校验合法域名

2. **测试阶段**

   - 配置测试域名
   - 使用 HTTPS 协议
   - 测试所有功能

3. **生产阶段**
   - 配置正式域名
   - 使用 WSS 协议
   - 监控连接状态

### 7. 联系支持

如果问题仍然存在，请提供：

1. 微信开发者工具版本
2. 网络诊断日志
3. 服务器配置信息
4. 错误截图

## 更新日志

- 2025-09-25: 添加网络调试工具
- 2025-09-25: 优化 WebSocket 连接配置
- 2025-09-25: 增加超时时间设置

