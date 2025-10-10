// 认证辅助工具
const config = require("../config/environment");

// 获取开发环境token
function getDevToken() {
  return new Promise((resolve, reject) => {
    console.log("🔑 获取开发环境token...");

    wx.request({
      url: `${config.baseUrl}/api/auth/dev-token`,
      method: "GET",
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          console.log("✅ 获取开发token成功");

          // 设置用户信息到全局数据
          const app = getApp();
          if (res.data.user) {
            const userInfo = {
              userId: res.data.user.id,
              _id: res.data.user.id,
              id: res.data.user.id,
              nickName: res.data.user.nickName,
              avatar: res.data.user.avatar,
            };

            app.updateUserInfo(userInfo);
            console.log("✅ 开发环境用户信息已设置:", userInfo);
          }

          resolve(res.data.token);
        } else {
          console.error("❌ 获取开发token失败:", res.data);
          reject(new Error("获取token失败"));
        }
      },
      fail: (error) => {
        console.error("❌ 请求开发token失败:", error);
        reject(error);
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

// 确保有有效的token
async function ensureValidToken() {
  const app = getApp();
  let token = app.globalData.token;

  console.log("🔍 检查token有效性...");

  // 如果是测试token或无token，获取新的
  if (!token || token === "test-token") {
    console.log("需要获取新token");
    try {
      token = await getDevToken();
      app.globalData.token = token;
      console.log("✅ Token更新成功");
      return token;
    } catch (error) {
      console.error("❌ 获取token失败，使用测试模式");
      return "test-token";
    }
  }

  // 验证现有token
  const isValid = await validateToken(token);
  if (!isValid) {
    console.log("Token已失效，获取新token");
    try {
      token = await getDevToken();
      app.globalData.token = token;
      console.log("✅ Token刷新成功");
      return token;
    } catch (error) {
      console.error("❌ 刷新token失败，使用测试模式");
      return "test-token";
    }
  }

  console.log("✅ Token有效");
  return token;
}

module.exports = {
  getDevToken,
  validateToken,
  ensureValidToken,
};
