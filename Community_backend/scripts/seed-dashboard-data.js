/**
 * 给数据大屏注入 demo 诊断记录,让图表丰满好看
 * 运行: cd Community_backend && node scripts/seed-dashboard-data.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const DiagnosisRecord = require("../models/DiagnosisRecord");
const User = require("../models/User");
const Pet = require("../models/Pet");

const MONGO =
  process.env.MONGODB_URI || "mongodb://localhost:27017/PetDerma_Community";

const DISEASES = [
  { name: "真菌感染", weight: 22 },
  { name: "过敏性皮炎", weight: 18 },
  { name: "蠕形螨病", weight: 14 },
  { name: "癣病", weight: 12 },
  { name: "细菌性脓皮病", weight: 10 },
  { name: "湿疹", weight: 8 },
  { name: "脱毛症", weight: 6 },
  { name: "热点性皮炎", weight: 5 },
  { name: "皮肤瘙痒症", weight: 5 },
];

function pickWeighted(items) {
  const total = items.reduce((a, b) => a + b.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    if (r < it.weight) return it.name;
    r -= it.weight;
  }
  return items[0].name;
}

async function main() {
  await mongoose.connect(MONGO);
  console.log("✅ 已连接 MongoDB");

  const user = await User.findOne({ phoneNumber: "13800138888" });
  if (!user) {
    console.error("❌ 找不到 demo 用户,请先 node scripts/seed-tracking-data.js");
    process.exit(1);
  }
  let pet = await Pet.findOne({ userId: user._id, name: "小柴" });
  if (!pet) {
    console.error("❌ 找不到 demo 宠物");
    process.exit(1);
  }

  // 清旧 demo 记录
  await DiagnosisRecord.deleteMany({ userId: user._id });

  // 70 条诊断记录,日期分布在最近 7 天
  const records = [];
  for (let i = 0; i < 70; i++) {
    const dayOffset = Math.floor(Math.random() * 7); // 0..6 天前
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));

    const disease = pickWeighted(DISEASES);
    const severity = 1 + Math.floor(Math.random() * 5);
    const confidence = 60 + Math.floor(Math.random() * 35);

    records.push({
      userId: user._id,
      petId: pet._id,
      petName: pet.name,
      petType: pet.type,
      images: [],
      symptomDescription: "demo 症状描述",
      diagnosisResult: {
        diseaseName: disease,
        confidence,
        severity,
        description: `${disease}是宠物常见皮肤问题之一。`,
        suggestions: ["保持患处清洁干燥", "定期复诊"],
      },
      createdAt: date,
      updatedAt: date,
    });
  }

  // bulk insert(忽略 timestamps:true)
  await DiagnosisRecord.collection.insertMany(records);
  console.log(`✅ 写入 ${records.length} 条 demo 诊断记录`);

  // 统计预览
  const counts = {};
  records.forEach((r) => {
    const n = r.diagnosisResult.diseaseName;
    counts[n] = (counts[n] || 0) + 1;
  });
  console.log("📊 病种分布预览:");
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([n, c]) => console.log(`   - ${n}: ${c}`));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed 失败:", err);
  process.exit(1);
});
