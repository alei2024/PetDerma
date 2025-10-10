// 清理数据库脚本 - 只保留指定的四个手机号用户
const mongoose = require("mongoose");
require("dotenv").config();

// 导入模型
const User = require("../models/User");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const Favorite = require("../models/Favorite");
const Share = require("../models/Share");
const Image = require("../models/Image");

// 要保留的四个手机号
const KEEP_PHONE_NUMBERS = [
  "18157380516",
  "19121226506",
  "18057388770",
  "13806716172",
];

async function cleanupKeepFourUsers() {
  try {
    // 连接数据库
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/petderma",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("✅ 数据库连接成功");

    // 1. 查找要保留的四个用户
    const keepUsers = await User.find({
      phoneNumber: { $in: KEEP_PHONE_NUMBERS },
    });

    console.log(`📱 找到 ${keepUsers.length} 个要保留的用户:`);
    keepUsers.forEach((user) => {
      console.log(`  - ${user.nickName} (${user.phoneNumber})`);
    });

    const keepUserIds = keepUsers.map((user) => user._id);

    // 2. 查找要删除的所有其他用户
    const deleteUsers = await User.find({
      _id: { $nin: keepUserIds },
    });

    console.log(`🗑️ 找到 ${deleteUsers.length} 个用户需要删除:`);
    deleteUsers.forEach((user) => {
      console.log(
        `  - ${user.nickName || "未知用户"} (${
          user.phoneNumber || user.openid || "no-id"
        })`
      );
    });

    const deleteUserIds = deleteUsers.map((user) => user._id);

    if (deleteUserIds.length === 0) {
      console.log("✅ 没有找到需要删除的用户");
      return;
    }

    // 3. 删除要删除用户发布的帖子
    const deletePosts = await Post.find({ authorId: { $in: deleteUserIds } });
    console.log(`📝 找到 ${deletePosts.length} 个帖子需要删除`);

    const deletePostIds = deletePosts.map((post) => post._id);

    // 4. 开始删除相关数据
    let totalDeleted = {
      comments: 0,
      likes: 0,
      favorites: 0,
      shares: 0,
      images: 0,
      posts: 0,
      users: 0,
    };

    if (deletePostIds.length > 0) {
      // 删除帖子相关的评论（包括对这些帖子的评论和这些用户发的评论）
      const deletedComments = await Comment.deleteMany({
        $or: [
          { postId: { $in: deletePostIds } },
          { authorId: { $in: deleteUserIds } },
        ],
      });
      totalDeleted.comments = deletedComments.deletedCount;
      console.log(`💬 删除了 ${deletedComments.deletedCount} 条评论`);

      // 删除点赞记录（包括对这些帖子/评论的点赞和这些用户的点赞）
      const deletedLikes = await Like.deleteMany({
        $or: [
          { postId: { $in: deletePostIds } },
          { userId: { $in: deleteUserIds } },
          { target: { $in: deletePostIds } },
        ],
      });
      totalDeleted.likes = deletedLikes.deletedCount;
      console.log(`👍 删除了 ${deletedLikes.deletedCount} 条点赞记录`);

      // 删除收藏记录
      const deletedFavorites = await Favorite.deleteMany({
        $or: [
          { postId: { $in: deletePostIds } },
          { userId: { $in: deleteUserIds } },
        ],
      });
      totalDeleted.favorites = deletedFavorites.deletedCount;
      console.log(`⭐ 删除了 ${deletedFavorites.deletedCount} 条收藏记录`);

      // 删除转发记录
      const deletedShares = await Share.deleteMany({
        $or: [
          { postId: { $in: deletePostIds } },
          { userId: { $in: deleteUserIds } },
        ],
      });
      totalDeleted.shares = deletedShares.deletedCount;
      console.log(`🔄 删除了 ${deletedShares.deletedCount} 条转发记录`);

      // 删除图片
      const deletedImages = await Image.deleteMany({
        $or: [
          { postId: { $in: deletePostIds } },
          { uploadedBy: { $in: deleteUserIds } },
        ],
      });
      totalDeleted.images = deletedImages.deletedCount;
      console.log(`🖼️ 删除了 ${deletedImages.deletedCount} 张图片`);

      // 删除帖子
      const deletedPosts = await Post.deleteMany({
        _id: { $in: deletePostIds },
      });
      totalDeleted.posts = deletedPosts.deletedCount;
      console.log(`📝 删除了 ${deletedPosts.deletedCount} 个帖子`);
    }

    // 5. 删除用户
    const deletedUsers = await User.deleteMany({ _id: { $in: deleteUserIds } });
    totalDeleted.users = deletedUsers.deletedCount;
    console.log(`👤 删除了 ${deletedUsers.deletedCount} 个用户`);

    // 6. 显示最终统计信息
    console.log("\n📊 清理完成后的数据统计:");
    const remainingUsers = await User.countDocuments();
    const remainingPosts = await Post.countDocuments();
    const remainingComments = await Comment.countDocuments();
    const remainingLikes = await Like.countDocuments();
    const remainingFavorites = await Favorite.countDocuments();
    const remainingShares = await Share.countDocuments();
    const remainingImages = await Image.countDocuments();

    console.log(`👤 剩余用户: ${remainingUsers}`);
    console.log(`📝 剩余帖子: ${remainingPosts}`);
    console.log(`💬 剩余评论: ${remainingComments}`);
    console.log(`👍 剩余点赞: ${remainingLikes}`);
    console.log(`⭐ 剩余收藏: ${remainingFavorites}`);
    console.log(`🔄 剩余转发: ${remainingShares}`);
    console.log(`🖼️ 剩余图片: ${remainingImages}`);

    console.log("\n🎯 删除汇总:");
    console.log(`👤 删除用户: ${totalDeleted.users}`);
    console.log(`📝 删除帖子: ${totalDeleted.posts}`);
    console.log(`💬 删除评论: ${totalDeleted.comments}`);
    console.log(`👍 删除点赞: ${totalDeleted.likes}`);
    console.log(`⭐ 删除收藏: ${totalDeleted.favorites}`);
    console.log(`🔄 删除转发: ${totalDeleted.shares}`);
    console.log(`🖼️ 删除图片: ${totalDeleted.images}`);

    console.log("\n✅ 数据清理完成！现在只保留四个指定手机号用户的数据。");
  } catch (error) {
    console.error("❌ 清理数据时出错:", error);
  } finally {
    await mongoose.disconnect();
    console.log("📡 数据库连接已关闭");
  }
}

// 运行清理脚本
cleanupKeepFourUsers();
