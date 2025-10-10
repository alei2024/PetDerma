# PetDerma 微信小程序前端

## 🚀 快速启动

1. 安装依赖：`npm install`
2. 修改配置：编辑 `config/environment.js` 中的后端地址
3. 使用微信开发者工具打开此目录
4. 编译运行

## ⚙️ 配置说明

### 修改后端地址

编辑 `config/environment.js`：

```javascript
const ENV = {
  development: {
    baseUrl: "http://你的IP地址:3000", // 修改为你的后端地址
    wsUrl: "ws://你的IP地址:3000",
    debug: true,
  },
};
```

### 获取 IP 地址

**Windows:**

```cmd
ipconfig
```

**macOS/Linux:**

```bash
ifconfig
```

## 📱 页面结构

- `pages/index/` - 首页
- `pages/community/` - 社区页面
- `pages/diagnosis/` - 诊断页面
- `pages/user/` - 用户中心

## 🔧 工具函数

- `utils/auth-helper.js` - 认证辅助
- `utils/image-loader.js` - 图片处理
- `utils/socket.js` - WebSocket 连接
