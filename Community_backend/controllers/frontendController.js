const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const Like = require("../models/Like");
const Favorite = require("../models/Favorite");
const Share = require("../models/Share");
const socketService = require("../services/socketService");

// 获取社区首页数据（为小程序前端优化）
const getCommunityHomeData = async (req, res) => {
  try {
    const { page = 1, limit = 10, tag, search } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user?.userId;

    // 构建查询条件
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

    // 获取帖子列表
    const posts = await Post.find(query)
      .populate("authorId", "nickName avatar")
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // 获取热门标签
    const popularTags = await Post.aggregate([
      { $match: { status: "published" } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // 获取在线用户数
    const onlineUsers = socketService.getOnlineUsers();

    // 如果用户已登录，获取用户互动状态
    let userInteractions = {};
    if (userId) {
      const postIds = posts.map((post) => post._id);
      const [likes, favorites, shares] = await Promise.all([
        Like.find({ userId, postId: { $in: postIds } }),
        Favorite.find({ userId, postId: { $in: postIds } }),
        Share.find({ userId, postId: { $in: postIds } }),
      ]);

      userInteractions = {
        likes: likes.map((like) => like.postId.toString()),
        favorites: favorites.map((fav) => fav.postId.toString()),
        shares: shares.map((share) => share.postId.toString()),
      };
    }

    res.json({
      success: true,
      data: {
        posts: posts.map((post) => ({
          id: post._id,
          title: post.title,
          content: post.content,
          images: post.images,
          tags: post.tags,
          author: {
            id: post.authorId._id,
            nickName: post.authorId.nickName,
            avatar: post.authorId.avatar,
          },
          stats: {
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            favoriteCount: post.favoriteCount,
            shareCount: post.shareCount,
          },
          isPinned: post.isPinned,
          isFeatured: post.isFeatured,
          createdAt: post.createdAt,
          userInteractions: {
            isLiked:
              userInteractions.likes?.includes(post._id.toString()) || false,
            isFavorited:
              userInteractions.favorites?.includes(post._id.toString()) ||
              false,
            isShared:
              userInteractions.shares?.includes(post._id.toString()) || false,
          },
        })),
        popularTags: popularTags.map((tag) => ({
          name: tag._id,
          count: tag.count,
        })),
        onlineUsers: onlineUsers.length,
        pagination: {
          current: parseInt(page),
          total: Math.ceil((await Post.countDocuments(query)) / limit),
          hasMore: skip + posts.length < (await Post.countDocuments(query)),
        },
      },
    });
  } catch (error) {
    console.error("获取社区首页数据错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取帖子详情（为小程序前端优化）
const getPostDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const post = await Post.findById(id)
      .populate("authorId", "nickName avatar")
      .populate("relatedPets");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "帖子不存在",
      });
    }

    // 增加浏览量
    await post.incrementViews();

    // 获取评论列表
    const comments = await Comment.getPostComments(id, 10, 0);

    // 检查用户互动状态
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
        post: {
          id: post._id,
          title: post.title,
          content: post.content,
          images: post.images,
          tags: post.tags,
          author: {
            id: post.authorId._id,
            nickName: post.authorId.nickName,
            avatar: post.authorId.avatar,
          },
          stats: {
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            favoriteCount: post.favoriteCount,
            shareCount: post.shareCount,
            views: post.stats?.views || 0,
          },
          isPinned: post.isPinned,
          isFeatured: post.isFeatured,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        },
        comments: comments.map((comment) => ({
          id: comment._id,
          content: comment.content,
          author: {
            id: comment.authorId._id,
            nickName: comment.authorId.nickName,
            avatar: comment.authorId.avatar,
          },
          replyTo: comment.replyTo
            ? {
                id: comment.replyTo._id,
                nickName: comment.replyTo.nickName,
              }
            : null,
          stats: {
            likes: comment.stats?.likes || 0,
            replies: comment.stats?.replies || 0,
          },
          createdAt: comment.createdAt,
        })),
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

// 获取用户资料（为小程序前端优化）
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.userId;

    const user = await User.findById(userId).select(
      "-openid -phoneNumber -__v"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "用户不存在",
      });
    }

    // 获取用户帖子
    const userPosts = await Post.find({
      authorId: userId,
      status: "published",
    })
      .populate("authorId", "nickName avatar")
      .sort({ createdAt: -1 })
      .limit(10);

    // 获取用户统计信息
    const [postsCount, commentsCount, likesCount] = await Promise.all([
      Post.countDocuments({ authorId: userId, status: "published" }),
      Comment.countDocuments({ authorId: userId, status: "active" }),
      Like.countDocuments({ userId }),
    ]);

    // 检查是否在线
    const isOnline = socketService.isUserOnline(userId);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          nickName: user.nickName,
          avatar: user.avatar,
          gender: user.gender,
          city: user.city,
          province: user.province,
          country: user.country,
          pets: user.pets,
          isOnline,
          lastLoginAt: user.lastLoginAt,
        },
        stats: {
          postsCount,
          commentsCount,
          likesCount,
          followersCount: user.stats?.followersCount || 0,
          followingCount: user.stats?.followingCount || 0,
        },
        recentPosts: userPosts.map((post) => ({
          id: post._id,
          title: post.title,
          content: post.content.substring(0, 100) + "...",
          images: post.images.slice(0, 1), // 只显示第一张图片
          tags: post.tags,
          stats: {
            likeCount: post.likeCount,
            commentCount: post.commentCount,
          },
          createdAt: post.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("获取用户资料错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取实时通知
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 这里可以实现通知系统
    // 暂时返回空数组，后续可以集成通知服务
    res.json({
      success: true,
      data: {
        notifications: [],
        unreadCount: 0,
      },
    });
  } catch (error) {
    console.error("获取通知错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取在线用户列表
const getOnlineUsers = async (req, res) => {
  try {
    const onlineUsers = socketService.getOnlineUsers();

    res.json({
      success: true,
      data: {
        users: onlineUsers.map((user) => ({
          id: user.user.id,
          nickName: user.user.nickName,
          avatar: user.user.avatar,
          lastSeen: user.lastSeen,
        })),
        count: onlineUsers.length,
      },
    });
  } catch (error) {
    console.error("获取在线用户错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

module.exports = {
  getCommunityHomeData,
  getPostDetail,
  getUserProfile,
  getNotifications,
  getOnlineUsers,
};
