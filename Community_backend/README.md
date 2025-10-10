# PetDerma 社区交流板块后端 API

这是一个基于 Node.js + Express + MongoDB + WebSocket 的社区交流板块后端 API，支持宠物皮肤病的讨论、分享和实时互动。

## 功能特性

- 🔐 微信小程序登录认证
- 📝 帖子发布、编辑、删除
- 💬 评论和回复功能
- 👍 点赞、收藏、转发
- 🏷️ 标签系统
- 📸 图片上传和管理（本地存储）
- 🔍 搜索和筛选
- 📊 统计和计数
- ⚡ 实时互动（WebSocket）
- 👥 在线用户状态
- 📱 实时通知

## 技术栈

- **后端框架**: Express.js
- **数据库**: MongoDB + Mongoose
- **认证**: JWT
- **实时通信**: Socket.IO
- **文件上传**: Multer
- **文件存储**: 本地存储（可扩展云存储）
- **安全**: Helmet, CORS, Rate Limiting

## 项目结构

```
Community_backend/
├── config/
│   └── database.js         # MongoDB 数据库连接配置
├── controllers/
│   ├── authController.js   # 处理登录/注册逻辑
│   ├── postController.js   # 处理帖子CRUD逻辑
│   ├── interactionController.js # 处理点赞、评论等互动逻辑
│   ├── uploadController.js # 处理文件上传逻辑
│   └── frontendController.js # 前端集成接口
├── models/
│   ├── User.js            # 用户模型
│   ├── Post.js            # 帖子模型
│   ├── Comment.js         # 评论模型
│   ├── Like.js           # 点赞模型
│   ├── Favorite.js        # 收藏模型
│   └── Share.js          # 转发模型
├── routes/
│   ├── auth.js           # 认证相关路由
│   ├── posts.js          # 帖子相关路由
│   ├── interactions.js   # 互动相关路由
│   ├── upload.js         # 上传相关路由
│   └── frontend.js       # 前端集成路由
├── middleware/
│   ├── auth.js          # JWT token验证中间件
│   └── upload.js        # 文件上传配置中间件
├── services/
│   ├── socketService.js  # WebSocket实时通信服务

├── utils/
│   ├── cloudStorage.js  # 本地文件存储工具函数
│   └── wechatAuth.js    # 微信登录工具函数

│   ├── config/          # CMS配置
│   ├── src/api/         # CMS内容类型定义
│   └── package.json     # CMS依赖
├── frontend-integration/ # 前端集成示例
│   ├── socket-client.js # WebSocket客户端示例
│   └── api-client.js    # API客户端示例
├── scripts/
│   └── start-all.js     # 启动所有服务脚本
├── uploads/             # 本地文件存储目录
├── app.js              # Express应用入口文件
├── server.js           # 服务器启动文件
└── config.env          # 环境变量配置文件
```

## 快速开始

### 1. 安装依赖

```bash
cd Community_backend
npm install
```

### 2. 配置环境变量

复制 `config.env` 文件并重命名为 `.env`，然后修改其中的配置：

```bash
cp config.env .env
```

主要配置项：

- `MONGODB_URI`: MongoDB 连接字符串
- `JWT_SECRET`: JWT 密钥
- `WECHAT_APP_ID`: 微信小程序 AppID
- `WECHAT_APP_SECRET`: 微信小程序 AppSecret
- 云存储相关配置

### 3. 启动服务

```bash
# 启动所有服务（推荐）
npm run dev:all

# 或者分别启动
npm run dev                    # 启动主服务器


# 生产模式
npm start
```

服务地址：

- 主服务器：`http://localhost:3000`
- WebSocket：`ws://localhost:3000`

## API 接口文档

### 认证相关

#### 微信登录

- **POST** `/api/auth/wechat-login`
- **Body**: `{ "code": "微信授权码" }`

#### 获取用户信息

- **GET** `/api/auth/user-info`
- **Headers**: `Authorization: Bearer <token>`

### 帖子相关

#### 获取帖子列表

- **GET** `/api/posts?page=1&limit=10&tag=标签&search=关键词`

#### 获取帖子详情

- **GET** `/api/posts/:id`

#### 创建帖子

- **POST** `/api/posts`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:

```json
{
  "title": "帖子标题",
  "content": "帖子内容",
  "images": ["图片URL数组"],
  "tags": ["标签数组"]
}
```

### 互动相关

#### 点赞帖子

- **POST** `/api/interactions/posts/:postId/like`
- **Headers**: `Authorization: Bearer <token>`

#### 收藏帖子

- **POST** `/api/interactions/posts/:postId/favorite`
- **Headers**: `Authorization: Bearer <token>`

#### 转发帖子

- **POST** `/api/interactions/posts/:postId/share`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "comment": "转发附言" }`

#### 创建评论

- **POST** `/api/interactions/posts/:postId/comments`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:

```json
{
  "content": "评论内容",
  "parentId": "父评论ID（可选）",
  "replyToId": "回复用户ID（可选）"
}
```

### 文件上传

#### 上传图片

- **POST** `/api/upload/image`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `FormData` with `file` field

#### 批量上传图片

- **POST** `/api/upload/images`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `FormData` with `files` field

### 前端集成接口

#### 获取社区首页数据

- **GET** `/api/frontend/community/home?page=1&limit=10&tag=标签&search=关键词`

#### 获取帖子详情

- **GET** `/api/frontend/community/posts/:id`

#### 获取用户资料

- **GET** `/api/frontend/community/users/:userId`

#### 获取在线用户

- **GET** `/api/frontend/community/online-users`
- **Headers**: `Authorization: Bearer <token>`

### WebSocket 实时通信

#### 连接 WebSocket

```javascript
const socket = io("ws://localhost:3000", {
  auth: {
    token: "your-jwt-token",
  },
});
```

#### 事件监听

- `post_liked` - 帖子被点赞
- `post_commented` - 帖子被评论
- `post_favorited` - 帖子被收藏
- `post_shared` - 帖子被转发
- `user_online` - 用户上线
- `user_offline` - 用户下线
- `notification` - 系统通知

#### 事件发送

- `like_post` - 点赞帖子
- `comment_post` - 评论帖子
- `favorite_post` - 收藏帖子
- `share_post` - 转发帖子
- `join_room` - 加入房间
- `leave_room` - 离开房间

## 数据库模型

### User 用户模型

```javascript
{
  openid: String,           // 微信用户唯一标识
  phoneNumber: String,      // 手机号用户唯一标识
  nickName: String,         // 昵称
  avatar: {                 // 头像信息
    url: String,            // 头像URL
    source: String,         // 来源：'wechat' 或 'upload'
    key: String,            // 云存储文件路径
    wechatUrl: String       // 微信原始URL
  },
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
  createdAt: Date,
  updatedAt: Date
}
```

## 部署说明

### 1. 生产环境配置

确保在生产环境中设置正确的环境变量：

- `NODE_ENV=production`
- 使用强密码作为 `JWT_SECRET`
- 配置正确的云存储服务

### 2. 数据库索引

确保在 MongoDB 中创建了必要的索引：

```javascript
// likes 集合
db.likes.createIndex({ userId: 1, postId: 1 }, { unique: true });

// favorites 集合
db.favorites.createIndex({ userId: 1, postId: 1 }, { unique: true });

// shares 集合
db.shares.createIndex({ userId: 1, postId: 1 }, { unique: true });

// posts 集合
db.posts.createIndex({ authorId: 1 });
db.posts.createIndex({ createdAt: -1 });
```

### 3. 云存储配置

根据你使用的云存储服务，修改 `utils/cloudStorage.js` 文件中的实现。

## 注意事项

1. 确保 MongoDB 服务正在运行
2. 配置正确的微信小程序 AppID 和 AppSecret
3. 根据实际需求配置云存储服务
4. 在生产环境中使用 HTTPS
5. 定期备份数据库

## 许可证

MIT License
