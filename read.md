## �� PetDerma项目GitHub推送完整指南

### 📋 需要准备的文件和配置

#### 1. **完善 .gitignore 文件**

当前的 `.gitignore` 是空的，需要添加以下内容：

```gitignore
# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 环境变量文件
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# 数据库文件
*.db
*.sqlite

# 上传的文件（可选，根据需要）
Community_backend/uploads/avatars/*
Community_backend/uploads/images/*
!Community_backend/uploads/user_default.png

# 日志文件
logs/
*.log

# 临时文件
tmp/
temp/

# 操作系统文件
.DS_Store
Thumbs.db

# IDE文件
.vscode/
.idea/
*.swp
*.swo

# 微信小程序
Front_Page/project.private.config.json

# 测试文件（可选）
Community_backend/test-*.js
Community_backend/debug-*.js
Community_backend/verify-*.js
```

#### 2. **创建环境变量配置文件**

**Community_backend/.env.example**：

```env
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/PetDerma_Community

# JWT密钥（请更改为你自己的密钥）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 服务器配置
PORT=3000
NODE_ENV=development

# 微信小程序配置（如果使用）
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret

# 文件上传配置
MAX_FILE_SIZE=2097152
UPLOAD_PATH=./uploads
```

#### 3. **更新项目根目录的 README.md**

```markdown
# 🐾 PetDerma - 宠物皮肤病智能诊疗平台

> 一个融合视觉识别、多模态诊断、结构化知识图谱与大语言模型的宠物皮肤病智能辅助诊疗平台

## 📖 项目简介

**PetDerma** 是一个为猫犬类宠物皮肤病提供**智能诊断、个性化治疗建议与健康管理**服务的平台。项目包含微信小程序前端和Node.js后端API服务。

## 🏗️ 项目结构

```

PetDerma/
├── Community_backend/          # 后端API服务
│   ├── controllers/           # 控制器
│   ├── models/               # 数据模型
│   ├── routes/               # 路由
│   ├── middleware/           # 中间件
│   ├── config/               # 配置文件
│   └── server.js             # 服务器入口
├── Front_Page/               # 微信小程序前端
│   ├── pages/                # 页面
│   ├── components/           # 组件
│   ├── utils/                # 工具函数
│   └── app.js                # 小程序入口
└── README.md                 # 项目说明

```

```

#### 4. **创建部署脚本**

**scripts/setup.sh** (Linux/macOS)：

```bash
#!/bin/bash

echo "🚀 PetDerma 项目初始化脚本"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js (>= 14.0.0)"
    exit 1
fi

# 检查MongoDB
if ! command -v mongod &> /dev/null; then
    echo "❌ 请先安装 MongoDB"
    exit 1
fi

echo "✅ 环境检查通过"

# 安装后端依赖
echo "📦 安装后端依赖..."
cd Community_backend
npm install

# 复制环境变量文件
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  请编辑 Community_backend/.env 文件配置数据库连接"
fi

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../Front_Page
npm install

echo "✅ 安装完成！"
echo "📝 下一步："
echo "1. 编辑 Community_backend/.env 配置文件"
echo "2. 编辑 Front_Page/config/environment.js 配置文件"
echo "3. 启动MongoDB服务"
echo "4. 运行 'cd Community_backend && npm run dev' 启动后端"
echo "5. 使用微信开发者工具打开 Front_Page 目录"
```

**scripts/setup.bat** (Windows)：

```batch
@echo off
echo 🚀 PetDerma 项目初始化脚本

REM 检查Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 请先安装 Node.js (>= 14.0.0)
    pause
    exit /b 1
)

echo ✅ 环境检查通过

REM 安装后端依赖
echo 📦 安装后端依赖...
cd Community_backend
call npm install

REM 复制环境变量文件
if not exist .env (
    copy .env.example .env
    echo ⚠️  请编辑 Community_backend\.env 文件配置数据库连接
)

REM 安装前端依赖
echo 📦 安装前端依赖...
cd ..\Front_Page
call npm install

echo ✅ 安装完成！
echo 📝 下一步：
echo 1. 编辑 Community_backend\.env 配置文件
echo 2. 编辑 Front_Page\config\environment.js 配置文件
echo 3. 启动MongoDB服务
echo 4. 运行 'cd Community_backend && npm run dev' 启动后端
echo 5. 使用微信开发者工具打开 Front_Page 目录
pause
```

### 🎯 推送到GitHub的步骤

由于你在询问模式下，我无法直接执行命令，请按以下步骤操作：

1. **创建上述文件**：

   - 更新 `.gitignore`
   - 创建 `Community_backend/.env.example`
   - 更新根目录 `README.md`
   - 创建 `scripts/setup.sh` 和 `scripts/setup.bat`
2. **Git操作**：

```bash
# 添加所有文件
git add .

# 提交更改
git commit -m "feat: 完善项目配置，准备GitHub发布

- 添加完整的.gitignore文件
- 创建环境变量配置模板
- 更新README.md文档
- 添加自动化安装脚本
- 优化项目结构和配置"

# 创建GitHub仓库后推送
git remote add origin https://github.com/你的用户名/PetDerma.git
git branch -M main
git push -u origin main
```

### 📋 其他人使用时需要修改的参数

1. **后端配置** (`Community_backend/.env`)：

   - `MONGODB_URI`: MongoDB连接地址
   - `JWT_SECRET`: JWT密钥
   - `PORT`: 服务器端口
2. **前端配置** (`Front_Page/config/environment.js`)：

   - `baseUrl`: 后端API地址
   - `wsUrl`: WebSocket地址
3. **微信小程序配置** (`Front_Page/project.config.json`)：

   - `appid`: 微信小程序ID

这样配置后，其他人只需要：

1. 克隆项目
2. 运行安装脚本
3. 修改配置文件中的几个参数
4. 启动服务

就能快速运行你的PetDerma项目了！

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- MongoDB >= 4.0
- 微信开发者工具

### 1. 克隆项目

```bash
git clone https://github.com/your-username/PetDerma.git
cd PetDerma
```

### 2. 后端配置

```bash
# 进入后端目录
cd Community_backend

# 安装依赖
npm install

# 复制环境变量文件并修改配置
cp .env.example .env
# 编辑 .env 文件，修改数据库连接等配置

# 启动MongoDB服务（确保MongoDB已安装并运行）
# Windows: net start MongoDB
# macOS/Linux: sudo systemctl start mongod

# 启动后端服务
npm run dev
```

### 3. 前端配置

```bash
# 进入前端目录
cd Front_Page

# 安装依赖
npm install

# 修改配置文件
# 编辑 config/environment.js，修改 baseUrl 为你的后端地址
```

### 4. 微信小程序配置

1. 打开微信开发者工具
2. 导入项目，选择 `Front_Page` 目录
3. 修改 `project.config.json` 中的 `appid` 为你的小程序ID
4. 在微信开发者工具中编译运行

## ⚙️ 配置说明

### 后端配置

**重要：** 请根据你的环境修改以下配置：

1. **数据库连接** (`Community_backend/.env`)：

   ```env
   MONGODB_URI=mongodb://localhost:27017/PetDerma_Community
   ```
2. **JWT密钥** (`Community_backend/.env`)：

   ```env
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```
3. **服务器端口** (`Community_backend/.env`)：

   ```env
   PORT=3000
   ```

### 前端配置

1. **API地址** (`Front_Page/config/environment.js`)：

   ```javascript
   const ENV = {
     development: {
       baseUrl: "http://你的IP地址:3000",  // 修改为你的后端地址
       wsUrl: "ws://你的IP地址:3000",
       debug: true,
     }
   };
   ```
2. **微信小程序ID** (`Front_Page/project.config.json`)：

   ```json
   {
     "appid": "你的微信小程序AppID"
   }
   ```

## 📱 功能特性

- 🔐 **用户认证**：支持微信登录和手机号登录
- 📝 **社区交流**：发帖、评论、点赞、收藏、分享
- 🖼️ **图片上传**：支持多图上传，自动压缩
- 👤 **用户管理**：头像上传、个人信息管理
- 💬 **实时通信**：WebSocket支持实时消息
- 🎯 **智能诊断**：宠物皮肤病图像识别（开发中）

## 🛠️ 开发命令

### 后端

```bash
npm start          # 生产环境启动
npm run dev        # 开发环境启动（热重载）
npm run init-test-user    # 初始化测试用户
npm run clear-test-posts  # 清理测试帖子
```

### 前端

```bash
# 在微信开发者工具中直接运行
# 或使用命令行工具（如果已配置）
```

## 🔧 故障排除

### 常见问题

1. **后端启动失败**：

   - 检查MongoDB是否正常运行
   - 检查端口3000是否被占用
   - 检查 `.env` 文件配置是否正确
2. **前端无法连接后端**：

   - 检查 `config/environment.js` 中的 `baseUrl` 配置
   - 确保后端服务正常运行
   - 检查网络连接和防火墙设置
3. **图片上传失败**：

   - 检查 `uploads` 目录权限
   - 确认文件大小不超过2MB
   - 检查网络连接

## 📄 API文档

详细的API文档请参考：`Community_backend/COMMUNITY_GUIDE_COMBINED.md`

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

**注意：** 本项目仅供学习和研究使用，不能替代专业的兽医诊断。
