const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema(
  {
    // 收藏用户
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 收藏的帖子
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },

    // 收藏时间
    favoritedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 复合索引，确保用户对同一帖子只能收藏一次
favoriteSchema.index({ userId: 1, postId: 1 }, { unique: true });

// 虚拟字段：收藏ID
favoriteSchema.virtual("favoriteId").get(function () {
  return this._id.toString();
});

// 确保虚拟字段包含在JSON输出中
favoriteSchema.set("toJSON", { virtuals: true });
favoriteSchema.set("toObject", { virtuals: true });

// 静态方法：检查用户是否已收藏
favoriteSchema.statics.hasFavorited = function (userId, postId) {
  return this.findOne({
    userId: userId,
    postId: postId,
  });
};

// 静态方法：切换收藏状态
favoriteSchema.statics.toggleFavorite = async function (userId, postId) {
  const existingFavorite = await this.findOne({
    userId: userId,
    postId: postId,
  });

  if (existingFavorite) {
    // 取消收藏
    await this.findByIdAndDelete(existingFavorite._id);
    return { favorited: false, favorite: null };
  } else {
    // 添加收藏
    const favorite = new this({
      userId: userId,
      postId: postId,
    });
    await favorite.save();
    return { favorited: true, favorite };
  }
};

// 静态方法：获取用户的收藏列表
favoriteSchema.statics.getUserFavorites = function (
  userId,
  limit = 20,
  skip = 0
) {
  return this.find({ userId: userId })
    .populate(
      "postId",
      "title content images tags likeCount commentCount createdAt"
    )
    .populate("postId.authorId", "nickName avatar")
    .sort({ favoritedAt: -1 })
    .limit(limit)
    .skip(skip);
};

// 静态方法：获取帖子的收藏列表
favoriteSchema.statics.getPostFavorites = function (
  postId,
  limit = 20,
  skip = 0
) {
  return this.find({ postId: postId })
    .populate("userId", "nickName avatar")
    .sort({ favoritedAt: -1 })
    .limit(limit)
    .skip(skip);
};

// 中间件：保存后更新帖子收藏数
favoriteSchema.post("save", async function () {
  const Post = mongoose.model("Post");
  await Post.findByIdAndUpdate(this.postId, {
    $inc: { favoriteCount: 1 },
  });
});

// 中间件：删除后更新帖子收藏数
favoriteSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    const Post = mongoose.model("Post");
    await Post.findByIdAndUpdate(doc.postId, {
      $inc: { favoriteCount: -1 },
    });
  }
});

module.exports = mongoose.model("Favorite", favoriteSchema);
