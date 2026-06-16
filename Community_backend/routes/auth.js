const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const {
  wechatLogin,
  phoneLogin,
  phonePasswordLogin,
  register,
  sendVerificationCode,
  getUserInfo,
  updateUserInfo,
  updateUserSettings,
  refreshToken,
  updateUserAvatar,
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "S3cReT_2025_Xyz!AbCdEfGh123456";

// 微信登录
router.post("/wechat-login", wechatLogin);

// 手机号登录
router.post("/phone-login", phoneLogin);

// 发送验证码
router.post("/send-verification-code", sendVerificationCode);

// 用户注册
router.post("/register", register);

// 手机号密码登录
router.post("/phone-password-login", phonePasswordLogin);

// 开发环境：快速获取测试token
router.get("/dev-token", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ success: false, message: "生产环境禁用" });
  }
  try {
    // 查找或创建测试用户
    let user = await User.findOne({ phoneNumber: "13800138000" });
    if (!user) {
      user = new User({
        phoneNumber: "13800138000",
        password: "test123456",
        nickName: "测试医生",
        avatar: { url: "/images/user_default.png", source: "upload", key: "", wechatUrl: "" },
      });
      // 跳过后面的密码加密步骤。。。不对，password会自动加密
      await user.save();
      console.log("✅ 已创建测试用户: 13800138000 / test123456");
    }
    const token = jwt.sign(
      { userId: user._id, phoneNumber: user.phoneNumber },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      success: true,
      data: { token, user: { id: user._id, nickName: user.nickName, phoneNumber: user.phoneNumber } },
    });
  } catch (error) {
    console.error("dev-token error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 刷新Token
router.post("/refresh-token", authenticateToken, refreshToken);

// 获取用户信息
router.get("/user-info", authenticateToken, getUserInfo);

// 更新用户信息
router.put("/user-info", authenticateToken, updateUserInfo);

// 更新用户设置
router.put("/user-settings", authenticateToken, updateUserSettings);

// 更新用户头像
router.put("/update-avatar", authenticateToken, updateUserAvatar);


module.exports = router;
