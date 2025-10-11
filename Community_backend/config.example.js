// 配置文件示例
// 复制此文件为 config.js 并修改相应配置

module.exports = {
  // 数据库配置
  mongodb: {
    uri: "mongodb://localhost:27017/PetDerma_Community",
  },

  // JWT配置
  jwt: {
    secret: "your-super-secret-jwt-key-change-this-in-production",
    expiresIn: "7d",
  },

  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    host: "0.0.0.0",
  },

  // 文件上传配置
  upload: {
    maxFileSize: 2 * 1024 * 1024, // 2MB
    uploadPath: "./uploads",
    allowedTypes: ["image/jpeg", "image/png", "image/jpg"],
  },

  // 微信小程序配置（可选）
  wechat: {
    appId: "your-wechat-app-id",
    appSecret: "your-wechat-app-secret",
  },

  // 开发环境配置
  development: {
    debug: true,
    logLevel: "debug",
  },
};
