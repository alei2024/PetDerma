const mongoose = require("mongoose");
require("dotenv").config();

// 导入所有模型
const User = require("../models/User");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const Favorite = require("../models/Favorite");
const Share = require("../models/Share");
const Image = require("../models/Image");
const Notification = require("../models/Notification");

async function checkDatabase() {
  try {
    console.log("🔍 检查数据库状态...");

    // 连接数据库
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/PetDerma_Community",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("✅ 数据库连接成功");

    // 检查数据库信息
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📊 数据库名称: ${dbName}`);

    // 检查集合是否存在
    console.log("\n📋 检查集合状态:");
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const collectionNames = collections.map((c) => c.name);

    const expectedCollections = [
      "users",
      "posts",
      "comments",
      "likes",
      "favorites",
      "shares",
      "images",
      "notifications",
    ];

    expectedCollections.forEach((name) => {
      const exists = collectionNames.includes(name);
      console.log(
        `  ${exists ? "✅" : "❌"} ${name}: ${exists ? "存在" : "不存在"}`
      );
    });

    // 检查索引
    console.log("\n🔗 检查索引状态:");
    for (const collectionName of expectedCollections) {
      if (collectionNames.includes(collectionName)) {
        const indexes = await mongoose.connection.db
          .collection(collectionName)
          .indexes();
        console.log(`  📌 ${collectionName}: ${indexes.length} 个索引`);
        indexes.forEach((index) => {
          console.log(`    - ${index.name}: ${JSON.stringify(index.key)}`);
        });
      }
    }

    // 检查数据统计
    console.log("\n📈 数据统计:");
    const stats = {
      users: await User.countDocuments(),
      posts: await Post.countDocuments(),
      comments: await Comment.countDocuments(),
      likes: await Like.countDocuments(),
      favorites: await Favorite.countDocuments(),
      shares: await Share.countDocuments(),
      images: await Image.countDocuments(),
      notifications: await Notification.countDocuments(),
    };

    Object.entries(stats).forEach(([key, count]) => {
      console.log(`  📊 ${key}: ${count} 条记录`);
    });

    // 检查最近的数据
    console.log("\n🕐 最近的数据:");
    const recentPost = await Post.findOne()
      .sort({ createdAt: -1 })
      .populate("authorId", "nickName");
    if (recentPost) {
      console.log(
        `  📝 最新帖子: "${recentPost.content.substring(0, 50)}..." (作者: ${
          recentPost.authorId?.nickName || "未知"
        })`
      );
    } else {
      console.log("  📝 暂无帖子数据");
    }

    const recentUser = await User.findOne().sort({ createdAt: -1 });
    if (recentUser) {
      console.log(
        `  👤 最新用户: ${recentUser.nickName} (${
          recentUser.phoneNumber || recentUser.openid
        })`
      );
    } else {
      console.log("  👤 暂无用户数据");
    }

    console.log("\n✅ 数据库检查完成！");
  } catch (error) {
    console.error("❌ 数据库检查失败:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 数据库连接已关闭");
    process.exit(0);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkDatabase();
}

module.exports = checkDatabase;
