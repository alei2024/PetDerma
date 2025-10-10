# 社区系统指南（合并版）

## 概述

本项目是基于 Node.js + Express + MongoDB + WebSocket 的社区系统，面向宠物领域的发帖、评论、点赞、收藏与实时互动。本文档合并了“快速开始指南”和“简化社区系统使用指南”，提供从安装、启动到接口与数据结构的完整说明。

## 🚀 5 分钟快速开始

### 1. 安装环境

- 安装 Node.js v18+（推荐 v22）。访问 https://nodejs.org/ 下载并安装 LTS 版本。
- 安装 MongoDB Community 版，并可选安装 MongoDB Compass 图形界面。

### 2. 启动数据库

- Windows：按 Win + R 输入 services.msc，找到 MongoDB 服务并启动。
- Linux：`sudo systemctl start mongod`

### 3. 创建数据库

- 打开 MongoDB Compass，连接 `mongodb://localhost:27017`
- 创建数据库：`PetDerma_Community`
- 创建初始集合：`users`

### 4. 安装项目依赖

```bash
# 进入项目目录
cd Community_backend

# 安装主服务器依赖
npm install
```

### 5. 配置环境变量

- 复制 `config.env` 到 `.env`，并根据需要修改：

```bash
cp config.env .env
```

- 至少修改 `JWT_SECRET` 为随机字符串。

### 6. 启动系统

```bash
cd Community_backend
npm run dev
```

看到日志：`🚀 服务器运行在端口 3000` 即表示启动成功。

### 7. 测试系统

- API：访问 `http://localhost:3000/api/frontend/community/home`
- 上传：在 `Community_backend` 下创建 `uploads` 文件夹（如需上传测试）

## 环境变量示例

```env
# 服务器
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:3000

# 数据库
MONGODB_URI=mongodb://localhost:27017/PetDerma_Community

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 微信小程序（按需配置）
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret

# 本地文件存储
LOCAL_STORAGE_PATH=./uploads
LOCAL_STORAGE_URL=http://localhost:3000/uploads

# WebSocket
WEBSOCKET_PORT=3000
```

## 技术架构

```
前端 (微信小程序)
    ↓ HTTP/WebSocket
后端 (Node.js + Express)
    ↓
MongoDB (数据存储)
```

## 功能特性

- 发帖发布、编辑、删除
- 评论与回复
- 点赞、收藏（可扩展转发）
- 图片上传与本地存储
- 搜索与筛选
- 统计计数
- 实时互动（WebSocket），在线状态与通知
- 微信小程序登录（按需）

## 数据模型（摘要）

### 用户 (User)

```javascript
{
  openid: String,           // 微信openid（可选）
  phoneNumber: String,      // 手机号（可选）
  nickName: String,         // 昵称
  avatar: { url, source, key, wechatUrl },
  pets: Array,              // 宠物信息
  stats: Object,            // 统计信息
  status: String            // 用户状态
}
```

### 帖子 (Post)

```javascript
{
  authorId: ObjectId,
  title: String,
  content: String,
  images: [String],
  tags: [String],
  likeCount: Number,
  commentCount: Number,
  favoriteCount: Number,
  status: String            // published | draft | deleted
}
```

### 评论 (Comment)

```javascript
{
  postId: ObjectId,
  authorId: ObjectId,
  content: String,
  parent: ObjectId,         // 可选
  isActive: Boolean
}
```

### 点赞 (Like)

```javascript
{
  userId: ObjectId,
  postId: ObjectId,
  likedAt: Date
}
```

### 收藏 (Favorite)

```javascript
{
  userId: ObjectId,
  postId: ObjectId,
  favoritedAt: Date
}
```

## 必要索引（建议）

在 MongoDB 中创建以下索引以获得更佳性能：

```javascript
// likes
db.likes.createIndex({ userId: 1, postId: 1 }, { unique: true });

// favorites
db.favorites.createIndex({ userId: 1, postId: 1 }, { unique: true });

// shares（如启用）
db.shares.createIndex({ userId: 1, postId: 1 }, { unique: true });

// posts
db.posts.createIndex({ authorId: 1 });
db.posts.createIndex({ status: 1, createdAt: -1 });

// users
db.users.createIndex({ openid: 1 });

// comments
db.comments.createIndex({ postId: 1, isActive: 1, createdAt: -1 });
```

## API 概览

### 认证

- POST `/api/auth/wechat-login`（按需）
- GET `/api/auth/user-info`（需 `Authorization: Bearer <token>`）

### 帖子

- GET `/api/posts`
- GET `/api/posts/:id`
- POST `/api/posts`（需鉴权）
- PUT `/api/posts/:id`（需鉴权）
- DELETE `/api/posts/:id`（需鉴权）

### 互动

- POST `/api/interactions/like`（或 `/api/interactions/posts/:postId/like`）
- POST `/api/interactions/favorite`
- POST `/api/interactions/comment`
- GET `/api/interactions/comments/:postId`

### 文件上传

- POST `/api/upload/image`（FormData: file）
- POST `/api/upload/images`（FormData: files[]）

### 前端集成

- GET `/api/frontend/community/home`
- GET `/api/frontend/community/posts/:id`
- GET `/api/frontend/community/users/:userId`
- GET `/api/frontend/community/online-users`

## WebSocket 事件

### 客户端发送

- `like_post`、`comment_post`、`favorite_post`
- `join_room`、`leave_room`

### 服务端推送

- `post_liked`、`post_commented`、`post_favorited`
- `user_online`、`user_offline`
- `notification`

### 连接示例

```javascript
import { io } from "socket.io-client";

const socket = io("ws://localhost:3000", {
  auth: { token: "your-jwt-token" },
});

socket.on("post_liked", (data) => console.log(data));
```

## 启动与部署要点

- 开发环境：`npm run dev`
- 生产环境：`npm start`
- 建议：
  - 确保 MongoDB 服务已启动
  - 使用强随机的 `JWT_SECRET`
  - 生产环境使用 HTTPS
  - 定期备份数据库与上传文件

## 优势与适用场景

- 无需复杂管理后台，成本低、上手快
- 支持实时互动，体验友好
- 适用于小型社区、兴趣小组、内部论坛、学习交流等

## 注意事项

- 适合中小体量（< 10 万用户）
- 前端应做基础内容过滤
- 建议加入接口限流与内容安全检查

## 后续扩展建议

- 内容审核、用户关注、推荐算法
- 第三方云存储、消息推送
- 更多社区玩法（转发、话题、活动等）
