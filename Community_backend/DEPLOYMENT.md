# PetDerma 社区系统部署指南

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐
│   微信小程序     │    │   主服务器       │
│   (前端)        │◄──►│   (Express)     │
│                 │    │   + WebSocket   │
└─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   MongoDB       │
                       │   (数据库)      │
                       └─────────────────┘
```

## ⚠️ 重要说明

**本指南将详细说明每个技术栈部署后的具体操作步骤，请按顺序完成每个部分，不要跳过任何步骤！**

## 部署步骤

### 1. 环境准备

#### 服务器要求

- Node.js >= 18.0.0 (推荐 v22)
- MongoDB >= 4.4
- 内存 >= 2GB
- 存储 >= 10GB

#### 1.1 安装 Node.js

**Windows 用户：**

1. 访问 https://nodejs.org/
2. 下载 LTS 版本（推荐 v22.x）
3. 运行安装程序，按默认设置安装
4. 打开命令提示符，输入 `node --version` 验证安装

**Linux 用户：**

```bash
# 使用 NodeSource 安装 Node.js v22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 1.2 安装 MongoDB

**Windows 用户：**

1. 访问 https://www.mongodb.com/try/download/community
2. 下载 Windows 版本
3. 运行安装程序，选择 "Complete" 安装
4. 安装 MongoDB Compass（图形界面工具）

**Linux 用户：**

```bash
# 导入 MongoDB 公钥
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# 添加 MongoDB 仓库
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 安装 MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# 启动 MongoDB 服务
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### 1.3 安装项目依赖

```bash
# 进入项目目录
cd Community_backend

# 安装主服务器依赖
npm install


```

**✅ 验证步骤：**

- 运行 `node --version` 应该显示 v18+ 版本
- 运行 `npm --version` 应该显示版本号
- 运行 `mongod --version` 应该显示 MongoDB 版本

### 2. 数据库配置

#### 2.1 启动 MongoDB 服务

**Windows 用户：**

1. 按 `Win + R`，输入 `services.msc`
2. 找到 "MongoDB" 服务，右键选择 "启动"
3. 或者打开命令提示符，输入 `net start MongoDB`

**Linux 用户：**

```bash
# 启动 MongoDB 服务
sudo systemctl start mongod

# 检查服务状态
sudo systemctl status mongod

# 设置开机自启
sudo systemctl enable mongod
```

#### 2.2 连接 MongoDB 并创建数据库

**方法一：使用 MongoDB Compass（推荐新手）**

1. 打开 MongoDB Compass
2. 连接地址：`mongodb://localhost:27017`
3. 点击 "Connect"
4. 点击 "Create Database"
5. 数据库名称：`PetDerma_Community`
6. 集合名称：`users`（先创建一个集合）

**方法二：使用命令行**

```bash
# 连接 MongoDB
mongosh

# 创建数据库
use PetDerma_Community

# 创建用户（可选，用于生产环境）
db.createUser({
  user: "petderma_user",
  pwd: "your_secure_password_here",
  roles: ["readWrite"]
})

# 退出
exit
```

#### 2.3 创建必要的索引

**重要：这些索引必须创建，否则系统无法正常工作！**

**使用 MongoDB Compass：**

1. 在 `PetDerma_Community` 数据库中
2. 创建以下集合：`likes`, `favorites`, `shares`, `posts`, `users`, `comments`
3. 对每个集合创建对应的索引（见下方命令）

**使用命令行：**

```bash
# 连接数据库
mongosh PetDerma_Community

# 创建索引（复制粘贴执行）
db.likes.createIndex({ userId: 1, postId: 1 }, { unique: true });
db.favorites.createIndex({ userId: 1, postId: 1 }, { unique: true });
db.shares.createIndex({ userId: 1, postId: 1 }, { unique: true });
db.posts.createIndex({ authorId: 1 });
db.posts.createIndex({ createdAt: -1 });
db.posts.createIndex({ status: 1, createdAt: -1 });
db.users.createIndex({ openid: 1 });
db.users.createIndex({ phoneNumber: 1 });
db.comments.createIndex({ postId: 1, status: 1, createdAt: -1 });

# 查看创建的索引
db.likes.getIndexes();
db.posts.getIndexes();
db.users.getIndexes();

# 退出
exit
```

**✅ 验证步骤：**

- 在 MongoDB Compass 中能看到 `PetDerma_Community` 数据库
- 能看到所有集合：`users`, `posts`, `comments`, `likes`, `favorites`, `shares`
- 每个集合都有对应的索引

### 3. 环境变量配置

#### 3.1 创建主服务器环境变量文件

**重要：环境变量文件包含敏感信息，请妥善保管！**

1. 在 `Community_backend` 目录下创建 `.env` 文件
2. 复制以下内容到 `.env` 文件中：

```bash
# 服务器配置
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:3000

# 数据库配置（开发环境）
MONGODB_URI=mongodb://localhost:27017/PetDerma_Community

# JWT配置（请修改为随机字符串）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345

# 微信小程序配置（需要从微信开发者平台获取）
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret

# 本地文件存储配置
LOCAL_STORAGE_PATH=./uploads
LOCAL_STORAGE_URL=http://localhost:3000/uploads

# WebSocket配置
WEBSOCKET_PORT=3000
```

#### 3.3 生成安全的密钥

**重要：不要使用示例中的密钥，请生成自己的安全密钥！**

**方法一：使用在线生成器**

1. 访问 https://generate-secret.vercel.app/32
2. 生成 4 个不同的 32 位密钥作为 `APP_KEYS`
3. 生成其他密钥

**方法二：使用命令行**

```bash
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**✅ 验证步骤：**

- 检查 `Community_backend/.env` 文件存在

### 4. 文件存储配置

#### 4.1 创建上传目录

**Windows 用户：**

1. 在 `Community_backend` 目录下创建 `uploads` 文件夹
2. 右键点击 `uploads` 文件夹 → 属性 → 安全
3. 确保当前用户有"完全控制"权限

**Linux 用户：**

```bash
# 创建上传目录
mkdir -p uploads

# 设置权限
chmod -R 755 uploads
```

#### 4.2 测试文件上传功能

1. 在 `uploads` 目录下创建一个测试文件
2. 确保目录可写

**✅ 验证步骤：**

- `uploads` 目录存在
- 可以在该目录下创建文件

### 5. 启动和测试系统

#### 5.2 更新主服务器配置

#### 5.3 启动主服务器

**新开一个命令窗口：**

```bash
# 进入主服务器目录
cd Community_backend

# 启动主服务器
npm run dev
```

**等待看到以下信息表示启动成功：**

```
🚀 服务器运行在端口 3000
📱 环境: development
🌐 访问地址: http://localhost:3000
```

#### 5.4 测试系统功能

**测试 API 接口：**

1. 打开浏览器访问：http://localhost:3000/api/frontend/community/home
2. 应该看到 JSON 格式的响应（可能为空数组，这是正常的）

**测试文件上传：**

1. 访问：http://localhost:3000/api/upload/image
2. 使用 Postman 或类似工具测试上传功能

**测试 WebSocket：**

1. 访问：http://localhost:3000
2. 应该能看到 WebSocket 连接信息

**✅ 验证步骤：**

- 主服务器在 http://localhost:3000 可以访问
- API 接口返回 JSON 响应
- 没有错误信息

#### Nginx 配置（生产环境）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 主服务器
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件
    location /uploads {
        alias /var/www/petderma/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }


}
```

### 5. 进程管理

#### 使用 PM2 管理进程

```bash
# 安装PM2
npm install -g pm2

# 创建PM2配置文件 ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'petderma-api',
      script: 'server.js',
      cwd: '/path/to/Community_backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 2,
      exec_mode: 'cluster'
    },

  ]
};

# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. 安全配置

#### 防火墙设置

```bash
# 开放必要端口
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

#### SSL 证书配置

```bash
# 使用Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 7. 监控和日志

#### 日志配置

```bash
# 创建日志目录
sudo mkdir -p /var/log/petderma
sudo chown -R www-data:www-data /var/log/petderma

# 配置日志轮转
sudo nano /etc/logrotate.d/petderma
```

#### 监控配置

```bash
# 安装监控工具
npm install -g pm2-logrotate

# 配置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 8. 备份策略

#### 数据库备份

```bash
# 创建备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --db PetDerma_Community --out /backup/mongodb/$DATE
tar -czf /backup/mongodb/$DATE.tar.gz /backup/mongodb/$DATE
rm -rf /backup/mongodb/$DATE

# 设置定时任务
crontab -e
# 每天凌晨2点备份
0 2 * * * /path/to/backup_script.sh
```

#### 文件备份

```bash
# 备份上传文件
rsync -av /var/www/petderma/uploads/ /backup/uploads/
```

### 9. 性能优化

#### MongoDB 优化

```javascript
// 在MongoDB中执行
db.posts.createIndex({ status: 1, createdAt: -1 });
db.comments.createIndex({ postId: 1, status: 1, createdAt: -1 });
db.users.createIndex({ status: 1, lastLoginAt: -1 });
```

#### Node.js 优化

```bash
# 设置环境变量
export NODE_OPTIONS="--max-old-space-size=2048"
export UV_THREADPOOL_SIZE=128
```

### 6. 故障排除和常见问题

#### 6.1 启动失败问题

**问题 1：Node.js 版本不兼容**

```
错误信息：Node.js version X.X.X is not supported
```

**解决方案：**

1. 检查 Node.js 版本：`node --version`
2. 如果版本低于 18，请升级到 v18 或更高版本
3. 推荐使用 v22 版本

**问题 2：MongoDB 连接失败**

```
错误信息：MongoDB connection failed
```

**解决方案：**

1. 检查 MongoDB 是否启动：
   - Windows: 在服务中查看 MongoDB 服务状态
   - Linux: `sudo systemctl status mongod`
2. 检查连接字符串是否正确
3. 确认数据库名称 `PetDerma_Community` 已创建

#### 6.2 运行时问题

**问题 1：API 返回 500 错误**
**解决方案：**

1. 检查服务器日志
2. 确认环境变量配置正确
3. 检查数据库连接
4. 验证 API Token 是否正确

**问题 2：文件上传失败**
**解决方案：**

1. 检查 `uploads` 目录权限
2. 确认目录存在且可写
3. 检查文件大小是否超过限制
4. 验证文件类型是否允许

**问题 3：WebSocket 连接失败**
**解决方案：**

1. 检查防火墙设置
2. 确认端口 3000 可访问
3. 检查 JWT token 有效性
4. 验证客户端连接代码

#### 6.3 数据库问题

**问题 1：索引创建失败**
**解决方案：**

1. 确保在正确的数据库中执行命令
2. 检查集合是否已创建
3. 验证索引语法是否正确

**问题 2：数据查询缓慢**
**解决方案：**

1. 检查是否创建了必要的索引
2. 使用 `explain()` 分析查询性能
3. 考虑添加复合索引

#### 6.4 权限问题

**问题 1：文件权限错误**
**解决方案：**

1. Windows: 右键文件夹 → 属性 → 安全 → 编辑权限
2. Linux: `chmod -R 755 uploads`
3. 确保当前用户有读写权限

**问题 2：API 访问被拒绝**
**解决方案：**

1. 检查 API Token 是否正确
2. 确认 Token 权限设置
3. 验证请求头格式

#### 6.5 网络问题

**问题 1：端口被占用**
**解决方案：**

1. 检查端口使用情况：
   - Windows: `netstat -ano | findstr :3000`
   - Linux: `lsof -i :3000`
2. 停止占用端口的进程
3. 或修改配置文件使用其他端口

**问题 2：跨域问题**
**解决方案：**

1. 检查 CORS 配置
2. 确认允许的域名列表
3. 验证请求头设置

#### 6.6 调试技巧

**查看详细日志：**

```bash
# 查看主服务器日志
npm run dev



# 查看 MongoDB 日志
# Windows: 查看事件查看器
# Linux: sudo journalctl -u mongod
```

**测试数据库连接：**

```bash
# 连接 MongoDB
mongosh PetDerma_Community

# 查看集合
show collections

# 查看数据
db.users.find().limit(5)
```

**测试 API 接口：**

```bash
# 使用 curl 测试
curl http://localhost:3000/api/frontend/community/home

# 使用浏览器测试
# 访问 http://localhost:3000/api/frontend/community/home
```

#### 日志查看

```bash
# 查看PM2日志
pm2 logs

# 查看特定应用日志
pm2 logs petderma-api

# 查看系统日志
sudo journalctl -u mongod
sudo tail -f /var/log/nginx/error.log
```

### 11. 更新部署

#### 代码更新

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
npm install

# 重启服务（仅主服务器）
pm2 restart petderma-api

# 检查服务状态
pm2 status
```

#### 数据库迁移

```bash
# 备份数据库
mongodump --db PetDerma_Community --out /backup/before_update

# 执行迁移脚本
node scripts/migrate.js

# 验证数据完整性
node scripts/verify.js
```

## 注意事项

1. **安全性**

   - 定期更新依赖包
   - 使用强密码
   - 启用 HTTPS
   - 配置防火墙

2. **性能**

   - 监控服务器资源使用
   - 定期清理日志文件
   - 优化数据库查询
   - 使用 CDN 加速静态资源

3. **备份**

   - 定期备份数据库
   - 备份上传文件
   - 测试备份恢复流程

4. **监控**

   - 设置服务监控
   - 配置告警通知
   - 定期检查日志

### 7. 快速检查清单

#### 部署前检查 ✅

- [ ] Node.js v18+ 已安装
- [ ] MongoDB 已安装并启动
- [ ] 项目依赖已安装 (`npm install`)
- [ ] 环境变量文件已创建 (`.env`)
- [ ] 数据库已创建 (`PetDerma_Community`)
- [ ] 必要索引已创建
- [ ] 上传目录已创建 (`uploads`)

#### 启动检查 ✅

- [ ] 主服务器启动成功 (http://localhost:3000)
- [ ] 主服务器启动成功 (http://localhost:3000)
- [ ] API 接口可访问
- [ ] 文件上传功能正常
- [ ] WebSocket 连接正常

#### 功能测试 ✅

- [ ] 创建用户功能
- [ ] 发布帖子功能
- [ ] 评论功能
- [ ] 点赞功能
- [ ] 收藏功能
- [ ] 文件上传功能
- [ ] 搜索功能
- [ ] 实时通知功能

### 8. 下一步操作

#### 开发环境完成后的操作：

1. **集成前端页面**

   - 修改前端代码连接后端 API
   - 实现用户登录功能
   - 实现帖子发布和浏览功能

2. **配置微信小程序**

   - 在微信开发者平台配置服务器域名
   - 获取真实的 AppID 和 AppSecret
   - 更新环境变量配置

3. **测试完整流程**

   - 测试用户注册登录
   - 测试帖子发布和互动
   - 测试文件上传和显示

4. **生产环境部署**

   - 购买服务器和域名
   - 配置 SSL 证书
   - 设置监控和备份

### 9. 重要提醒

⚠️ **安全提醒：**

- 生产环境必须修改所有默认密码和密钥
- 定期更新依赖包
- 启用 HTTPS
- 配置防火墙

⚠️ **性能提醒：**

- 定期清理日志文件
- 监控服务器资源使用
- 优化数据库查询
- 使用 CDN 加速静态资源

⚠️ **备份提醒：**

- 定期备份数据库
- 备份上传文件
- 测试备份恢复流程

## 联系支持

如有问题，请联系开发团队或查看项目文档。

**常见问题快速链接：**

- [前端集成示例](./frontend-integration/)
