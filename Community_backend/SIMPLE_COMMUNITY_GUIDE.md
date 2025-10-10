# PetDerma 社区功能简化版

## 功能概述

这是一个简化版的宠物社区功能，只保留核心的社交互动功能：

- ✅ 发布帖子
- ✅ 点赞帖子
- ✅ 收藏帖子
- ✅ 评论帖子
- ✅ 转发帖子
- ✅ WebSocket 实时通知

## 技术栈

### 后端

- **框架**: Express.js
- **数据库**: MongoDB + Mongoose
- **认证**: JWT Token
- **实时通信**: Socket.IO
- **文件上传**: Multer (本地存储)

### 前端

- **平台**: 微信小程序
- **实时通信**: Socket.IO Client
- **状态管理**: 本地存储

## 快速开始

### 1. 启动后端服务

```bash
cd Community_backend
npm install
npm start
```

服务将运行在: `http://localhost:3000`

### 2. 配置微信开发者工具

1. 打开微信开发者工具
2. 点击"详情" -> "本地设置"
3. ✅ 勾选"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"
4. ✅ 勾选"开启调试模式"

### 3. 启动小程序

在微信开发者工具中打开 `Front_Page` 目录

## API 接口

### 帖子相关

- `GET /api/posts` - 获取帖子列表
- `GET /api/posts/:id` - 获取帖子详情
- `POST /api/posts` - 创建帖子 (需要认证)

### 互动相关

- `POST /api/interactions/posts/:postId/like` - 点赞/取消点赞
- `POST /api/interactions/posts/:postId/favorite` - 收藏/取消收藏
- `POST /api/interactions/posts/:postId/share` - 转发帖子
- `POST /api/interactions/posts/:postId/comments` - 创建评论
- `GET /api/interactions/posts/:postId/comments` - 获取评论列表

### 认证相关

- `POST /api/auth/wechat-login` - 微信登录

### 文件上传

- `POST /api/upload/image` - 上传单张图片
- `POST /api/upload/images` - 批量上传图片

## 数据模型

### User 用户模型

```javascript
{
  openid: String,           // 微信用户标识
  nickName: String,         // 昵称
  avatar: {                 // 头像信息
    url: String,
    source: String,         // 'wechat' 或 'upload'
  },
  status: String,           // 用户状态: 'active', 'banned', 'deleted'
  createdAt: Date,
  updatedAt: Date
}
```

### Post 帖子模型

```javascript
{
  authorId: ObjectId,       // 作者ID
  title: String,            // 标题
  content: String,          // 内容
  images: [String],         // 图片URL数组
  tags: [String],           // 标签数组
  likeCount: Number,        // 点赞数
  commentCount: Number,     // 评论数
  favoriteCount: Number,    // 收藏数
  shareCount: Number,       // 转发数
  status: String,           // 'published', 'deleted'
  createdAt: Date,
  updatedAt: Date
}
```

### Comment 评论模型

```javascript
{
  postId: ObjectId,         // 帖子ID
  authorId: ObjectId,       // 作者ID
  content: String,          // 评论内容
  parent: ObjectId,         // 父评论ID (可选)
  replyTo: ObjectId,        // 回复用户ID (可选)
  status: String,           // 'active', 'deleted'
  createdAt: Date,
  updatedAt: Date
}
```

## WebSocket 事件

### 客户端监听事件

- `post_liked` - 帖子被点赞
- `post_favorited` - 帖子被收藏
- `post_commented` - 帖子被评论
- `post_shared` - 帖子被转发
- `user_online` - 用户上线
- `user_offline` - 用户下线

### 客户端发送事件

- `like_post` - 点赞帖子
- `favorite_post` - 收藏帖子
- `comment_post` - 评论帖子
- `share_post` - 转发帖子

## 本地开发环境

### 环境变量配置

创建 `.env` 文件：

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/petderma_community
JWT_SECRET=your-secret-key
```

### MongoDB 数据库

确保 MongoDB 服务正在运行：

```bash
# 启动MongoDB (根据你的安装方式)
mongod
# 或
brew services start mongodb-community
```

## 项目结构

```
Community_backend/
├── config/
│   └── database.js         # 数据库连接配置
├── controllers/
│   ├── authController.js   # 认证控制器
│   ├── postController.js   # 帖子控制器
│   └── interactionController.js # 互动控制器
├── models/
│   ├── User.js            # 用户模型
│   ├── Post.js            # 帖子模型
│   ├── Comment.js         # 评论模型
│   ├── Like.js           # 点赞模型
│   ├── Favorite.js        # 收藏模型
│   └── Share.js          # 转发模型
├── routes/
│   ├── auth.js           # 认证路由
│   ├── posts.js          # 帖子路由
│   ├── interactions.js   # 互动路由
│   └── upload.js         # 上传路由
├── services/
│   └── socketService.js  # WebSocket服务
├── middleware/
│   ├── auth.js          # JWT认证中间件
│   └── upload.js        # 文件上传中间件
├── uploads/             # 本地文件存储目录
├── app.js              # Express应用配置
├── server.js           # 服务器启动文件
└── package.json        # 依赖配置

Front_Page/
├── pages/community/
│   ├── community.*      # 社区首页
│   ├── detail/         # 帖子详情页
│   └── post/           # 发布帖子页
├── utils/
│   └── socket.js       # WebSocket客户端
├── config/
│   └── environment.js  # 环境配置
└── app.js             # 小程序入口
```

## 测试功能

1. **发布帖子**: 在社区页面点击发布按钮
2. **点赞功能**: 点击帖子的点赞按钮，实时更新点赞数
3. **收藏功能**: 点击收藏按钮，实时更新收藏数
4. **评论功能**: 在帖子详情页添加评论
5. **转发功能**: 点击转发按钮，实时更新转发数
6. **实时通知**: 多个用户同时操作时，可以看到实时更新

## 注意事项

1. **本地开发**: 确保 MongoDB 服务正在运行
2. **微信开发者工具**: 必须开启调试模式和不校验域名
3. **JWT Token**: 已在 app.js 中硬编码测试 token，生产环境需要实现完整的登录流程
4. **文件存储**: 当前使用本地存储，生产环境建议使用云存储服务
5. **数据库**: 使用本地 MongoDB，生产环境建议使用云数据库

## 故障排查

### 常见问题

1. **WebSocket 连接失败**

   - 检查后端服务是否运行
   - 确认微信开发者工具已开启调试模式

2. **API 请求失败**

   - 检查网络连接
   - 确认后端服务地址配置正确

3. **MongoDB 连接失败**

   - 确认 MongoDB 服务正在运行
   - 检查数据库连接字符串

4. **图片上传失败**
   - 检查 uploads 目录是否存在
   - 确认文件大小不超过限制

## 扩展功能

如需添加更多功能，可以考虑：

- 用户关注/粉丝系统
- 帖子分类和标签管理
- 图片压缩和云存储
- 消息推送服务
- 内容审核机制
- 数据统计和分析

---

这个简化版本专注于核心的社区互动功能，为后续的 AI 诊断功能集成提供了稳定的基础。
