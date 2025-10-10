// 初始化测试用户脚本
const mongoose = require("mongoose");
const User = require("../models/User");

// 连接数据库
async function initTestUser() {
  try {
    // 连接MongoDB - 使用现有的数据库名称
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/PetDerma_Community";
    await mongoose.connect(mongoUri);
    console.log("✅ 数据库连接成功");

    // 测试用户数据
    const testUserId = "507f1f77bcf86cd799439011";
    const testUserData = {
      _id: new mongoose.Types.ObjectId(testUserId),
      openid: "test-openid-12345", // 注意是 openid 不是 openId
      unionId: "test-unionid-12345",
      nickName: "测试用户",
      avatar: {
        url: "/images/user_default.png",
        source: "upload",
        key: "user_default.png",
        wechatUrl: "",
      },
      gender: 0, // 未知
      city: "测试城市",
      province: "测试省份",
      country: "中国",
      language: "zh_CN",
      isActive: true,
      lastLoginAt: new Date(),
      settings: {
        privacy: {
          showRealName: false,
          showLocation: false,
          allowSearch: true,
        },
        notification: {
          likeNotification: true,
          commentNotification: true,
          followNotification: true,
          systemNotification: true,
        },
      },
      pets: [], // 空的宠物数组
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 检查用户是否已存在
    const existingUser = await User.findById(testUserId);
    if (existingUser) {
      console.log("⚠️ 测试用户已存在，更新用户信息...");
      await User.findByIdAndUpdate(testUserId, testUserData);
      console.log("✅ 测试用户信息已更新");
    } else {
      console.log("🔄 创建测试用户...");
      const testUser = new User(testUserData);
      await testUser.save();
      console.log("✅ 测试用户创建成功");
    }

    // 验证用户创建
    const user = await User.findById(testUserId);
    console.log("📋 测试用户信息:");
    console.log(`   ID: ${user._id}`);
    console.log(`   昵称: ${user.nickName}`);
    console.log(`   头像: ${user.avatar}`);
    console.log(`   创建时间: ${user.createdAt}`);

    console.log("🎉 测试用户初始化完成！");
  } catch (error) {
    console.error("❌ 初始化测试用户失败:", error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log("🔌 数据库连接已关闭");
    process.exit(0);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initTestUser();
}

module.exports = { initTestUser };
