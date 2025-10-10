# 🐾 PetDerma - 宠物皮肤病智能诊疗平台

> 一个融合视觉识别、多模态诊断、结构化知识图谱与大语言模型的宠物皮肤病智能辅助诊疗平台

## 📖 项目简介

**PetDerma** 是一个为猫犬类宠物皮肤病提供**智能诊断、个性化治疗建议与健康管理**服务的平台。项目包含微信小程序前端和 Node.js 后端 API 服务。

## 📋 环境要求

- **Node.js** >= 14.0.0
- **MongoDB** >= 4.0
- **微信开发者工具** (最新版本)
- **Git** (用于克隆项目)

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/PetDerma.git
cd PetDerma
```

> **提示**：如果你是第一次部署，建议按照以下步骤一步一步操作，确保每一步都成功后再进行下一步。

### 2. 后端配置与启动

```bash
# 进入后端目录
cd Community_backend

# 安装依赖
npm install

# 启动MongoDB服务
# Windows: 启动MongoDB服务或运行 mongod.exe
# macOS/Linux: sudo systemctl start mongod

# 启动后端服务
npm run dev
```

**成功启动后会显示：**

```
🚀 服务器运行在端口 3000
Mongoose connected to MongoDB
MongoDB Connected: localhost
```

### 3. 前端配置

```bash
# 进入前端目录
cd ../Front_Page

# 安装依赖
npm install

# 修改配置文件
# 编辑 config/environment.js，将 baseUrl 改为你的IP地址
```

**重要：修改 `Front_Page/config/environment.js`**

```javascript
const ENV = {
  development: {
    baseUrl: "http://你的IP地址:3000", // 改为你的实际IP
    wsUrl: "ws://你的IP地址:3000",
    debug: true,
  },
};
```

### 4. 微信小程序运行

1. 打开**微信开发者工具**
2. 选择**导入项目**
3. 项目目录选择 `Front_Page` 文件夹
4. AppID 可以选择**测试号**或填入你的小程序 ID
5. 点击**确定**开始编译

## ⚙️ 配置说明

### 获取你的 IP 地址

**Windows:**

```cmd
ipconfig
# 查找 "IPv4 地址" 或 "IP Address"
# 通常类似：192.168.1.100 或 172.28.16.1
```

**macOS/Linux:**

```bash
ifconfig
# 或
ip addr show
# 查找 inet 后面的地址，通常类似：192.168.1.100
```

> **重要**：请使用你的实际 IP 地址替换配置文件中的 `你的IP地址`，不要使用 `localhost` 或 `127.0.0.1`，因为微信小程序无法访问这些地址。

### 数据库说明

**好消息！** 数据库会在首次启动后端服务时自动初始化，无需手动操作。

#### 自动初始化机制

当你运行 `npm run dev` 启动后端服务时，系统会：

1. **自动连接数据库**：连接到 `PetDerma_Community` 数据库
2. **自动创建集合**：如果不存在，会创建所有必要的集合（users, posts, comments 等）
3. **自动建立索引**：为查询性能优化建立数据库索引
4. **自动清理旧索引**：清理可能存在的旧版本索引结构

#### 数据库管理命令（可选）

如果你需要手动管理数据库，可以使用以下命令：

```bash
# 检查数据库状态和统计信息
npm run check-db

# 清理测试用户数据（保留指定的4个手机号用户）
npm run cleanup-users

# 手动初始化数据库（通常不需要）
npm run init-db
```

#### 自定义数据库连接（可选）

如果需要修改数据库连接，编辑 `Community_backend/config/database.js`：

```javascript
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/PetDerma_Community", {
      // 你的数据库配置
    });
    console.log("MongoDB Connected: localhost");
  } catch (error) {
    console.error("数据库连接失败:", error);
    process.exit(1);
  }
};
```

## 🏗️ 项目结构

```
PetDerma/
├── Community_backend/          # 后端API服务
│   ├── controllers/           # 业务逻辑控制器
│   ├── models/               # 数据库模型
│   ├── routes/               # API路由
│   ├── middleware/           # 中间件
│   ├── config/               # 配置文件
│   ├── uploads/              # 文件上传目录
│   └── server.js             # 服务器入口
├── Front_Page/               # 微信小程序前端
│   ├── pages/                # 页面文件
│   ├── components/           # 组件
│   ├── utils/                # 工具函数
│   ├── config/               # 配置文件
│   └── app.js                # 小程序入口
├── scripts/                  # 部署脚本
└── README.md                 # 项目说明
```

## 📱 功能特性

- 🔐 **用户认证**：支持微信登录和手机号登录
- 📝 **社区交流**：发帖、评论、点赞、收藏、分享
- 🖼️ **图片管理**：多图上传、压缩、预览
- 👤 **用户中心**：头像上传、个人信息管理
- 💬 **实时通信**：WebSocket 支持实时消息推送
- 🎨 **响应式设计**：适配不同屏幕尺寸
- 🎯 **智能诊断**：宠物皮肤病图像识别（开发中）

## 🔧 故障排除

### 常见问题

**1. 后端启动失败**

- ✅ 检查 MongoDB 是否正常运行
- ✅ 检查端口 3000 是否被占用：`netstat -ano | findstr :3000`
- ✅ 如果端口被占用，终止进程：`taskkill /PID <PID> /F`

**2. 前端无法连接后端**

- ✅ 确认后端服务正常运行（显示"🚀 服务器运行在端口 3000"）
- ✅ 检查 `config/environment.js` 中的 IP 地址是否正确
- ✅ 确保手机/模拟器与电脑在同一网络

**3. 微信小程序编译失败**

- ✅ 确保微信开发者工具版本为最新
- ✅ 检查 `Front_Page` 目录是否完整
- ✅ 尝试删除 `miniprogram_npm` 文件夹后重新编译

**4. MongoDB 连接失败**

- ✅ 确认 MongoDB 服务已启动
- ✅ Windows 用户可尝试手动启动：
  ```cmd
  "C:\Program Files\MongoDB\Server\版本号\bin\mongod.exe" --config "C:\Program Files\MongoDB\Server\版本号\bin\mongod.cfg"
  ```
- ✅ 检查 MongoDB 是否正在监听默认端口 27017：`netstat -ano | findstr :27017`
- ✅ 如果使用 MongoDB Compass，尝试连接 `mongodb://localhost:27017` 测试连接

**5. 数据库警告信息（可忽略）**

运行时可能会看到以下警告，这些都是正常的，不影响功能：

```
Warning: Duplicate schema index found
Warning: useNewUrlParser is a deprecated option
Warning: useUnifiedTopology is a deprecated option
```

这些警告不会影响系统正常运行。

## ✅ 部署检查清单

在开始使用前，请确认以下所有项目都已完成：

### 环境检查

- [ ] Node.js 已安装（版本 >= 14.0.0）
- [ ] MongoDB 已安装并正在运行
- [ ] 微信开发者工具已安装

### 后端检查

- [ ] 后端依赖已安装（`npm install`）
- [ ] 后端服务已启动（显示"🚀 服务器运行在端口 3000"）
- [ ] 数据库连接成功（显示"MongoDB Connected: localhost"）

### 前端检查

- [ ] 前端依赖已安装（`npm install`）
- [ ] IP 地址已正确配置在 `config/environment.js` 中
- [ ] 微信开发者工具已导入 `Front_Page` 目录
- [ ] 小程序编译成功，无报错

### 网络检查

- [ ] 后端服务可访问：在浏览器打开 `http://你的IP:3000/health`
- [ ] 设备在同一局域网内

### 数据库检查（可选）

- [ ] 数据库状态正常：运行 `npm run check-db` 应显示所有集合都存在
- [ ] 数据库有基础数据：检查命令应显示用户和帖子数据

## 📱 功能测试

部署成功后，你可以测试以下功能：

- ✅ **用户登录**：点击"我的"页面进行登录
- ✅ **社区浏览**：查看帖子列表
- ✅ **发布帖子**：点击社区页面的"+"按钮
- ✅ **图片上传**：在发帖时上传图片
- ✅ **互动功能**：点赞、评论、收藏、分享

## 🛠️ 开发命令

### 后端

```bash
npm start          # 生产环境启动
npm run dev        # 开发环境启动（推荐）
```

### 前端

```bash
# 在微信开发者工具中直接运行
# 支持热重载和实时预览
```

## 📄 API 文档

主要 API 端点：

- `GET /health` - 健康检查
- `POST /api/auth/login` - 用户登录
- `GET /api/posts` - 获取帖子列表
- `POST /api/posts` - 创建帖子
- `POST /api/upload/image` - 图片上传
- `POST /api/interactions/like` - 点赞操作
- `POST /api/interactions/comment` - 评论操作
- `POST /api/interactions/favorite` - 收藏操作
- `POST /api/interactions/share` - 分享操作

## 📞 技术支持

### 快速诊断

如遇问题，请按以下顺序排查：

1. **查看控制台日志**：后端和前端的错误信息
2. **检查网络连接**：确保设备在同一局域网
3. **验证服务状态**：确认 MongoDB 和 Node.js 服务正常
4. **检查数据库**：运行 `npm run check-db` 验证数据库状态
5. **重启服务**：尝试重启后端服务和微信开发者工具

### 调试技巧

- **后端日志**：查看终端输出的服务器日志
- **前端日志**：在微信开发者工具的控制台查看错误信息
- **网络请求**：在微信开发者工具的网络面板查看 API 请求状态
- **数据库状态**：运行 `npm run check-db` 或使用 MongoDB Compass 检查

### 成功部署的标志

当你看到以下信息时，说明部署成功：

**后端启动成功**：

```
🚀 服务器运行在端口 3000
Mongoose connected to MongoDB
MongoDB Connected: localhost
```

**数据库检查正常**：

```bash
npm run check-db
# 应显示：✅ 数据库连接成功
# 所有集合都存在，有用户和帖子数据
```

**前端编译成功**：

- 微信开发者工具无报错
- 可以正常浏览社区页面
- 能够进行登录、发帖等操作

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👥 团队

- **华东师范大学数据科学与工程学院** - 本科生创新训练项目

## 📞 联系我们

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至：[your-email@example.com]

---

**注意：** 本项目仅供学习和研究使用，请勿用于商业用途。
