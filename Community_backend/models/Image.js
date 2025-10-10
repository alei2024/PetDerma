const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    // 图片数据（二进制）
    data: {
      type: Buffer,
      required: true,
    },

    // 图片元信息
    contentType: {
      type: String,
      required: true,
      enum: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    },

    // 原始文件名
    originalName: {
      type: String,
      required: true,
    },

    // 文件大小（字节）
    size: {
      type: Number,
      required: true,
    },

    // 上传者ID
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 图片用途（帖子图片、头像等）
    usage: {
      type: String,
      enum: ["post", "avatar", "other"],
      default: "post",
      index: true,
    },

    // 关联的帖子ID（如果是帖子图片）
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
imageSchema.index({ uploaderId: 1, usage: 1, createdAt: -1 });
imageSchema.index({ postId: 1 });

// 虚拟字段：图片访问URL
imageSchema.virtual("url").get(function () {
  return `/api/images/${this._id}`;
});

// 确保虚拟字段包含在JSON输出中
imageSchema.set("toJSON", { virtuals: true });
imageSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Image", imageSchema);
