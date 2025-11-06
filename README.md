# PetDerma

> 以 AI 皮肤病诊断为核心，串联宠物档案、知识科普与社区互动的一站式微信小程序方案。

## 项目简介

PetDerma 由「宠物 AI 皮肤病识别 + 社区互动 + 健康档案」三大模块组成。用户可上传猫狗皮肤照片，借助云端推理快速得到可疑病种提示，并结合社区帖子、百科内容和实时通知完成经验分享；后台同时提供宠物信息管理、健康记录、消息提醒以及 WebSocket 推送，使开发者能够快速验证或二次开发完整的宠物健康产品原型。

## 核心能力

- **AI 皮肤病智能分诊**：上传多角度图像即可获得病种置信度、风险级别与诊疗建议，并可一键写入诊断档案。
- **宠物健康档案**：集中管理宠物基础信息、体征、既往病史、医生建议及多媒体病程记录。
- **社区与知识库**：支持发帖、评论、点赞、收藏、话题标签和科普文章阅读，方便用户互助交流。
- **实时通知**：基于 Socket.IO & WebSocket，推送点赞/评论/系统提醒等消息。
- **账号与权限体系**：微信登录、游客调试口令、JWT 认证、接口限流与图像上传控制，满足最小可用安全基线。

## 技术架构

| 层级 | 技术栈 | 说明 |
| --- | --- | --- |
| 小程序前端 | 原生微信小程序 + 自研组件库 | 负责诊断流程、社区流、档案与知识库渲染；`Front_Page/` 目录可直接导入微信开发者工具。 |
| API & 推送层 | Node.js (>=14) + Express 5 + Socket.IO + Multer | `Community_backend/` 提供 REST API、文件上传、消息推送与限流。 |
| 数据层 | MongoDB (>=4.0) | 自动初始化集合与索引，脚本位于 `Community_backend/scripts/`。 |
| AI 服务 | Render 云端托管（`https://petderma.onrender.com`） | 默认复用线上推理与 WebSocket 服务，可按需切换到自建推理接口。 |

> **线上默认接口**：`https://petderma.onrender.com`  
> **线上 WebSocket**：`wss://petderma.onrender.com`  
> **静态资源**：`https://petderma.onrender.com/uploads/<filename>`

## 目录结构

```
PetDerma/
|-- Community_backend/        # Node.js API 层
|   |-- config/               # MongoDB 连接与配置
|   |-- controllers/          # 业务控制器（帖子、诊断、宠物等）
+|   |-- middleware/          # JWT、上传、限流等中间件
|   |-- models/               # Mongoose 模型
|   |-- routes/               # REST API 路由
|   |-- services/             # WebSocket、通知、诊断记录等服务
|   |-- scripts/              # 数据库初始化与迁移脚本
|   |-- utils/                # 微信登录、云存储等工具
|   |-- app.js / server.js    # 应用入口
|
|-- Front_Page/               # 微信小程序前端
|   |-- pages/                # 功能页面（诊断、社区、宠物档案等）
|   |-- components/           # 自定义组件
|   |-- config/               # `environment.js` 等环境配置
|   |-- utils/                # 网络请求、鉴权等工具
|   |-- app.js / app.json     # 小程序入口配置
|
|-- README.md                 # 项目说明（本文档）
|-- .gitignore
```

## 环境要求

- Node.js ≥ 14.0.0（推荐 18 LTS）
- MongoDB ≥ 4.0（本地或云端 Atlas 均可）
- 微信开发者工具（最新版），具备测试 AppID 或体验号
- Git、npm、Powershell/终端等基础开发工具

## 快速开始

### 1. 克隆仓库

```bash
git clone <repository-url>
cd PetDerma
```

### 2. 配置并启动后端

```bash
cd Community_backend
npm install
```

创建 `.env`（如无可直接新建），建议包含：

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/PetDerma_Community
JWT_SECRET=change-me-to-a-secure-value
WECHAT_APP_ID=your-mini-program-appid
WECHAT_APP_SECRET=your-mini-program-secret
LOCAL_STORAGE_PATH=./uploads
LOCAL_STORAGE_URL=http://localhost:3000/uploads
```

> 若无需本地部署，可直接复用线上 Render 服务（默认 `baseUrl`/`wsUrl` 已配置为线上地址），此时本地可只运行前端。

启动开发/生产模式：

```bash
npm run dev      # 开发模式，内置 nodemon
npm start        # 生产模式
```

数据库辅助脚本：

```bash
npm run check-db   # 检查 MongoDB 连接
npm run init-db    # 初始化集合与索引
npm run cleanup-users
npm run migrate-posts
```

### 3. 配置微信小程序前端

1. 打开微信开发者工具，选择「导入项目」，目录指向 `PetDerma/Front_Page`。
2. 使用自己的 AppID（或测试号）；如仅调试，可选择「无 AppID」。
3. 如需本地联调，在 `Front_Page/config/environment.js` 中将 `baseUrl`/`wsUrl` 改为本地地址（如 `http://127.0.0.1:3000` / `ws://127.0.0.1:3000`）。发布或体验版保留默认线上地址即可。
4. 编译运行即可体验诊断、社区、档案等功能。

### 4. 典型调试流程

1. 确认 MongoDB 已启动（本地实例或 Atlas）。
2. 运行 `npm run dev` 启动 API。
3. 在微信开发者工具中选择「开发版」进入对应页面，进行图像上传、社区发帖或档案编辑。
4. 可通过 `POST /api/auth/dev-token` 获取临时 token（仅限非生产环境），快速模拟登录。

## 常用 npm 脚本（后端）

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发模式启动（nodemon 热更新） |
| `npm start` | 生产模式启动 |
| `npm run check-db` | 校验 MongoDB 连接健康状态 |
| `npm run init-db` | 初始化集合、索引及基础数据 |
| `npm run cleanup-users` | 清理测试用户，仅限开发环境 |
| `npm run migrate-posts` | 示例数据迁移脚本 |

## API 与网络说明

- **健康检查**：`GET /health`
- **身份认证**：`POST /api/auth/login`、`POST /api/auth/dev-token`
- **社区**：`/api/posts`（列表、创建）、`/api/interactions`（点赞、评论、收藏、分享）
- **图像上传**：`POST /api/upload/image`（Multer + 本地/云存储，默认限制 10MB）
- **宠物档案**：`/api/pets`、`/api/diagnosis`、`/api/consultation`
- **通知推送**：`/api/notifications` + `wss(s)://...` WebSocket 通道

所有需要鉴权的接口均使用 `Authorization: Bearer <JWT>` 头部；速率限制为 **1000 次/15 分钟（开发）**、**100 次/15 分钟（生产）**，图片上传额外限制。

## 部署指引

1. 准备 Node.js 运行环境（Render / Vercel / 自托管均可），并设置 `.env`。
2. 确保 MongoDB 可被外网访问（Atlas 或自建库开放 IP 白名单）。
3. 执行 `npm install && npm run init-db`，随后 `npm start`。
4. 将 `Front_Page/config/environment.js` 中的 `baseUrl` 与 `wsUrl` 指向新的生产域名，并在微信小程序后台配置 request/socket 合法域名。
5. 如需要 CDN 或对象存储，可将 `LOCAL_STORAGE_URL` 指向对应地址，并在 `utils/cloudStorage.js` 中扩展上传策略。

## 故障排查

- **前端连不上后端**：确认 API 服务已启动、`baseUrl` 域名与端口配置正确，并在微信小程序后台添加合法域名。
- **MongoDB 连接失败**：检查 `MONGODB_URI`、账号密码及白名单；可用 `npm run check-db` 定位问题。
- **图片上传报错**：查看文件大小、格式（默认 JPEG/PNG），并确认 `uploads/` 目录具备写权限。
- **WebSocket 无推送**：排查 token 是否过期、`wsUrl` 是否使用 `wss`、以及服务器 3000 端口是否对外开放。
- **体验环境接口限流**：确认是否命中速率限制，如需压测请提升限额或拆分环境。

## 贡献与协作

欢迎通过 Issue/PR 提交 Bug、文案或新功能建议。建议在提交前：

1. 使用 `npm run check-db` 与 `npm run dev` 确认基础流程无误。
2. 在 README 中同步记录任何需开发者手动操作的变更。
3. 遵循现有目录结构与编码风格，必要时附带简要注释说明。

## 许可证

项目默认采用 [MIT License](https://opensource.org/licenses/MIT)，可自由用于学习、研究与二次开发；引用第三方模型或数据时请同时遵守其授权条款。

