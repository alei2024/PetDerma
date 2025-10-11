const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { uploadSingle, uploadMultiple } = require("../middleware/upload");
const {
  uploadImage,
  uploadImages,
  getImage,
  getImageBase64,
  deleteImage,
  getUserImages,
} = require("../controllers/imageController");

const router = express.Router();

// 上传单张图片
router.post("/upload", authenticateToken, uploadSingle, uploadImage);

// 批量上传图片
router.post(
  "/upload-multiple",
  authenticateToken,
  uploadMultiple,
  uploadImages
);

// OPTIONS预检请求处理
router.options("/:id", (req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  res.status(200).end();
});

// 获取图片数据（公开访问）
router.get("/:id", getImage);

// 获取图片Base64数据（备用方案）
router.get("/:id/base64", getImageBase64);

// 删除图片
router.delete("/:id", authenticateToken, deleteImage);

// 获取用户上传的图片列表
router.get("/user/list", authenticateToken, getUserImages);

module.exports = router;
