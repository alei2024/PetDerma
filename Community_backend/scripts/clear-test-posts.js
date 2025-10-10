// 清空测试帖子脚本
const mongoose = require("mongoose");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const Favorite = require("../models/Favorite");
const Share = require("../models/Share");

async function clearTestPosts() {
  try {
    // 连接MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/PetDerma_Community";
    await mongoose.connect(mongoUri);
    console.log("✅ 数据库连接成功");

    // 清空所有帖子相关数据
    console.log("🗑️ 开始清空测试数据...");

    // 1. 清空帖子
    const postResult = await Post.deleteMany({});
    console.log(`📝 删除了 ${postResult.deletedCount} 个帖子`);

    // 2. 清空评论
    const commentResult = await Comment.deleteMany({});
    console.log(`💬 删除了 ${commentResult.deletedCount} 个评论`);

    // 3. 清空点赞
    const likeResult = await Like.deleteMany({});
    console.log(`👍 删除了 ${likeResult.deletedCount} 个点赞`);

    // 4. 清空收藏
    const favoriteResult = await Favorite.deleteMany({});
    console.log(`⭐ 删除了 ${favoriteResult.deletedCount} 个收藏`);

    // 5. 清空分享
    const shareResult = await Share.deleteMany({});
    console.log(`🔗 删除了 ${shareResult.deletedCount} 个分享`);

    console.log("🎉 测试数据清空完成！");
  } catch (error) {
    console.error("❌ 清空数据失败:", error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log("🔌 数据库连接已关闭");
    process.exit(0);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  clearTestPosts();
}

module.exports = { clearTestPosts };

