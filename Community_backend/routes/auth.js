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
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");
const User = require("../models/User");

const JWT_SECRET =
  process.env.JWT_SECRET || "S3cReT_2025_Xyz!AbCdEfGh123456";

// 微信登录
router.post("/wechat-login", wechatLogin);

// 手机号登录
router.post("/phone-login", phoneLogin);

// 开发环境：快速获取测试token
router.get("/dev-token", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "仅开发环境可用" });
  }

  try {
    const defaultUserId = "507f1f77bcf86cd799439011";
    let user = await User.findById(defaultUserId);

    if (!user) {
      user = new User({
        _id: defaultUserId,
        nickName: "测试用户",
        avatar: {
          url: "/uploads/user_default.png",
          source: "upload",
          key: "",
          wechatUrl: "",
        },
        status: "active",
      });
      await user.save();
    } else if (user.status !== "active") {
      user.status = "active";
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        nickName: user.nickName,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("获取开发 token 失败:", error);
    res.status(500).json({
      success: false,
      message: "获取开发 token 失败",
    });
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

// 宠物管理
router.post("/pets", authenticateToken, addPet);
router.put("/pets/:petId", authenticateToken, updatePet);
router.delete("/pets/:petId", authenticateToken, deletePet);

module.exports = router;
