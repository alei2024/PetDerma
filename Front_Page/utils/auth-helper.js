// 认证辅助工具
const config = require("../config/environment");

// 检查用户是否已登录（从存储中获取）
function checkStoredLogin() {
  try {
    const token = wx.getStorageSync("token");
    const userInfo = wx.getStorageSync("userInfo");

    if (token && userInfo && token !== "test-token" && token.length > 10) {
      const app = getApp();
      app.globalData.token = token;
      app.globalData.userInfo = userInfo;
      app.globalData.hasLogin = true;

      console.log("✅ 从存储中恢复登录状态");
      return { token, userInfo };
    }

    return null;
  } catch (error) {
    console.error("❌ 检查存储登录状态失败:", error);
    return null;
  }
}

// 提示用户登录
function promptLogin() {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title: "需要登录",
      content: "请先登录后再使用此功能",
      confirmText: "去登录",
      cancelText: "取消",
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: "/pages/user/user",
            success: () => {
              reject(new Error("用户选择登录"));
            },
          });
        } else {
          reject(new Error("用户取消登录"));
        }
      },
      fail: () => {
        reject(new Error("显示登录提示失败"));
      },
    });
  });
}

// 验证token是否有效
function validateToken(token) {
  return new Promise((resolve, reject) => {
    if (!token || token === "test-token") {
      resolve(false);
      return;
    }

    wx.request({
      url: `${config.baseUrl}/api/auth/user-info`,
      method: "GET",
      header: {
        Authorization: `Bearer ${token}`,
      },
      success: (res) => {
        resolve(res.statusCode === 200);
      },
      fail: () => {
        resolve(false);
      },
    });
  });
}

// 确保用户已登录
async function ensureLogin() {
  console.log("🔍 检查登录状态...");

  // 首先检查存储中的登录状态
  const storedLogin = checkStoredLogin();
  if (storedLogin) {
    // 验证token是否仍然有效
    const isValid = await validateToken(storedLogin.token);
    if (isValid) {
      console.log("✅ 用户已登录且token有效");
      return storedLogin;
    } else {
      console.log("⚠️ Token已失效，需要重新登录");
      // 清除无效的登录信息
      wx.removeStorageSync("token");
      wx.removeStorageSync("userInfo");
      const app = getApp();
      app.globalData.hasLogin = false;
      app.globalData.token = "";
      app.globalData.userInfo = null;
    }
  }

  // 如果没有有效登录，提示用户登录
  console.log("❌ 用户未登录，需要登录");
  throw new Error("需要登录");
}

module.exports = {
  checkStoredLogin,
  validateToken,
  ensureLogin,
  promptLogin,
};
