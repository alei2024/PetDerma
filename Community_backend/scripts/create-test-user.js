const mongoose = require("mongoose");
const User = require("../models/User");

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/petderma", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ 数据库连接成功");
  } catch (error) {
    console.error("❌ 数据库连接失败:", error);
    process.exit(1);
  }
};

// 创建测试用户
const createTestUser = async () => {
  try {
    console.log("🔍 开始创建测试用户...");
    
    // 检查是否已存在测试用户
    const existingUser = await User.findOne({ phoneNumber: "13800138000" });
    if (existingUser) {
      console.log("⚠️ 测试用户已存在:", existingUser.nickName);
      return existingUser;
    }
    
    // 创建新用户
    const testUser = new User({
      phoneNumber: "13800138000",
      nickName: "测试用户",
      avatar: {
        url: "/images/user_default.png",
        source: "upload",
        key: "",
        wechatUrl: "",
      },
      status: "active",
    });
    
    await testUser.save();
    console.log("✅ 测试用户创建成功:", testUser.nickName, "ID:", testUser._id);
    return testUser;
    
  } catch (error) {
    console.error("❌ 创建测试用户失败:", error);
  }
};

// 主函数
const main = async () => {
  await connectDB();
  await createTestUser();
  process.exit(0);
};

main();


