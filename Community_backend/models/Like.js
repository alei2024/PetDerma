const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    // 点赞用户
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 点赞目标（通用字段，可以是帖子ID或评论ID）
    target: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // 点赞目标类型
    targetType: {
      type: String,
      enum: ["post", "comment"],
      required: true,
      index: true,
    },

    // 兼容旧的postId字段（用于向后兼容）
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      index: true,
    },

    // 点赞时间
    likedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 复合索引，确保用户对同一目标只能点赞一次
likeSchema.index({ userId: 1, target: 1, targetType: 1 }, { unique: true });

// 静态方法：清理旧索引
likeSchema.statics.cleanupOldIndexes = async function () {
  try {
    console.log("🔧 检查并清理Like集合的旧索引...");
    const collection = this.collection;
    const indexes = await collection.indexes();

    // 查找旧的 userId_1_postId_1 索引
    const oldIndex = indexes.find(
      (index) => index.name === "userId_1_postId_1"
    );
    if (oldIndex) {
      console.log("🗑️ 删除旧的 userId_1_postId_1 索引...");
      await collection.dropIndex("userId_1_postId_1");
      console.log("✅ 旧索引删除成功");
    } else {
      console.log("✅ 未找到旧索引，无需删除");
    }
  } catch (error) {
    console.error("❌ 清理旧索引失败:", error.message);
    // 不抛出错误，避免影响应用启动
  }
};

// 虚拟字段：点赞ID
likeSchema.virtual("likeId").get(function () {
  return this._id.toString();
});

// 确保虚拟字段包含在JSON输出中
likeSchema.set("toJSON", { virtuals: true });
likeSchema.set("toObject", { virtuals: true });

// 中间件：保存前自动设置兼容字段
likeSchema.pre("save", function () {
  // 如果是帖子点赞，同时设置postId字段以保持向后兼容
  if (this.targetType === "post" && this.target) {
    this.postId = this.target;
  }
});

// 静态方法：检查用户是否已点赞
likeSchema.statics.hasLiked = function (userId, postId) {
  return this.findOne({
    userId: userId,
    target: postId,
    targetType: "post",
  });
};

// 静态方法：切换点赞状态
likeSchema.statics.toggleLike = async function (userId, postId) {
  const existingLike = await this.findOne({
    userId: userId,
    target: postId,
    targetType: "post",
  });

  if (existingLike) {
    // 取消点赞
    await this.findByIdAndDelete(existingLike._id);
    return { liked: false, like: null };
  } else {
    // 添加点赞
    const like = new this({
      userId: userId,
      target: postId,
      targetType: "post",
      postId: postId, // 保持向后兼容
    });
    await like.save();
    return { liked: true, like };
  }
};

// 静态方法：获取帖子的点赞列表
likeSchema.statics.getPostLikes = function (postId, limit = 20, skip = 0) {
  return this.find({
    target: postId,
    targetType: "post",
  })
    .populate("userId", "nickName avatar")
    .sort({ likedAt: -1 })
    .limit(limit)
    .skip(skip);
};

// 静态方法：获取用户的点赞列表
likeSchema.statics.getUserLikes = function (userId, limit = 20, skip = 0) {
  return this.find({
    userId: userId,
    targetType: "post", // 只获取帖子点赞
  })
    .populate(
      "target",
      "title content images tags likeCount commentCount createdAt"
    )
    .populate("target.authorId", "nickName avatar")
    .sort({ likedAt: -1 })
    .limit(limit)
    .skip(skip);
};

// 中间件：保存后更新计数
likeSchema.post("save", async function () {
  try {
    if (this.targetType === "post" && this.target) {
      const Post = mongoose.model("Post");
      await Post.findByIdAndUpdate(this.target, {
        $inc: { likeCount: 1 },
      });
      console.log(`✅ 帖子 ${this.target} 点赞数已增加`);
    }
    // 评论点赞计数由控制器手动处理，避免冲突
    // else if (this.targetType === "comment" && this.target) {
    //   const Comment = mongoose.model("Comment");
    //   await Comment.findByIdAndUpdate(this.target, {
    //     $inc: { "stats.likes": 1 },
    //   });
    // }
  } catch (error) {
    console.error("Like保存后更新计数失败:", error);
  }
});

// 中间件：删除后更新计数
likeSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    try {
      if (doc.targetType === "post" && doc.target) {
        const Post = mongoose.model("Post");
        await Post.findByIdAndUpdate(doc.target, {
          $inc: { likeCount: -1 },
        });
        console.log(`✅ 帖子 ${doc.target} 点赞数已减少`);
      }
      // 评论点赞计数由控制器手动处理，避免冲突
      // else if (doc.targetType === "comment" && doc.target) {
      //   const Comment = mongoose.model("Comment");
      //   await Comment.findByIdAndUpdate(doc.target, {
      //     $inc: { "stats.likes": -1 },
      //   });
      // }
    } catch (error) {
      console.error("Like删除后更新计数失败:", error);
    }
  }
});

module.exports = mongoose.model("Like", likeSchema);
