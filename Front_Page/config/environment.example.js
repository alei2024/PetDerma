// 环境配置模板文件
// 复制此文件为 environment.js 并修改为您的配置
const ENV = {
  development: {
    baseUrl: "https://petderma.onrender.com",
    wsUrl: "wss://petderma.onrender.com",
    amapWebKey: "YOUR_AMAP_WEB_KEY",
    amapMiniProgramKey: "YOUR_AMAP_MINIPROGRAM_KEY",
    debug: true,
  },
  production: {
    baseUrl: "https://petderma.onrender.com",
    wsUrl: "wss://petderma.onrender.com",
    amapWebKey: "YOUR_AMAP_WEB_KEY",
    amapMiniProgramKey: "YOUR_AMAP_MINIPROGRAM_KEY",
    debug: false,
  },
};

// 获取当前环境
const getCurrentEnv = () => {
  // 在微信小程序中，可以通过以下方式判断环境
  const accountInfo = wx.getAccountInfoSync();
  const envVersion = accountInfo.miniProgram.envVersion;

  switch (envVersion) {
    case "develop": // 开发版
    case "trial": // 体验版
      return "development";
    case "release": // 正式版
      return "production";
    default:
      return "development";
  }
};

// 导出当前环境配置
const currentEnv = getCurrentEnv();
const config = ENV[currentEnv];

console.log(`当前环境: ${currentEnv}`, config);

module.exports = {
  ...config,
  currentEnv,
  isDevelopment: currentEnv === "development",
  isProduction: currentEnv === "production",
};
