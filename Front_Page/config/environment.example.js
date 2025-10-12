// 环境配置模板文件
// 复制此文件为 environment.js 并修改为您的配置
const ENV = {
  development: {
    baseUrl: "http://YOUR_IP_ADDRESS:3000", // 替换为您的IP地址
    wsUrl: "ws://YOUR_IP_ADDRESS:3000",
    debug: true,
  },
  production: {
    baseUrl: "http://YOUR_PRODUCTION_URL:3000", // 替换为生产环境地址
    wsUrl: "ws://YOUR_PRODUCTION_URL:3000",
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
