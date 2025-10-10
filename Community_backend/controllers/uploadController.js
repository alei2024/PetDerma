const { uploadToCloudStorage } = require("../utils/cloudStorage");

// 上传图片
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "请选择要上传的图片",
      });
    }

    // 检查文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "只支持 JPEG、PNG、GIF、WebP 格式的图片",
      });
    }

    // 检查文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "图片大小不能超过 5MB",
      });
    }

    // 上传到云存储
    const result = await uploadToCloudStorage(req.file, "images");

    res.json({
      success: true,
      message: "图片上传成功",
      data: {
        url: result.url,
        key: result.key,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error("上传图片错误:", error);
    res.status(500).json({
      success: false,
      message: "图片上传失败",
    });
  }
};

// 批量上传图片
const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "请选择要上传的图片",
      });
    }

    // 检查文件数量
    if (req.files.length > 9) {
      return res.status(400).json({
        success: false,
        message: "最多只能上传 9 张图片",
      });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const maxSize = 5 * 1024 * 1024;

    // 验证所有文件
    for (const file of req.files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "只支持 JPEG、PNG、GIF、WebP 格式的图片",
        });
      }
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: "图片大小不能超过 5MB",
        });
      }
    }

    // 批量上传
    const uploadPromises = req.files.map((file) =>
      uploadToCloudStorage(file, "images")
    );
    const results = await Promise.all(uploadPromises);

    res.json({
      success: true,
      message: "图片批量上传成功",
      data: results.map((result) => ({
        url: result.url,
        key: result.key,
        size: result.size,
        mimetype: result.mimetype,
      })),
    });
  } catch (error) {
    console.error("批量上传图片错误:", error);
    res.status(500).json({
      success: false,
      message: "图片批量上传失败",
    });
  }
};

// 上传头像
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "请选择要上传的头像",
      });
    }

    // 检查文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "只支持 JPEG、PNG、GIF、WebP 格式的图片",
      });
    }

    // 检查文件大小 (2MB)
    const maxSize = 2 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "头像大小不能超过 2MB",
      });
    }

    // 使用Image模型存储到MongoDB
    const Image = require("../models/Image");

    // 获取上传者ID（如果有认证）
    const uploaderId = req.user?.userId || "507f1f77bcf86cd799439011"; // 默认用户ID

    const image = new Image({
      data: req.file.buffer,
      contentType: req.file.mimetype,
      originalName: req.file.originalname || "avatar.png",
      size: req.file.size,
      uploaderId: uploaderId,
      usage: "avatar",
    });

    await image.save();

    res.json({
      success: true,
      message: "头像上传成功",
      data: {
        url: `/api/images/${image._id}`,
        source: "upload",
        key: image._id.toString(),
        wechatUrl: "",
        // 兼容旧格式
        size: req.file.size,
        mimetype: req.file.mimetype,
        imageId: image._id,
      },
    });
  } catch (error) {
    console.error("上传头像错误:", error);
    res.status(500).json({
      success: false,
      message: "头像上传失败",
    });
  }
};

// 删除文件
const deleteFile = async (req, res) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "缺少文件标识",
      });
    }

    // 从云存储删除文件
    const { deleteFromCloudStorage } = require("../utils/cloudStorage");
    await deleteFromCloudStorage(key);

    res.json({
      success: true,
      message: "文件删除成功",
    });
  } catch (error) {
    console.error("删除文件错误:", error);
    res.status(500).json({
      success: false,
      message: "文件删除失败",
    });
  }
};

module.exports = {
  uploadImage,
  uploadImages,
  uploadAvatar,
  deleteFile,
};
