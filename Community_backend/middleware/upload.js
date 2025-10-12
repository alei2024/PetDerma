const multer = require("multer");
const path = require("path");

// 配置multer存储
const storage = multer.memoryStorage();

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("只支持图片文件"), false);
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 9, // 最多9个文件
  },
});

// 单文件上传中间件
const uploadSingle = upload.single("file");

// 头像上传中间件
const uploadAvatarMiddleware = upload.single("avatar");

// 多文件上传中间件
const uploadMultiple = upload.array("files", 9);

// 错误处理中间件
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "文件大小超过限制",
      });
    } else if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "文件数量超过限制",
      });
    } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "意外的文件字段",
      });
    }
  } else if (error.message === "只支持图片文件") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
};

module.exports = {
  uploadSingle,
  uploadAvatarMiddleware,
  uploadMultiple,
  handleUploadError,
};
