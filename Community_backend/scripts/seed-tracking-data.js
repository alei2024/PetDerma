/**
 * 预置病灶跟踪 demo 数据
 *
 * 运行方式: cd Community_backend && node scripts/seed-tracking-data.js
 *
 * 会:
 *   1. 创建或复用一个 demo 用户(手机号 13800138888 / 密码 demo123)
 *   2. 给该用户创建一只 demo 宠物"小柴"(若已存在则复用)
 *   3. 创建一个跟踪档案"小柴 · 背部红斑(真菌感染)"
 *      内含 7 天的愈合记录,愈合分从 11 → 79 漂亮上扬
 *   4. 输出登录 token + 一段可贴到微信开发者工具 console 的代码
 */

require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Pet = require("../models/Pet");
const LesionTracking = require("../models/LesionTracking");
const { _computeHealingScore } = require("../controllers/trackingController");

const JWT_SECRET = process.env.JWT_SECRET || "S3cReT_2025_Xyz!AbCdEfGh123456";
const MONGO = process.env.MONGODB_URI || "mongodb://localhost:27017/PetDerma_Community";

const DEMO_PHONE = "13800138888";
const DEMO_PASSWORD = "demo123";
const DEMO_NICK = "Demo 小主人";
const DEMO_PET_NAME = "小柴";
const DEMO_LESION = "背部红斑";

async function main() {
  await mongoose.connect(MONGO);
  console.log("✅ 已连接 MongoDB");

  // 1. demo 用户(密码明文交给 User 模型的 pre-save 钩子加密,避免双重 hash)
  let user = await User.findOne({ phoneNumber: DEMO_PHONE });
  if (!user) {
    user = await User.create({
      phoneNumber: DEMO_PHONE,
      password: DEMO_PASSWORD,
      nickName: DEMO_NICK,
      avatar: { url: "/images/user_default.png", source: "upload" },
      status: "active",
    });
    console.log(`✅ 创建 demo 用户: ${user.nickName} (${user._id})`);
  } else {
    // 复用已有用户但强制重置密码,避免历史 seed 留下双 hash 的密码无法登录
    user.password = DEMO_PASSWORD;
    await user.save();
    console.log(`ℹ️  复用 demo 用户(已重置密码): ${user.nickName} (${user._id})`);
  }

  // 2. demo 宠物
  let pet = await Pet.findOne({ userId: user._id, name: DEMO_PET_NAME });
  if (!pet) {
    pet = await Pet.create({
      userId: user._id,
      name: DEMO_PET_NAME,
      type: "dog",
      breed: "柴犬",
      gender: "male",
      birthDate: new Date(2022, 5, 1),
      avatar: { url: "/images/default_pet.png", source: "default" },
    });
    console.log(`✅ 创建 demo 宠物: ${pet.name} (${pet._id})`);
  } else {
    console.log(`ℹ️  复用 demo 宠物: ${pet.name} (${pet._id})`);
  }

  // 3. 删除旧的同名跟踪档案,保证可重复运行
  const removed = await LesionTracking.deleteMany({
    userId: user._id,
    petId: pet._id,
    lesionName: DEMO_LESION,
  });
  if (removed.deletedCount > 0) {
    console.log(`🧹 清除 ${removed.deletedCount} 条旧的跟踪档案`);
  }

  // 6 天愈合曲线,每天对应一张策展过的真实犬皮肤病图
  // 图片由 scripts/fetch-curated-images.js 下载到 Front_Page/images/tracking/
  const recoveryPlan = [
    { dayOffset: -10, image: "/images/tracking/day1.jpg", severity: 4, rednessScore: 85, areaScore: 80, notes: "首次就诊,后腿大面积脱毛伴红肿,触摸有温度。诊断为疥螨/真菌混合感染。" },
    { dayOffset:  -8, image: "/images/tracking/day2.jpg", severity: 4, rednessScore: 70, areaScore: 65, notes: "用药第 2 天。皮肤可见多处红色凸起,瘙痒减轻一半。" },
    { dayOffset:  -6, image: "/images/tracking/day3.jpg", severity: 3, rednessScore: 50, areaScore: 50, notes: "脱毛区域不再扩大,皮肤开始平整,新毛初见生长。" },
    { dayOffset:  -4, image: "/images/tracking/day4.jpg", severity: 2, rednessScore: 30, areaScore: 30, notes: "红斑颜色变浅,残存局部热点,瘙痒基本消失。" },
    { dayOffset:  -2, image: "/images/tracking/day5.jpg", severity: 1, rednessScore: 15, areaScore: 18, notes: "肉眼基本痊愈,部分新毛已长回,继续用药巩固。" },
    { dayOffset:   0, image: "/images/tracking/day6.jpg", severity: 1, rednessScore:  5, areaScore:  5, notes: "🎉 完全愈合,毛发已基本长齐,瘙痒红肿全部消失。停药观察一周。" },
  ];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const entries = recoveryPlan.map((p) => {
    const score = _computeHealingScore({
      severity: p.severity,
      rednessScore: p.rednessScore,
      areaScore: p.areaScore,
    });
    return {
      imageList: [p.image],
      severity: p.severity,
      confidence: 80 + Math.floor(Math.random() * 15),
      rednessScore: p.rednessScore,
      areaScore: p.areaScore,
      healingScore: score,
      notes: p.notes,
      recordedAt: new Date(now + p.dayOffset * oneDay),
    };
  });

  const tracking = await LesionTracking.create({
    userId: user._id,
    petId: pet._id,
    petName: pet.name,
    petType: pet.type,
    lesionName: DEMO_LESION,
    bodyPart: "背部",
    diagnosisName: "真菌感染",
    status: "active",
    entries,
  });
  console.log(`✅ 创建跟踪档案: ${tracking.lesionName} (${tracking._id})`);
  console.log(`   愈合分数轨迹: ${entries.map((e) => e.healingScore).join(" → ")}`);

  // 4. 生成 JWT
  const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: "30d" });

  // 5. 输出
  console.log("\n========== 复制下面整段到微信开发者工具 console ==========\n");
  console.log(
    [
      `wx.setStorageSync('token', '${token}');`,
      `wx.setStorageSync('userId', '${user._id}');`,
      `wx.setStorageSync('userInfo', ${JSON.stringify({
        _id: user._id.toString(),
        userId: user._id.toString(),
        nickName: user.nickName,
        avatar: user.avatar,
      })});`,
      `wx.setStorageSync('petList', ${JSON.stringify([
        {
          id: pet._id.toString(),
          _id: pet._id.toString(),
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          avatar: pet.avatar,
        },
      ])});`,
      `console.log('✅ Demo 账号已就位,刷新即可');`,
    ].join("\n")
  );
  console.log("\n========================================================\n");

  console.log(`📌 demo 账户: 手机号 ${DEMO_PHONE} 密码 ${DEMO_PASSWORD}`);
  console.log(`📌 跟踪档案 ID: ${tracking._id}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed 失败:", err);
  process.exit(1);
});
