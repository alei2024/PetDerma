const express = require("express");
const path = require("path");
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
const doctorRoutes = require("./routes/doctor");

// 导入中间件
const { handleUploadError } = require("./middleware/upload");

const app = express();

/* ------------------------------------------------------------------
 ✅ 把 body 解析中间件提前到所有中间件之前
------------------------------------------------------------------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 临时调试日志（可在部署后删掉）
app.use((req, res, next) => {
  if (req.method === "POST" && req.originalUrl.includes("/api/auth/phone-password-login")) {
    console.log("🟢 收到登录请求, Content-Type:", req.headers["content-type"]);
  }
  next();
});

/* ------------------------------------------------------------------
 ✅ 连接数据库
------------------------------------------------------------------- */
connectDB();

/* ------------------------------------------------------------------
 ✅ 清理旧索引（原样保留）
------------------------------------------------------------------- */
setTimeout(async () => {
  try {
    const Like = require("./models/Like");
    const Share = require("./models/Share");
    await Like.cleanupOldIndexes();
    await Share.cleanupOldIndexes();
  } catch (error) {
    console.error("索引清理失败:", error);
  }
}, 2000);

/* ------------------------------------------------------------------
 ✅ 安全、CORS、日志、限流中间件（位置保持不变）
------------------------------------------------------------------- */
app.use(helmet({ contentSecurityPolicy: false }));

app.use(
  cors({
    origin: "*", // 开发环境允许所有来源
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Type", "Content-Length"],
  })
);

app.use(morgan("combined"));

/* ------------------------------------------------------------------
 ✅ 静态资源
------------------------------------------------------------------- */
app.use(
  "/uploads",
  (req, res, next) => {
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

app.use(
  "/images",
  (req, res, next) => {
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

app.use(
  "/images_cases",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    res.header("X-Content-Type-Options", "nosniff");
    next();
  },
  express.static(path.join(__dirname, "..", "images_cases"))
);

/* ------------------------------------------------------------------
 ✅ 限流
------------------------------------------------------------------- */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  message: {
    success: false,
    message: "请求过于频繁，请稍后再试",
  },
  skip: (req) => req.path === "/health" || req.path === "/api/auth/dev-token",
});
app.use(limiter);

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 20 : 100,
  message: {
    success: false,
    message: "上传请求过于频繁，请稍后再试",
  },
});

/* ------------------------------------------------------------------
 ✅ 健康检查 & 路由注册
------------------------------------------------------------------- */
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "服务运行正常",
    timestamp: new Date().toISOString(),
  });
});

// B 端预览页面（PC 端医生工作台 + 机构端入口）
app.get("/doctor-preview", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "doctor-preview.html"));
});
app.get("/home-preview", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "home-preview.html"));
});
app.get("/tob-preview", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "tob-preview.html"));
});
app.get("/doctor-preview.css", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "doctor-preview.css"));
});
app.get("/doctor-preview.js", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "doctor-preview.js"));
});

// 诊断 API：POST 单独 inline 处理（确保使用真实用户认证 + isFavorite 默认 true）
const DiagnosisRecord = require("./models/DiagnosisRecord");
const Pet = require("./models/Pet");
const { authenticateToken } = require("./middleware/auth");

app.post("/api/diagnosis", authenticateToken, async (req, res) => {
  try {
    const {
      petId,
      petName,
      petType,
      images,
      symptomDescription,
      diagnosisResult,
    } = req.body;

    const userId = req.user.userId;

    if (!petId || !petName || !petType || !symptomDescription || !diagnosisResult) {
      return res.status(400).json({
        success: false,
        message: "缺少必填字段",
      });
    }

    const pet = await Pet.findByUserAndId(userId, petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "宠物不存在或不属于当前用户",
      });
    }

    let imageIds = [];
    if (images && images.length > 0) {
      console.log(`收到 ${images.length} 张图片，暂时跳过图片处理`);
    }

    const diagnosisRecord = new DiagnosisRecord({
      userId,
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
        predictedClass: diagnosisResult?.predictedClass || diagnosisResult?.diseaseName || "未知疾病",
        allProbabilities: diagnosisResult?.allProbabilities || [],
        imageCount: images?.length || 1
      },
      isFavorite: true
    });

    const savedRecord = await diagnosisRecord.save();
    await savedRecord.populate("images");

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

// 注意：诊断记录列表的 GET 路由在 routes/diagnosis.js

// API路由
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/upload", uploadLimiter, uploadRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/diagnosis", diagnosisRoutes);
app.use("/api/consultation", consultationRoutes);
app.use("/api/tracking", require("./routes/tracking"));
app.use("/api/hospitals", require("./routes/hospitals"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/risk", require("./routes/risk"));

// 医生/机构端 API
app.use("/api/doctor", doctorRoutes);

// 图片路由
app.use(
  "/api/images",
  (req, res, next) => {
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

/* ------------------------------------------------------------------
 ✅ 404 & 错误处理
------------------------------------------------------------------- */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "接口不存在",
  });
});

app.use((error, req, res, next) => {
  console.error("服务器错误:", error);

  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "文件大小超过限制" });
  }
  if (error.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({ success: false, message: "文件数量超过限制" });
  }
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "无效的访问令牌" });
  }
  if (error.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "访问令牌已过期" });
  }
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({
      success: false,
      message: "数据验证失败",
      errors,
    });
  }
  if (error.code === 11000) {
    return res.status(400).json({ success: false, message: "数据已存在" });
  }

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "服务器内部错误"
        : error.message,
  });
});

// 上传错误
app.use(handleUploadError);

module.exports = app;
