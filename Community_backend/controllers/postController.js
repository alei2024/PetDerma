const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const Favorite = require("../models/Favorite");
const Share = require("../models/Share");

// 创建帖子
const createPost = async (req, res) => {
  try {
    const { title, content, images, tags } = req.body;
    const authorId = req.user.userId;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "标题和内容不能为空",
      });
    }

    const post = new Post({
      authorId,
      title,
      content,
      images: images || [],
      tags: tags || [],
    });

    await post.save();
    await post.populate("authorId", "nickName avatar");
    await post.populate("images", "-data"); // 填充图片信息但排除二进制数据

    res.status(201).json({
      success: true,
      message: "帖子创建成功",
      data: post,
    });
  } catch (error) {
    console.error("创建帖子错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取帖子列表
const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, tag, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { status: "published" };

    if (tag) {
      query.tags = { $in: [tag] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const posts = await Post.find(query)
      .populate("authorId", "nickName avatar")
      .populate("images", "-data") // 填充图片信息但排除二进制数据
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error) {
    console.error("获取帖子列表错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取帖子详情
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const post = await Post.findById(id)
      .populate("authorId", "nickName avatar")
      .populate("images", "-data"); // 填充图片信息但排除二进制数据

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "帖子不存在",
      });
    }

    // 增加浏览量（简化版本）
    // await post.incrementViews(); // 暂时禁用浏览量统计

    // 检查用户是否点赞、收藏、转发
    let userInteractions = {};
    if (userId) {
      const [isLiked, isFavorited, isShared] = await Promise.all([
        Like.hasLiked(userId, id),
        Favorite.hasFavorited(userId, id),
        Share.hasShared(userId, id),
      ]);

      userInteractions = {
        isLiked: !!isLiked,
        isFavorited: !!isFavorited,
        isShared: !!isShared,
      };
    }

    res.json({
      success: true,
      data: {
        post,
        userInteractions,
      },
    });
  } catch (error) {
    console.error("获取帖子详情错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 更新帖子
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, images, tags } = req.body;
    const userId = req.user.userId;

    const post = await Post.findOne({ _id: id, authorId: userId });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "帖子不存在或无权修改",
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (images) updateData.images = images;
    if (tags) updateData.tags = tags;

    const updatedPost = await Post.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("authorId", "nickName avatar");

    res.json({
      success: true,
      message: "帖子更新成功",
      data: updatedPost,
    });
  } catch (error) {
    console.error("更新帖子错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 删除帖子
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const post = await Post.findOne({ _id: id, authorId: userId });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "帖子不存在或无权删除",
      });
    }

    console.log(`🗑️ 开始删除帖子 ${id} 及其相关数据`);

    // 删除帖子相关的所有数据
    const Comment = require("../models/Comment");
    const Like = require("../models/Like");
    const Favorite = require("../models/Favorite");
    const Share = require("../models/Share");
    const Image = require("../models/Image");

    // 1. 删除所有评论
    const deletedComments = await Comment.deleteMany({ postId: id });
    console.log(`📝 删除了 ${deletedComments.deletedCount} 条评论`);

    // 2. 删除所有点赞记录
    const deletedLikes = await Like.deleteMany({
      $or: [{ postId: id }, { target: id, targetType: "post" }],
    });
    console.log(`👍 删除了 ${deletedLikes.deletedCount} 条点赞记录`);

    // 3. 删除所有收藏记录
    const deletedFavorites = await Favorite.deleteMany({ postId: id });
    console.log(`⭐ 删除了 ${deletedFavorites.deletedCount} 条收藏记录`);

    // 4. 删除所有转发记录
    const deletedShares = await Share.deleteMany({ postId: id });
    console.log(`📤 删除了 ${deletedShares.deletedCount} 条转发记录`);

    // 5. 删除帖子关联的图片
    if (post.images && post.images.length > 0) {
      const deletedImages = await Image.deleteMany({
        _id: { $in: post.images },
        postId: id,
      });
      console.log(`🖼️ 删除了 ${deletedImages.deletedCount} 张图片`);
    }

    // 6. 最后删除帖子本身
    await Post.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "帖子及相关数据删除成功",
    });
  } catch (error) {
    console.error("删除帖子错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取用户的帖子
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      authorId: userId,
      status: "published",
    })
      .populate("authorId", "nickName avatar")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Post.countDocuments({
      authorId: userId,
      status: "published",
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error) {
    console.error("获取用户帖子错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取用户收藏的帖子
const getUserFavorites = async (req, res) => {
  try {
    const userId = req.user.userId; // 从token获取当前用户ID
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    console.log(`📋 获取用户 ${userId} 的收藏列表`);

    const favorites = await Favorite.find({ userId })
      .populate({
        path: "postId",
        match: { status: "published" }, // 只获取已发布的帖子
        populate: {
          path: "authorId",
          select: "nickName avatar",
        },
      })
      .sort({ favoritedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // 过滤掉已删除的帖子
    const validFavorites = favorites.filter((fav) => fav.postId);
    const posts = validFavorites.map((fav) => ({
      ...fav.postId.toObject(),
      favoritedAt: fav.favoritedAt,
    }));

    const total = await Favorite.countDocuments({
      userId,
      postId: { $exists: true },
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error) {
    console.error("获取用户收藏错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取用户发表的评论
const getUserComments = async (req, res) => {
  try {
    const userId = req.user.userId; // 从token获取当前用户ID
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    console.log(`💬 获取用户 ${userId} 的评论列表`);

    const comments = await Comment.find({
      authorId: userId,
      isActive: true,
      status: { $ne: "deleted" }, // 过滤已删除的评论
    })
      .populate({
        path: "postId",
        match: { status: "published" }, // 只获取已发布的帖子
        select: "title content authorId createdAt",
        populate: {
          path: "authorId",
          select: "nickName avatar",
        },
      })
      .populate("authorId", "nickName avatar")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // 过滤掉已删除帖子的评论
    const validComments = comments.filter((comment) => comment.postId);

    const total = await Comment.countDocuments({
      authorId: userId,
      isActive: true,
      status: { $ne: "deleted" }, // 过滤已删除的评论
    });

    res.json({
      success: true,
      data: {
        comments: validComments,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error) {
    console.error("获取用户评论错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取用户发布的帖子（当前用户自己的）
const getMyPosts = async (req, res) => {
  try {
    const userId = req.user.userId; // 从token获取当前用户ID
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    console.log(`📝 获取用户 ${userId} 的发布列表`);

    const posts = await Post.find({
      authorId: userId,
      status: "published",
    })
      .populate("authorId", "nickName avatar")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Post.countDocuments({
      authorId: userId,
      status: "published",
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error) {
    console.error("获取用户发布错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取热门标签
const getPopularTags = async (req, res) => {
  try {
    const tags = await Post.aggregate([
      { $match: { status: "published" } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    console.error("获取热门标签错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  getUserPosts,
  getUserFavorites,
  getUserComments,
  getMyPosts,
  getPopularTags,
};
