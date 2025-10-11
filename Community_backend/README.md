# PetDerma Community Backend

## 🚀 快速启动

```bash
# 安装依赖
npm install

# 确保 MongoDB 服务正在运行
# 启动开发服务器（会自动初始化数据库）
npm run dev

# 生产环境启动
npm start
```

## 📋 环境要求

- Node.js >= 14.0.0
- MongoDB >= 4.0

## 🗄️ 数据库

### 自动初始化

- 首次启动时会自动创建数据库和集合
- 自动建立查询索引
- 无需手动配置

### 管理命令

```bash
npm run check-db      # 检查数据库状态
npm run init-db       # 手动初始化数据库
npm run cleanup-users # 清理测试用户
```

## ⚙️ 配置

1. **数据库**：`PetDerma_Community`（自动创建）
2. **端口**：3000
3. **环境变量**：支持 `.env` 文件配置

## 🔧 主要 API 端点

- `GET /health` - 健康检查
- `POST /api/auth/login` - 用户登录
- `GET /api/posts` - 获取帖子列表
- `POST /api/posts` - 创建帖子
- `POST /api/upload/image` - 图片上传
- `POST /api/interactions/like` - 点赞操作
- `POST /api/interactions/comment` - 评论操作

## 📊 数据库结构

| 集合          | 说明     | 主要字段                              |
| ------------- | -------- | ------------------------------------- |
| users         | 用户信息 | openid, nickName, avatar, phoneNumber |
| posts         | 帖子内容 | authorId, content, tags, images       |
| comments      | 评论数据 | postId, authorId, content, parent     |
| likes         | 点赞记录 | userId, target, targetType            |
| favorites     | 收藏记录 | userId, postId                        |
| shares        | 分享记录 | userId, postId, comment               |
| images        | 图片信息 | filename, originalName, size          |
| notifications | 通知消息 | recipientId, type, title, content     |
