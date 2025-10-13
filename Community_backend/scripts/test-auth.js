const mongoose = require("mongoose");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

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

// 测试认证流程
const testAuth = async () => {
  try {
    console.log("🔍 开始测试认证流程...");
    
    // 1. 查找所有用户
    const users = await User.find({});
    console.log("📊 数据库中的用户数量:", users.length);
    console.log("👥 用户列表:", users.map(u => ({ id: u._id, nickName: u.nickName, status: u.status })));
    
    // 2. 测试JWT生成和验证
    if (users.length > 0) {
      const testUser = users[0];
      console.log("🧪 使用用户进行JWT测试:", testUser.nickName);
      
      // 生成JWT
      const token = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET || "S3cReT_2025_Xyz!AbCdEfGh123456",
        { expiresIn: "7d" }
      );
      console.log("🔑 生成的JWT token:", token.substring(0, 50) + "...");
      
      // 验证JWT
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "S3cReT_2025_Xyz!AbCdEfGh123456"
      );
      console.log("✅ JWT解码成功，userId:", decoded.userId);
      
      // 查找用户
      const foundUser = await User.findById(decoded.userId);
      if (foundUser) {
        console.log("✅ 用户查找成功:", foundUser.nickName);
      } else {
        console.log("❌ 用户查找失败");
      }
    } else {
      console.log("⚠️ 数据库中没有用户，无法进行JWT测试");
    }
    
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
};

// 主函数
const main = async () => {
  await connectDB();
  await testAuth();
  process.exit(0);
};

main();


