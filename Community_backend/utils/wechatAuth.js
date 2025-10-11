const axios = require("axios");

// 微信小程序配置
const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APP_ID,
  appSecret: process.env.WECHAT_APP_SECRET,
};

// 获取微信访问令牌
const getWechatAccessToken = async (code) => {
  try {
    const url = "https://api.weixin.qq.com/sns/jscode2session";
    const params = {
      appid: WECHAT_CONFIG.appId,
      secret: WECHAT_CONFIG.appSecret,
      js_code: code,
      grant_type: "authorization_code",
    };

    const response = await axios.get(url, { params });

    if (response.data.errcode) {
      throw new Error(`微信API错误: ${response.data.errmsg}`);
    }

    return {
      openid: response.data.openid,
      session_key: response.data.session_key,
      unionid: response.data.unionid,
    };
  } catch (error) {
    console.error("获取微信访问令牌错误:", error);
    throw error;
  }
};

// 获取微信用户信息
const getWechatUserInfo = async (code) => {
  try {
    // 获取访问令牌
    const tokenData = await getWechatAccessToken(code);

    // 这里需要根据你的实际需求获取用户信息
    // 微信小程序默认只能获取到openid，如果需要更多信息需要用户授权

    return {
      openid: tokenData.openid,
      unionid: tokenData.unionid,
      // 这些信息需要通过用户授权获取
      nickname: "微信用户",
      avatar: "",
      gender: 0,
      city: "",
      province: "",
      country: "",
    };
  } catch (error) {
    console.error("获取微信用户信息错误:", error);
    return null;
  }
};

// 解密微信数据（如果需要）
const decryptWechatData = (encryptedData, sessionKey, iv) => {
  try {
    const crypto = require("crypto");

    const sessionKeyBuffer = Buffer.from(sessionKey, "base64");
    const encryptedDataBuffer = Buffer.from(encryptedData, "base64");
    const ivBuffer = Buffer.from(iv, "base64");

    const decipher = crypto.createDecipheriv(
      "aes-128-cbc",
      sessionKeyBuffer,
      ivBuffer
    );
    decipher.setAutoPadding(true);

    let decrypted = decipher.update(encryptedDataBuffer, null, "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  } catch (error) {
    console.error("解密微信数据错误:", error);
    throw new Error("数据解密失败");
  }
};

// 验证微信签名
const verifyWechatSignature = (signature, timestamp, nonce, token) => {
  const crypto = require("crypto");
  const tmpArr = [token, timestamp, nonce].sort();
  const tmpStr = tmpArr.join("");
  const hash = crypto.createHash("sha1").update(tmpStr).digest("hex");
  return hash === signature;
};

module.exports = {
  getWechatAccessToken,
  getWechatUserInfo,
  decryptWechatData,
  verifyWechatSignature,
};
