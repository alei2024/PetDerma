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

    // 软删除：将状态改为deleted
    await Post.findByIdAndUpdate(id, { status: "deleted" });

    res.json({
      success: true,
      message: "帖子删除成功",
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
  getPopularTags,
};
