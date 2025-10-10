const express = require("express");
const router = express.Router();
const {
  uploadImage,
  uploadImages,
  uploadAvatar,
  deleteFile,
} = require("../controllers/uploadController");
const { authenticateToken, optionalAuth } = require("../middleware/auth");
const {
  uploadSingle,
  uploadMultiple,
  handleUploadError,
} = require("../middleware/upload");

// 上传头像（允许未认证用户，用于注册）
router.post("/avatar", uploadSingle, optionalAuth, uploadAvatar);

// 需要认证的路由
router.use(authenticateToken);

// 上传单张图片
router.post("/image", uploadSingle, uploadImage);

// 批量上传图片
router.post("/images", uploadMultiple, uploadImages);

// 删除文件
router.delete("/file/:key", deleteFile);

// 错误处理中间件
router.use(handleUploadError);

module.exports = router;
