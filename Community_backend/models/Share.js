const mongoose = require("mongoose");

const shareSchema = new mongoose.Schema(
  {
    // 转发用户
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 转发的帖子
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },

    // 转发时的附言
    comment: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    // 转发时间
    sharedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 复合索引，用于查询优化（移除唯一约束，允许多次转发）
shareSchema.index({ userId: 1, postId: 1 });

// 虚拟字段：转发ID
shareSchema.virtual("shareId").get(function () {
  return this._id.toString();
});

// 确保虚拟字段包含在JSON输出中
shareSchema.set("toJSON", { virtuals: true });
shareSchema.set("toObject", { virtuals: true });

// 静态方法：检查用户是否已转发
shareSchema.statics.hasShared = function (userId, postId) {
  return this.findOne({
    userId: userId,
    postId: postId,
  });
};

// 静态方法：切换转发状态
shareSchema.statics.toggleShare = async function (
  userId,
  postId,
  comment = ""
) {
  const existingShare = await this.findOne({
    userId: userId,
    postId: postId,
  });

  if (existingShare) {
    // 取消转发
    await this.findByIdAndDelete(existingShare._id);
    return { shared: false, share: null };
  } else {
    // 添加转发
    const share = new this({
      userId: userId,
      postId: postId,
      comment: comment,
    });
    await share.save();
    return { shared: true, share };
  }
};

// 静态方法：获取用户的转发列表
shareSchema.statics.getUserShares = function (userId, limit = 20, skip = 0) {
  return this.find({ userId: userId })
    .populate(
      "postId",
      "title content images tags likeCount commentCount createdAt"
    )
    .populate("postId.authorId", "nickName avatar")
    .sort({ sharedAt: -1 })
    .limit(limit)
    .skip(skip);
};

// 静态方法：获取帖子的转发列表
shareSchema.statics.getPostShares = function (postId, limit = 20, skip = 0) {
  return this.find({ postId: postId })
    .populate("userId", "nickName avatar")
    .sort({ sharedAt: -1 })
    .limit(limit)
    .skip(skip);
};

// 中间件：保存后更新帖子转发数
shareSchema.post("save", async function () {
  const Post = mongoose.model("Post");
  await Post.findByIdAndUpdate(this.postId, {
    $inc: { shareCount: 1 },
  });
});

// 中间件：删除后更新帖子转发数
shareSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    const Post = mongoose.model("Post");
    await Post.findByIdAndUpdate(doc.postId, {
      $inc: { shareCount: -1 },
    });
  }
});

// 静态方法：清理旧的唯一索引
shareSchema.statics.cleanupOldIndexes = async function () {
  try {
    console.log("🔧 检查并清理Share集合的旧唯一索引...");
    const collection = this.collection;
    const indexes = await collection.indexes();

    // 查找旧的唯一索引 userId_1_postId_1
    const oldUniqueIndex = indexes.find(
      (index) => index.name === "userId_1_postId_1" && index.unique === true
    );
    if (oldUniqueIndex) {
      console.log("🗑️ 删除旧的唯一索引 userId_1_postId_1...");
      await collection.dropIndex("userId_1_postId_1");
      console.log("✅ 旧唯一索引删除成功");

      // 重新创建非唯一索引
      console.log("🔧 重新创建非唯一索引...");
      await collection.createIndex({ userId: 1, postId: 1 });
      console.log("✅ 非唯一索引创建成功");
    } else {
      console.log("✅ 没有找到需要清理的唯一索引");
    }
  } catch (error) {
    console.error("❌ 清理Share索引失败:", error);
  }
};

module.exports = mongoose.model("Share", shareSchema);
