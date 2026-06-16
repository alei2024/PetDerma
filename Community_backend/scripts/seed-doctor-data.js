/**
 * 医生端测试数据种子脚本
 * 运行方式: node scripts/seed-doctor-data.js [用户ID]
 *
 * 作用: 将指定用户的健康记录标记为共享给医生端演示
 * 如果未指定用户ID，会为所有有健康记录的用户创建共享
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("../config/database");
const HealthRecord = require("../models/HealthRecord");

async function seedDoctorData(targetUserId) {
  try {
    await connectDB();
    console.log("✅ 数据库已连接");

    let query = {};
    if (targetUserId) {
      query = { userId: new mongoose.Types.ObjectId(targetUserId) };
    }

    const records = await HealthRecord.find({ ...query, status: "active" });
    console.log(`📊 找到 ${records.length} 条活跃健康记录`);

    let updated = 0;
    for (const record of records) {
      // 将记录共享给记录的所有者（演示模式）
      if (!record.sharedWith || record.sharedWith.length === 0) {
        record.sharedWith = [record.userId];
        // 添加一些演示用的摘要数据
        if (!record.aiSummary) {
          const petName = "宠物";
          const diseaseList = (record.skinDiseaseHistory || [])
            .map((d) => d.diseaseName)
            .filter(Boolean);
          record.aiSummary = `患宠：${petName}；诊断疾病：${diseaseList.join("、") || "暂无"}。`;
          record.severity = "轻";
          record.trend = "初次就诊，建议持续观察。";
        }
        await record.save();
        updated++;
        console.log(`  ✅ 已更新记录 ${record._id}`);
      }
    }

    console.log(`\n🎉 完成！共更新 ${updated} 条记录`);
    process.exit(0);
  } catch (error) {
    console.error("❌ 种子数据脚本失败:", error);
    process.exit(1);
  }
}

const targetId = process.argv[2];
seedDoctorData(targetId);
