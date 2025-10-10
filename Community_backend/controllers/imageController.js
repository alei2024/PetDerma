const Image = require("../models/Image");
const Post = require("../models/Post");

// 上传图片到数据库
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

    // 创建图片记录
    const image = new Image({
      data: req.file.buffer,
      contentType: req.file.mimetype,
      originalName: req.file.originalname,
      size: req.file.size,
      uploaderId: req.user.userId,
      usage: req.body.usage || "post",
    });

    await image.save();

    res.json({
      success: true,
      message: "图片上传成功",
      data: {
        id: image._id,
        url: image.url,
        size: image.size,
        contentType: image.contentType,
        originalName: image.originalName,
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

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const maxSize = 5 * 1024 * 1024;
    const uploadResults = [];

    for (const file of req.files) {
      // 检查文件类型
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `文件 ${file.originalname} 格式不支持`,
        });
      }

      // 检查文件大小
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `文件 ${file.originalname} 大小超过限制`,
        });
      }

      // 创建图片记录
      const image = new Image({
        data: file.buffer,
        contentType: file.mimetype,
        originalName: file.originalname,
        size: file.size,
        uploaderId: req.user.userId,
        usage: req.body.usage || "post",
      });

      await image.save();

      uploadResults.push({
        id: image._id,
        url: image.url,
        size: image.size,
        contentType: image.contentType,
        originalName: image.originalName,
      });
    }

    res.json({
      success: true,
      message: "图片批量上传成功",
      data: uploadResults,
    });
  } catch (error) {
    console.error("批量上传图片错误:", error);
    res.status(500).json({
      success: false,
      message: "图片批量上传失败",
    });
  }
};

// 获取图片数据 - 微信小程序兼容版本
const getImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const image = await Image.findById(imageId);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "图片不存在",
      });
    }

    // 清除所有可能冲突的响应头
    res.removeHeader("X-Powered-By");
    res.removeHeader("ETag");

    // 设置微信小程序兼容的响应头
    res.writeHead(200, {
      "Content-Type": image.contentType,
      "Content-Length": image.data.length,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
      "Cache-Control": "public, max-age=31536000",
      Pragma: "public",
      Expires: new Date(Date.now() + 31536000000).toUTCString(),
    });

    // 直接发送二进制数据
    res.end(image.data);
  } catch (error) {
    console.error("获取图片错误:", error);
    res.status(500).json({
      success: false,
      message: "获取图片失败",
    });
  }
};

// 获取图片的Base64数据 - 备用方案
const getImageBase64 = async (req, res) => {
  try {
    const imageId = req.params.id;
    const image = await Image.findById(imageId);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "图片不存在",
      });
    }

    // 转换为Base64
    const base64Data = image.data.toString("base64");
    const dataUrl = `data:${image.contentType};base64,${base64Data}`;

    res.json({
      success: true,
      data: {
        id: image._id,
        dataUrl: dataUrl,
        contentType: image.contentType,
        size: image.size,
        originalName: image.originalName,
      },
    });
  } catch (error) {
    console.error("获取图片Base64错误:", error);
    res.status(500).json({
      success: false,
      message: "获取图片Base64失败",
    });
  }
};

// 删除图片
const deleteImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const image = await Image.findById(imageId);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "图片不存在",
      });
    }

    // 检查权限（只有上传者可以删除）
    if (image.uploaderId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "无权限删除此图片",
      });
    }

    // 检查图片是否被帖子使用
    const postsUsingImage = await Post.find({ images: imageId });
    if (postsUsingImage.length > 0) {
      return res.status(400).json({
        success: false,
        message: "图片正在被帖子使用，无法删除",
      });
    }

    await Image.findByIdAndDelete(imageId);

    res.json({
      success: true,
      message: "图片删除成功",
    });
  } catch (error) {
    console.error("删除图片错误:", error);
    res.status(500).json({
      success: false,
      message: "删除图片失败",
    });
  }
};

// 获取用户上传的图片列表
const getUserImages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const usage = req.query.usage; // 可选：过滤用途

    const query = { uploaderId: userId };
    if (usage) {
      query.usage = usage;
    }

    const images = await Image.find(query)
      .select("-data") // 不返回图片数据，只返回元信息
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Image.countDocuments(query);

    res.json({
      success: true,
      data: {
        images,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("获取用户图片列表错误:", error);
    res.status(500).json({
      success: false,
      message: "获取图片列表失败",
    });
  }
};

module.exports = {
  uploadImage,
  uploadImages,
  getImage,
  getImageBase64,
  deleteImage,
  getUserImages,
};
