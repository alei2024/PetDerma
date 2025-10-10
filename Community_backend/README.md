# PetDerma Community Backend

## 🚀 快速启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产环境启动
npm start
```

## 📋 环境要求

- Node.js >= 14.0.0
- MongoDB >= 4.0

## ⚙️ 配置

1. 确保 MongoDB 服务正在运行
2. 默认端口：3000
3. 数据库：PetDerma_Community

## 🔧 API 端点

- `GET /health` - 健康检查
- `POST /api/auth/login` - 用户登录
- `GET /api/posts` - 获取帖子列表
- `POST /api/posts` - 创建帖子
- `POST /api/upload/image` - 图片上传

详细 API 文档请参考项目根目录的 `read.md` 文件。
