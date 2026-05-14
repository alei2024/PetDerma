const DiagnosisRecord = require("../models/DiagnosisRecord");
const LesionTracking = require("../models/LesionTracking");
const Hospital = require("../models/Hospital");
const User = require("../models/User");
const Pet = require("../models/Pet");
const Post = require("../models/Post");

// GET /api/dashboard/stats —— 大屏聚合
exports.getStats = async (req, res) => {
  try {
    const [
      diagnosisCount,
      trackingCount,
      userCount,
      petCount,
      hospitalCount,
      recommendedHospitals,
      postCount,
    ] = await Promise.all([
      DiagnosisRecord.countDocuments({}).catch(() => 0),
      LesionTracking.countDocuments({}).catch(() => 0),
      User.countDocuments({}).catch(() => 0),
      Pet.countDocuments({}).catch(() => 0),
      Hospital.countDocuments({}).catch(() => 0),
      Hospital.countDocuments({ isRecommended: true }).catch(() => 0),
      Post.countDocuments({}).catch(() => 0),
    ]);

    // 病种分布(取诊断记录里的 diseaseName,统计前 6)
    let diseaseDistribution = [];
    try {
      diseaseDistribution = await DiagnosisRecord.aggregate([
        {
          $group: {
            _id: "$diagnosisResult.diseaseName",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 6 },
        { $project: { name: "$_id", count: 1, _id: 0 } },
      ]);
    } catch (e) {
      diseaseDistribution = [];
    }

    // 最近 7 天诊断量(按天聚合)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let dailyDiagnoses = [];
    try {
      dailyDiagnoses = await DiagnosisRecord.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", count: 1, _id: 0 } },
      ]);
    } catch (e) {
      dailyDiagnoses = [];
    }

    // 跟踪档案的状态分布与平均愈合分
    let trackingStats = { active: 0, healed: 0, relapsed: 0, avgScore: 0 };
    try {
      const allTrack = await LesionTracking.find({}).lean();
      const active = allTrack.filter((t) => t.status === "active").length;
      const healed = allTrack.filter((t) => t.status === "healed").length;
      const relapsed = allTrack.filter((t) => t.status === "relapsed").length;
      const lastScores = allTrack
        .map((t) =>
          t.entries && t.entries.length
            ? t.entries[t.entries.length - 1].healingScore
            : null
        )
        .filter((s) => s != null);
      const avgScore =
        lastScores.length > 0
          ? Math.round(lastScores.reduce((a, b) => a + b, 0) / lastScores.length)
          : 0;
      trackingStats = { active, healed, relapsed, avgScore };
    } catch (e) {}

    // 医院覆盖城市
    let cityCoverage = [];
    try {
      cityCoverage = await Hospital.aggregate([
        { $group: { _id: "$city", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { city: "$_id", count: 1, _id: 0 } },
      ]);
    } catch (e) {}

    res.json({
      success: true,
      data: {
        cards: {
          diagnosisCount,
          trackingCount,
          userCount,
          petCount,
          hospitalCount,
          postCount,
        },
        diseaseDistribution,
        dailyDiagnoses,
        trackingStats,
        cityCoverage,
        recommendedHospitals,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("dashboard stats 失败:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
