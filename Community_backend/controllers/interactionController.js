const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const Favorite = require("../models/Favorite");
const Share = require("../models/Share");
const socketService = require("../services/socketService");
const nativeWebSocketService = require("../services/nativeWebSocketService");

// 点赞/取消点赞帖子
const toggleLikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "帖子不存在",
      });
    }

    const result = await Like.toggleLike(userId, postId);

    // 重新获取帖子以获得最新的计数
    const updatedPost = await Post.findById(postId);
    const newLikeCount = updatedPost.likeCount;

    // 发送实时通知
    const eventData = {
      postId,
      userId,
      isLiked: result.liked,
      likeCount: newLikeCount,
      timestamp: new Date(),
    };

    // Socket.IO通知
    socketService.io.to(`post_${postId}`).emit("post_liked", eventData);

    // 原生WebSocket通知
    nativeWebSocketService.broadcastToRoom(
      `post_${postId}`,
      "post_liked",
      eventData
    );

    res.json({
      success: true,
      message: result.liked ? "点赞成功" : "取消点赞成功",
      data: {
        liked: result.liked,
        likeCount: newLikeCount,
      },
    });
  } catch (error) {
    console.error("点赞操作错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 收藏/取消收藏帖子
const toggleFavoritePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "帖子不存在",
      });
    }

    const result = await Favorite.toggleFavorite(userId, postId);

    // 重新获取帖子以获得最新的计数
    const updatedPost = await Post.findById(postId);
    const newFavoriteCount = updatedPost.favoriteCount;

    // 发送实时通知到帖子房间
    const favoriteEventData = {
      postId,
      userId,
      isFavorited: result.favorited,
      favoriteCount: newFavoriteCount,
      timestamp: new Date(),
    };

    // Socket.IO通知
    socketService.io
      .to(`post_${postId}`)
      .emit("post_favorited", favoriteEventData);

    // 原生WebSocket通知
    nativeWebSocketService.broadcastToRoom(
      `post_${postId}`,
      "post_favorited",
      favoriteEventData
    );

    res.json({
      success: true,
      message: result.favorited ? "收藏成功" : "取消收藏成功",
      data: {
        favorited: result.favorited,
        favoriteCount: newFavoriteCount,
      },
    });
  } catch (error) {
    console.error("收藏操作错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 转发帖子（每次都增加计数）
const toggleSharePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { comment = "" } = req.body;
    const userId = req.user.userId;

    console.log("🔄 转发请求:", { postId, userId, comment });

    const post = await Post.findById(postId);
    if (!post) {
      console.log("❌ 帖子不存在:", postId);
      return res.status(404).json({
        success: false,
        message: "帖子不存在",
      });
    }

    console.log("📊 找到帖子:", { id: post._id, shareCount: post.shareCount });

    // 每次都创建新的转发记录，不切换状态
    const share = new Share({
      userId: userId,
      postId: postId,
      comment: comment,
    });

    console.log("💾 准备保存转发记录:", share);
    await share.save();
    console.log("✅ 转发记录保存成功:", share._id);

    // 重新获取帖子以获取更新后的转发数
    const updatedPost = await Post.findById(postId);
    console.log("📊 更新后的帖子:", {
      id: updatedPost._id,
      shareCount: updatedPost.shareCount,
    });

    res.json({
      success: true,
      message: "转发成功",
      data: {
        shared: true,
        shareCount: updatedPost.shareCount || 0,
      },
    });
  } catch (error) {
    console.error("❌ 转发操作错误:", error);
    console.error("❌ 错误堆栈:", error.stack);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
      error: error.message,
    });
  }
};

// 创建评论
const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentId, replyToId } = req.body;
    const userId = req.user.userId;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "评论内容不能为空",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "帖子不存在",
      });
    }

    const comment = new Comment({
      postId,
      authorId: userId,
      content,
      parent: parentId || null,
      replyTo: replyToId || null,
    });

    console.log("💾 创建评论数据:", {
      postId,
      authorId: userId,
      content,
      parent: parentId || null,
      replyTo: replyToId || null,
      isActive: comment.isActive,
    });

    await comment.save();
    console.log("✅ 评论保存成功，ID:", comment._id);

    await comment.populate("authorId", "nickName avatar");
    if (comment.replyTo) {
      await comment.populate("replyTo", "nickName");
    }

    // 发送实时通知（评论广播）
    const commentEventData = {
      postId,
      comment,
      userId,
      commentCount: post.commentCount + 1, // 添加评论数量
      timestamp: new Date(),
    };

    // Socket.IO通知
    socketService.io
      .to(`post_${postId}`)
      .emit("post_commented", commentEventData);

    // 原生WebSocket通知
    nativeWebSocketService.broadcastToRoom(
      `post_${postId}`,
      "post_commented",
      commentEventData
    );

    res.status(201).json({
      success: true,
      message: "评论成功",
      data: comment,
    });
  } catch (error) {
    console.error("创建评论错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取帖子评论
const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // 获取用户ID（如果已认证）
    const userId = req.user?.userId;

    console.log("🔍 开始获取帖子评论，postId:", postId);
    const comments = await Comment.getPostComments(
      postId,
      parseInt(limit),
      skip
    );
    console.log("📝 获取到的评论数量:", comments.length);

    // 如果用户已认证，获取用户对评论的点赞状态
    if (userId) {
      const commentIds = comments.map((comment) => comment._id);
      const userLikes = await Like.find({
        userId,
        target: { $in: commentIds },
        targetType: "comment",
      });

      const likedCommentIds = new Set(
        userLikes.map((like) => like.target.toString())
      );

      // 为每个评论添加用户交互状态
      comments.forEach((comment) => {
        comment.userInteraction = {
          isLiked: likedCommentIds.has(comment._id.toString()),
        };
      });
    } else {
      // 未认证用户，设置默认状态
      comments.forEach((comment) => {
        comment.userInteraction = {
          isLiked: false,
        };
      });
    }

    const total = await Comment.countDocuments({
      postId,
      parent: null,
      isActive: true,
    });

    // 调试：检查返回的评论数据
    console.log("📤 准备返回给前端的评论数据:");
    comments.forEach((comment, index) => {
      console.log(
        `评论 ${index + 1}: ID=${comment._id}, 回复数=${
          comment.replies?.length || 0
        }`
      );
    });

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error) {
    console.error("获取评论错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取评论回复
const getCommentReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const replies = await Comment.getCommentReplies(
      commentId,
      parseInt(limit),
      skip
    );
    const total = await Comment.countDocuments({
      parent: commentId,
      isActive: true,
    });

    res.json({
      success: true,
      data: {
        replies,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error) {
    console.error("获取回复错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 删除评论
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId;

    const comment = await Comment.findOne({
      _id: commentId,
      authorId: userId,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "评论不存在或无权删除",
      });
    }

    // 软删除：将状态改为deleted
    await Comment.findByIdAndUpdate(commentId, { status: "deleted" });

    res.json({
      success: true,
      message: "评论删除成功",
    });
  } catch (error) {
    console.error("删除评论错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取用户的点赞列表
const getUserLikes = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const likes = await Like.getUserLikes(userId, parseInt(limit), skip);
    const total = await Like.countDocuments({
      userId: userId,
    });

    res.json({
      success: true,
      data: {
        likes,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error) {
    console.error("获取用户点赞错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取用户的收藏列表
const getUserFavorites = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const favorites = await Favorite.getUserFavorites(
      userId,
      parseInt(limit),
      skip
    );
    const total = await Favorite.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        favorites,
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

// 获取用户的转发列表
const getUserShares = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const shares = await Share.getUserShares(userId, parseInt(limit), skip);
    const total = await Share.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        shares,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total,
        },
      },
    });
  } catch (error) {
    console.error("获取用户转发错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 评论点赞/取消点赞
const toggleLikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId;

    console.log("📝 评论点赞请求:", { commentId, userId });

    // 检查评论是否存在
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "评论不存在",
      });
    }

    // 检查是否已经点赞
    const existingLike = await Like.findOne({
      userId,
      target: commentId,
      targetType: "comment",
    });

    let liked = false;
    let likeCount = 0;

    if (existingLike) {
      // 取消点赞
      await Like.findByIdAndDelete(existingLike._id);
      liked = false;
      console.log("✅ 取消评论点赞");
    } else {
      // 添加点赞
      const newLike = new Like({
        userId,
        target: commentId,
        targetType: "comment",
        // 不设置postId，避免与旧索引冲突
      });
      await newLike.save();
      liked = true;
      console.log("✅ 评论点赞成功");
    }

    // 手动计算准确的点赞数
    const totalLikes = await Like.countDocuments({
      target: commentId,
      targetType: "comment",
    });
    likeCount = totalLikes;

    console.log(`📊 评论 ${commentId} 当前点赞数: ${likeCount}`);

    res.json({
      success: true,
      message: liked ? "点赞成功" : "取消点赞",
      data: {
        liked,
        likeCount,
      },
    });
  } catch (error) {
    console.error("❌ 评论点赞错误详情:", error);
    console.error("错误堆栈:", error.stack);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
      error: error.message, // 开发环境下返回具体错误信息
    });
  }
};

module.exports = {
  toggleLikePost,
  toggleFavoritePost,
  toggleSharePost,
  createComment,
  getPostComments,
  getCommentReplies,
  deleteComment,
  toggleLikeComment,
  getUserLikes,
  getUserFavorites,
  getUserShares,
};
