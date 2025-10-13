const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    // 作者信息
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 帖子内容
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // 图片引用数组（引用Image模型）
    images: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Image",
      },
    ],

    // 标签数组
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 20,
      },
    ],

    // 统计信息
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    favoriteCount: {
      type: Number,
      default: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
    },

    // 帖子状态
    status: {
      type: String,
      enum: ["published", "deleted"],
      default: "published",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
postSchema.index({ authorId: 1, status: 1, createdAt: -1 });
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ content: "text" });

// 虚拟字段：帖子ID
postSchema.virtual("postId").get(function () {
  return this._id.toString();
});

// 确保虚拟字段包含在JSON输出中
postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Post", postSchema);
