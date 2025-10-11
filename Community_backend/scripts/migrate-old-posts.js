const mongoose = require("mongoose");
const Post = require("../models/Post");

async function migrateOldPosts() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/PetDerma_Community"
    );
    console.log("✅ 数据库连接成功");

    // 查找所有帖子
    const posts = await Post.find();
    console.log(`📋 找到 ${posts.length} 条帖子`);

    let migratedCount = 0;
    let deletedCount = 0;

    for (const post of posts) {
      // 检查images字段
      if (!post.images) {
        // 如果images字段不存在，设置为空数组
        post.images = [];
        await post.save();
        console.log(`✅ 修复帖子 ${post._id} 的images字段`);
        migratedCount++;
      } else if (Array.isArray(post.images) && post.images.length > 0) {
        // 检查images数组中的元素
        let hasStringImages = false;
        for (const img of post.images) {
          if (typeof img === "string") {
            hasStringImages = true;
            break;
          }
        }

        if (hasStringImages) {
          // 如果包含字符串类型的图片路径，清空images数组
          // 因为这些是旧的文件路径，现在已经无效
          console.log(`⚠️ 帖子 ${post._id} 包含旧的图片路径，清空images数组`);
          post.images = [];
          await post.save();
          migratedCount++;
        }
      }
    }

    console.log(`✅ 迁移完成:`);
    console.log(`   - 修复的帖子: ${migratedCount} 条`);
    console.log(`   - 删除的帖子: ${deletedCount} 条`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ 迁移失败:", error.message);
    process.exit(1);
  }
}

migrateOldPosts();
