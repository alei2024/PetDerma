const express = require("express");
const jwt = require("jsonwebtoken");
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
  updateUserAvatar,
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "S3cReT_2025_Xyz!AbCdEfGh123456";

// 微信登录
router.post("/wechat-login", wechatLogin);

// 手机号登录
router.post("/phone-login", phoneLogin);

// 开发环境：快速获取测试token - 已禁用，请使用真实登录
// router.get("/dev-token", async (req, res) => {
//   return res.status(403).json({
//     success: false,
//     message: "测试token已禁用，请使用真实登录"
//   });
// });

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

// 宠物管理
router.post("/pets", authenticateToken, addPet);
router.put("/pets/:petId", authenticateToken, updatePet);
router.delete("/pets/:petId", authenticateToken, deletePet);

module.exports = router;
