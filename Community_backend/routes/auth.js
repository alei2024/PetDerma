const express = require("express");
const router = express.Router();
const {
  wechatLogin,
  phoneLogin,
  getUserInfo,
  updateUserInfo,
  updateUserSettings,
  addPet,
  updatePet,
  deletePet,
  refreshToken,
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

// 微信登录
router.post("/wechat-login", wechatLogin);

// 手机号登录
router.post("/phone-login", phoneLogin);

// 开发环境：快速获取测试token
router.get("/dev-token", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "仅开发环境可用" });
  }

  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    { userId: "507f1f77bcf86cd799439011" }, // 使用有效的ObjectId格式
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "7d" }
  );

  res.json({
    success: true,
    token,
    user: {
      id: "507f1f77bcf86cd799439011", // 使用有效的ObjectId格式
      nickName: "测试用户",
      avatar: "/uploads/user_default.png",
    },
  });
});

// 刷新Token
router.post("/refresh-token", authenticateToken, refreshToken);

// 获取用户信息
router.get("/user-info", authenticateToken, getUserInfo);

// 更新用户信息
router.put("/user-info", authenticateToken, updateUserInfo);

// 更新用户设置
router.put("/user-settings", authenticateToken, updateUserSettings);

// 宠物管理
router.post("/pets", authenticateToken, addPet);
router.put("/pets/:petId", authenticateToken, updatePet);
router.delete("/pets/:petId", authenticateToken, deletePet);

module.exports = router;
