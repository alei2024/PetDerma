const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// 导入数据库连接
const connectDB = require("./config/database");

// 导入路由
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const interactionRoutes = require("./routes/interactions");
const uploadRoutes = require("./routes/upload");
const imageRoutes = require("./routes/images");
const petRoutes = require("./routes/pets");
const healthRoutes = require("./routes/health");
const diagnosisRoutes = require("./routes/diagnosis");
const consultationRoutes = require("./routes/consultation");

// 导入中间件
const { handleUploadError } = require("./middleware/upload");

const app = express();

// 连接数据库
connectDB();

// 清理旧索引
setTimeout(async () => {
  try {
    const Like = require("./models/Like");
    const Share = require("./models/Share");
    await Like.cleanupOldIndexes();
    await Share.cleanupOldIndexes();
  } catch (error) {
    console.error("索引清理失败:", error);
  }
}, 2000); // 等待2秒确保数据库连接完成

// 安全中间件
app.use(helmet());

// CORS配置 - 微信小程序兼容
app.use(
  cors({
    origin: "*", // 允许所有来源（开发环境）
    credentials: false, // 图片资源不需要凭证
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Type", "Content-Length"],
  })
);

// 请求日志
app.use(morgan("combined"));

// 请求体解析
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 静态文件服务（用于本地文件存储）
app.use(
  "/uploads",
  (req, res, next) => {
    // 为静态文件添加CORS头
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
    res.header("X-Content-Type-Options", "nosniff");
    next();
  },
  express.static("uploads")
);

// 静态文件服务 - 处理前端资源文件（默认头像等）
app.use(
  "/images",
  (req, res, next) => {
    // 为前端图片资源添加CORS头
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
    res.header("X-Content-Type-Options", "nosniff");
    next();
  },
  express.static("uploads") // 将/images路径映射到uploads目录
);

// 限流中间件 - 开发环境放宽限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // 开发环境1000次，生产环境100次
  message: {
    success: false,
    message: "请求过于频繁，请稍后再试",
  },
  skip: (req) => {
    // 跳过健康检查和开发token请求的限制
    return req.path === "/health" || req.path === "/api/auth/dev-token";
  },
});
app.use(limiter);

// 上传文件限流 - 开发环境放宽限制
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.NODE_ENV === "production" ? 20 : 100, // 开发环境100次，生产环境20次
  message: {
    success: false,
    message: "上传请求过于频繁，请稍后再试",
  },
});

// 健康检查
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "服务运行正常",
    timestamp: new Date().toISOString(),
  });
});

// 诊断API（使用数据库和正确的用户认证）
const DiagnosisRecord = require("./models/DiagnosisRecord");
const Pet = require("./models/Pet");
const mongoose = require("mongoose");
const { authenticateToken } = require("./middleware/auth");

// 创建诊断记录（使用正确的用户认证）
app.post("/api/diagnosis", authenticateToken, async (req, res) => {
  try {
    console.log("创建诊断记录请求");
    
    const {
      petId,
      petName,
      petType,
      images,
      symptomDescription,
      diagnosisResult,
      isFavorite, // 明确提取isFavorite字段，防止前端传递
    } = req.body;

    const userId = req.user.userId; // 使用认证中间件提供的真实用户ID

    // 调试日志：检查isFavorite字段
    console.log("请求体中的isFavorite:", isFavorite);
    console.log("强制设置isFavorite为true");

    // 验证必填字段
    if (!petId || !petName || !petType || !symptomDescription || !diagnosisResult) {
      return res.status(400).json({
        success: false,
        message: "缺少必填字段",
      });
    }

    // 验证宠物是否属于当前用户
    const pet = await Pet.findByUserAndId(userId, petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "宠物不存在或不属于当前用户",
      });
    }

    // 处理图片上传（简化版本，暂时跳过图片处理）
    let imageIds = [];
    if (images && images.length > 0) {
      console.log(`收到 ${images.length} 张图片，暂时跳过图片处理`);
      // 暂时不处理图片，直接创建诊断记录
    }

    // 创建诊断记录
    const diagnosisRecord = new DiagnosisRecord({
      userId, // 使用真实的用户ID
      petId,
      petName,
      petType,
      images: imageIds,
      symptomDescription,
      diagnosisResult: {
        diseaseName: diagnosisResult?.diseaseName || "未知疾病",
        confidence: diagnosisResult?.confidence || 80,
        severity: diagnosisResult?.severity || 3,
        description: diagnosisResult?.description || "诊断结果描述",
        suggestions: {
          homeAdvice: diagnosisResult?.homeAdvice || diagnosisResult?.suggestions?.homeAdvice || ["保持清洁"],
          medicalAdvice: diagnosisResult?.medicalAdvice || diagnosisResult?.suggestions?.medicalAdvice || ["建议就医"],
          preventAdvice: diagnosisResult?.preventAdvice || diagnosisResult?.suggestions?.preventAdvice || ["注意预防"]
        },
        warning: diagnosisResult?.warning || "此结果仅供参考，请以专业兽医诊断为准。",
        // 保存分类模型的详细预测信息
        predictedClass: diagnosisResult?.predictedClass || diagnosisResult?.diseaseName || "未知疾病",
        allProbabilities: diagnosisResult?.allProbabilities || [],
        imageCount: images?.length || 1
      },
      isFavorite: true // 修复：新创建的记录默认被收藏
    });

    const savedRecord = await diagnosisRecord.save();
    await savedRecord.populate("images");
    console.log("诊断记录已保存:", savedRecord._id);
    console.log("保存的记录isFavorite值:", savedRecord.isFavorite);

    res.status(200).json({
      success: true,
      message: "诊断记录创建成功",
      data: savedRecord
    });
  } catch (error) {
    console.error("创建诊断记录失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
      error: error.message
    });
  }
});

// 注意：诊断记录列表的GET路由已移至 routes/diagnosis.js 中
// 这里不再需要重复定义，避免覆盖正确的用户认证逻辑

// API路由
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/upload", uploadLimiter, uploadRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/diagnosis", diagnosisRoutes);
app.use("/api/consultation", consultationRoutes);

// 图片路由 - 设置特殊的响应头并注册路由
app.use(
  "/api/images",
  (req, res, next) => {
    // 为图片请求设置特殊的响应头
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
      "X-Content-Type-Options": "nosniff",
    });
    next();
  },
  imageRoutes
);
app.use("/api/notifications", require("./routes/notifications"));

// 404处理（Express v5 兼容：使用无路径兜底中间件）
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "接口不存在",
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error("服务器错误:", error);

  // 处理上传错误
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "文件大小超过限制",
    });
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      message: "文件数量超过限制",
    });
  }

  // 处理JWT错误
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "无效的访问令牌",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "访问令牌已过期",
    });
  }

  // 处理MongoDB错误
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({
      success: false,
      message: "数据验证失败",
      errors: errors,
    });
  }

  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "数据已存在",
    });
  }

  // 默认错误处理
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production" ? "服务器内部错误" : error.message,
  });
});

// 处理上传错误
app.use(handleUploadError);

module.exports = app;
