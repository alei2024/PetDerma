const jwt = require("jsonwebtoken");
const User = require("../models/User");

// JWT Token 验证中间件
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "访问令牌缺失",
      });
    }

    // 验证token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "S3cReT_2025_Xyz!AbCdEfGh123456"
    );

    // 检查用户是否存在
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "用户不存在",
      });
    }

    // 检查用户状态
    if (user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "用户账户已被禁用",
      });
    }

    // 将用户信息添加到请求对象
    req.user = {
      userId: user._id,
      openid: user.openid,
      phoneNumber: user.phoneNumber,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "无效的访问令牌",
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "访问令牌已过期",
      });
    } else {
      console.error("Token验证错误:", error);
      return res.status(500).json({
        success: false,
        message: "服务器内部错误",
      });
    }
  }
};

// 可选的Token验证中间件（不强制要求登录）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "S3cReT_2025_Xyz!AbCdEfGh123456"
      );
      const user = await User.findById(decoded.userId);

      if (user && user.status === "active") {
        req.user = {
          userId: user._id,
          openid: user.openid,
          phoneNumber: user.phoneNumber,
        };
      }
    }

    next();
  } catch (error) {
    // 忽略token验证错误，继续执行
    next();
  }
};

// 检查用户权限中间件
const checkPermission = (permission) => {
  return (req, res, next) => {
    // 这里可以根据需要实现权限检查逻辑
    // 例如：检查用户角色、权限等
    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  checkPermission,
};
