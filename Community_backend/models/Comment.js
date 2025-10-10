const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    // 帖子ID
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },

    // 评论作者
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 评论内容
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // 父评论ID（用于回复）
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    // 回复的用户
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // 状态
    status: {
      type: String,
      enum: ["active", "hidden", "deleted"],
      default: "active",
      index: true,
    },

    // 统计信息
    stats: {
      likes: {
        type: Number,
        default: 0,
      },
      replies: {
        type: Number,
        default: 0,
      },
    },

    // 评论状态（简化版）
    isActive: {
      type: Boolean,
      default: true,
    },

    // 媒体内容
    media: [
      {
        type: {
          type: String,
          enum: ["image", "video"],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        thumbnail: {
          type: String,
          default: "",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// 索引
commentSchema.index({ postId: 1, isActive: 1, createdAt: -1 });
commentSchema.index({ authorId: 1, isActive: 1 });
commentSchema.index({ parent: 1, isActive: 1, createdAt: 1 });

// 虚拟字段：评论ID
commentSchema.virtual("commentId").get(function () {
  return this._id.toString();
});

// 确保虚拟字段包含在JSON输出中
commentSchema.set("toJSON", { virtuals: true });
commentSchema.set("toObject", { virtuals: true });

// 实例方法：更新统计信息
commentSchema.methods.updateStats = async function () {
  const Like = mongoose.model("Like");
  const Comment = mongoose.model("Comment");

  const likesCount = await Like.countDocuments({
    target: this._id,
    targetType: "comment",
  });

  const repliesCount = await Comment.countDocuments({
    parent: this._id,
    status: "active",
  });

  this.stats.likes = likesCount;
  this.stats.replies = repliesCount;

  await this.save();
};

// 静态方法：获取帖子的评论（包含回复）
commentSchema.statics.getPostComments = async function (
  postId,
  limit = 20,
  skip = 0
) {
  // 获取顶级评论
  const topLevelComments = await this.find({
    postId: postId,
    parent: null, // 只获取顶级评论
    isActive: true,
  })
    .populate("authorId", "nickName avatar")
    .populate("replyTo", "nickName")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  // 将Mongoose文档转换为普通对象，以便添加回复数据
  const commentsWithReplies = [];

  // 为每个顶级评论获取回复
  for (let comment of topLevelComments) {
    console.log(`🔍 查找评论 ${comment._id} 的回复...`);

    const replies = await this.find({
      parent: comment._id,
      isActive: true,
    })
      .populate("authorId", "nickName avatar")
      .populate("replyTo", "nickName")
      .sort({ createdAt: 1 }) // 回复按时间正序
      .limit(10); // 限制回复数量

    console.log(`📝 评论 ${comment._id} 找到 ${replies.length} 条回复`);

    const totalReplies = await this.countDocuments({
      parent: comment._id,
      isActive: true,
    });

    console.log(`📊 评论 ${comment._id} 总回复数: ${totalReplies}`);

    // 将评论转换为普通对象并添加回复数据
    const commentObj = comment.toObject();
    commentObj.replies = replies;
    commentObj.totalReplies = totalReplies;

    commentsWithReplies.push(commentObj);
  }

  console.log("✅ 所有评论处理完成，返回数据");
  return commentsWithReplies;
};

// 静态方法：获取评论的回复
commentSchema.statics.getCommentReplies = function (
  commentId,
  limit = 10,
  skip = 0
) {
  return this.find({
    parent: commentId,
    isActive: true,
  })
    .populate("authorId", "nickName avatar")
    .populate("replyTo", "nickName")
    .sort({ createdAt: 1 })
    .limit(limit)
    .skip(skip);
};

// 静态方法：获取用户的评论
commentSchema.statics.getUserComments = function (
  userId,
  limit = 20,
  skip = 0
) {
  return this.find({
    authorId: userId,
    isActive: true,
  })
    .populate("postId", "title content authorId")
    .populate("authorId", "nickName avatar")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// 中间件：保存后更新帖子评论数
commentSchema.post("save", async function (doc) {
  // 使用 wasNew 标记来判断是否是新创建的文档
  if (doc.wasNew !== false) {
    try {
      const Post = mongoose.model("Post");
      await Post.findByIdAndUpdate(doc.postId, {
        $inc: { commentCount: 1 },
      });

      console.log(`✅ 帖子 ${doc.postId} 评论数已增加`);

      // 如果是回复，更新父评论的回复数
      if (doc.parent) {
        await mongoose.model("Comment").findByIdAndUpdate(doc.parent, {
          $inc: { "stats.replies": 1 },
        });
        console.log(`✅ 父评论 ${doc.parent} 回复数已增加`);
      }
    } catch (error) {
      console.error("更新评论数失败:", error);
    }
  }
});

// 前置中间件：标记新文档
commentSchema.pre("save", function () {
  if (this.isNew) {
    this.wasNew = true;
  }
});

// 中间件：删除后更新帖子评论数
commentSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    const Post = mongoose.model("Post");
    await Post.findByIdAndUpdate(doc.postId, {
      $inc: { commentCount: -1 },
    });

    // 如果是回复，更新父评论的回复数
    if (doc.parent) {
      await this.constructor.findByIdAndUpdate(doc.parent, {
        $inc: { "stats.replies": -1 },
      });
    }
  }
});

module.exports = mongoose.model("Comment", commentSchema);
