# PetDerma 宠物皮肤病诊断与社区交流平台

## 📋 项目概述

PetDerma 是一个集成了宠物皮肤病 AI 诊断和社区交流功能的微信小程序平台，包含：

- 🔬 **AI 诊断功能**: 基于深度学习的宠物皮肤病智能诊断
- 💬 **社区交流**: 用户可发帖、评论、点赞、收藏，分享宠物护理经验
- 🔔 **实时通知**: WebSocket 实时消息推送系统
- 👤 **用户系统**: 完整的用户注册、登录、个人资料管理
- 📚 **知识科普**: 宠物健康知识库和每日科普

## 🏗️ 项目架构

```
PetDerma/
├── Community_backend/          # Node.js 后端服务
│   ├── config/                # 数据库配置
│   ├── controllers/           # 业务逻辑控制器
│   ├── models/               # MongoDB 数据模型
│   ├── routes/               # API 路由
│   ├── services/             # WebSocket 服务
│   ├── middleware/           # 中间件
│   ├── utils/                # 工具函数
│   └── scripts/              # 数据库脚本
├── Front_Page/                # 微信小程序前端
│   ├── pages/                # 小程序页面
│   ├── components/           # 自定义组件
│   ├── config/               # 前端配置
│   ├── utils/                # 工具函数
│   └── images/               # 静态资源
└── 配置说明.md               # 本文档
```

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 14.0.0
- **MongoDB**: >= 4.0
- **微信开发者工具**: 最新版本
- **操作系统**: Windows/macOS/Linux

### 1. 克隆项目

```bash
git clone <repository-url>
cd PetDerma
```

### 2. 后端配置与启动【❗必做】

#### **（1） 启动 MongoDB 数据库服务**

根据你的系统和需求选择一种方式启动：

**方式 1：系统服务启动（适合长期运行，推荐生产环境）**

```bash
# Windows（以管理员身份运行终端）
net start MongoDB  # 若已安装为系统服务

# macOS（Homebrew 安装）
brew services start mongodb-community

# Linux（systemd 管理）
sudo systemctl start mongod
```

**方式 2：命令行直接启动（适合临时测试）**

```bash
# 最简单启动（使用默认配置，数据路径默认在 /data/db 或 MongoDB 安装目录）
mongod

# 推荐：指定自定义数据存储路径（需先确保目录存在）
# Linux/macOS
mongod --dbpath /path/to/your/database

# Windows
mongod --dbpath D:\path\to\your\database
```

#### **（2） 安装后端依赖（首次运行时执行）**

```bash
cd Community_backend  # 进入后端项目目录
npm install  # 安装依赖包
```

#### **（3） 初始化数据库（按需执行）**

```bash
# 检查数据库连接是否正常（可选，验证数据库是否启动成功）
npm run check-db

# 若需要初始化数据库结构（如创建默认表、插入初始数据）
npm run init-db
```

#### （4） 启动后端服务

```bash
# 开发模式（推荐，支持热更新）
npm run dev

# 或生产模式
npm start
```

#### （5）验证启动成功

当看到以下信息，说明数据库和后端服务均启动成功：

```plaintext
🚀 服务器运行在端口 3000
MongoDB Connected: localhost
```

### 3. 模型诊断

**启动Flask服务器**

```bash
cd Front_Page/pages/diagnosis/model
python server_example.py
```

### 4. 前端配置【❗必做】

#### 3.1 获取本机 IP 地址

**Windows:**

```cmd
ipconfig
```

查找 "无线局域网适配器 WLAN" 或 "以太网适配器" 的 IPv4 地址

**macOS/Linux:**

```bash
ifconfig | grep inet
```

例如：`192.168.1.100`

#### 3.2 配置前端文件

**步骤 1: 复制配置文件**

```bash
cd Front_Page

# 复制 app 配置文件
cp app.example.js app.js

# 复制环境配置文件
cp config/environment.example.js config/environment.js
```

**步骤 2: 修改 `Front_Page/app.js`**

找到第 12-13 行，替换 `YOUR_IP_ADDRESS` 为您的实际 IP 地址：

```javascript
// ✅ 个人配置部分 - 请修改为您的配置
baseURL: "http://192.168.1.100:3000", // 替换为您的IP地址
baseUrl: "http://192.168.1.100:3000",
```

**步骤 3: 修改 `Front_Page/config/environment.js`**

找到第 6-7 行和第 11-12 行，替换 IP 地址：

```javascript
development: {
  baseUrl: "http://192.168.1.100:3000", // 替换为您的IP地址
  wsUrl: "ws://192.168.1.100:3000",
  debug: true,
},
production: {
  baseUrl: "http://192.168.1.100:3000", // 替换为您的IP地址
  wsUrl: "ws://192.168.1.100:3000",
  debug: false,
},
```

#### 3.3 微信开发者工具配置

1. **打开微信开发者工具**
2. **导入项目**：
   - 选择 `Front_Page` 文件夹
   - AppID: 使用测试号或您的小程序 AppID
3. **项目设置**：
   - ❗**勾选 "不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"**
   - 勾选 "启用调试"

### 5. 验证配置

#### 4.1 后端验证

访问 `http://您的IP:3000/api/posts` 应该返回 JSON 数据

#### 4.2 前端验证

在微信开发者工具中：

1. 进入"社区"页面
2. 检查控制台是否有网络错误
3. 尝试发布帖子测试功能

## 🔧 详细配置说明

### 数据库配置

项目使用 MongoDB 数据库，配置文件：`Community_backend/config/database.js`

**默认配置：**

```javascript
mongodb://localhost:27017/PetDerma_Community
```

**自定义配置：**
如需修改数据库连接，可设置环境变量：

```bash
export MONGODB_URI="mongodb://your-host:27017/your-database"
```

### 端口配置

**后端端口：** 默认 3000，可通过环境变量修改：

```bash
export PORT=8080
```

### WebSocket 配置

项目支持两种 WebSocket 实现：

- **Socket.IO**: 用于复杂实时功能
- **原生 WebSocket**: 用于微信小程序兼容

配置在 `Community_backend/services/` 目录下。

### 文件上传配置

**上传限制：**

- 文件大小：2MB
- 支持格式：JPG, PNG, JPEG
- 存储方式：MongoDB GridFS

配置文件：`Community_backend/middleware/upload.js`

## 🎯 功能模块说明

### 1. 用户系统

- **注册/登录**: 支持手机号和微信登录
- **个人资料**: 头像、昵称、宠物信息管理
- **权限控制**: JWT token 认证

### 2. 社区功能

- **发帖**: 支持文字、图片、标签
- **互动**: 点赞、收藏、评论、分享
- **个人中心**: 我的发布、收藏、评论

### 3. 实时通知

- **WebSocket 连接**: 自动重连机制
- **通知类型**: 点赞、评论、收藏通知
- **消息中心**: 通知列表、已读状态

### 4. AI 诊断 (可选)

- **图像识别**: 宠物皮肤病诊断
- **结果展示**: 诊断报告和建议
- **历史记录**: 诊断历史查看

## 🛠️ 开发工具和脚本

### 后端脚本

```bash
# 检查数据库连接和数据
npm run check-db

# 清理测试数据，保留4个用户
npm run cleanup-users

# 迁移旧帖子数据
npm run migrate-posts
```

### 调试工具

**网络调试：** `Front_Page/utils/network-debug.js`

- 网络状态检测
- 请求日志记录
- 错误诊断

**WebSocket 监控：** `Front_Page/utils/websocket-monitor.js`

- 连接状态监控
- 消息收发日志

## 🚨 常见问题

### 1. 网络连接问题

**问题**: 前端无法连接后端
**解决**:

1. 确认后端服务正在运行
2. 检查 IP 地址配置是否正确
3. 确认防火墙设置
4. 检查微信开发者工具网络设置

### 2. 数据库连接失败

**问题**: MongoDB 连接错误
**解决**:

1. 确认 MongoDB 服务启动
2. 检查数据库 URI 配置
3. 验证数据库权限

### 3. 图片上传失败

**问题**: 图片无法上传或显示
**解决**:

1. 检查文件大小限制
2. 确认文件格式支持
3. 验证上传权限

### 4. WebSocket 连接问题

**问题**: 实时通知不工作
**解决**:

1. 检查 WebSocket URL 配置
2. 确认用户已登录
3. 查看浏览器控制台错误

## 📱 微信小程序特殊配置

### 1. 域名配置

在微信公众平台配置服务器域名：

- **request 合法域名**: `https://your-domain.com`
- **socket 合法域名**: `wss://your-domain.com`

### 2. 权限配置

项目需要的小程序权限：

- **网络访问**: 访问后端 API
- **位置信息**: 查找附近宠物医院 (可选)
- **相册访问**: 上传宠物照片

### 3. 版本兼容

- **基础库版本**: >= 2.10.0
- **渲染引擎**: Skyline (推荐) 或 WebView

## 🔒 安全配置

### 1. JWT 密钥

后端使用 JWT 进行身份验证，默认密钥在代码中。生产环境请设置环境变量：

```bash
export JWT_SECRET="your-super-secret-key"
```

### 2. CORS 配置

后端已配置 CORS 允许跨域访问，生产环境请限制域名：

```javascript
// Community_backend/app.js
app.use(
  cors({
    origin: ["https://your-domain.com"],
  })
);
```

### 3. 速率限制

已配置 API 访问频率限制：

- **通用接口**: 100 次/15 分钟
- **上传接口**: 10 次/15 分钟

## 📊 性能优化

### 1. 数据库索引

项目已配置必要的数据库索引，提升查询性能。

### 2. 图片优化

- **压缩**: 自动压缩上传图片
- **缓存**: 图片 URL 缓存机制
- **懒加载**: 列表页面图片懒加载

### 3. 网络优化

- **请求重试**: 自动重试机制
- **连接池**: 数据库连接复用
- **WebSocket**: 长连接减少握手开销

## 📝 部署说明

### 开发环境

- 本地 MongoDB
- Node.js 开发服务器
- 微信开发者工具

### 生产环境

- 云数据库 (MongoDB Atlas 等)
- 云服务器 (阿里云、腾讯云等)
- HTTPS 证书配置
- 域名备案

