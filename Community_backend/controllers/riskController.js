const Pet = require("../models/Pet");
const DiagnosisRecord = require("../models/DiagnosisRecord");

// 高风险品种列表(简化经验值,可后续扩展)
const HIGH_RISK_BREEDS = {
  // 真菌/癣
  fungal: ["波斯猫", "异国短毛猫", "苏格兰折耳猫", "金毛", "拉布拉多"],
  // 过敏
  allergy: ["法国斗牛犬", "斗牛犬", "拉布拉多", "金毛", "贵宾", "雪纳瑞"],
  // 螨虫/寄生虫
  mite: ["柴犬", "哈士奇", "金毛", "比熊"],
  // 细菌感染易感
  bacterial: ["斗牛犬", "巴哥", "沙皮", "斗牛獒"],
  // 皮肤敏感(综合)
  sensitive: ["贵宾", "比熊", "雪纳瑞", "法国斗牛犬", "波斯猫"],
};

const DIMENSIONS = [
  { key: "fungal", label: "真菌/癣类" },
  { key: "allergy", label: "过敏性皮炎" },
  { key: "mite", label: "螨虫/寄生虫" },
  { key: "bacterial", label: "细菌感染" },
  { key: "sensitive", label: "季节性敏感" },
];

function ageInYears(birthDate) {
  if (!birthDate) return 3;
  const ms = Date.now() - new Date(birthDate).getTime();
  return ms / (365 * 24 * 60 * 60 * 1000);
}

// 当前季节风险加成(北半球简化版)
function seasonalBoost() {
  const m = new Date().getMonth() + 1;
  // 春末夏季湿热:真菌、螨虫、过敏高发
  if (m >= 5 && m <= 9) {
    return { fungal: 12, allergy: 10, mite: 15, bacterial: 6, sensitive: 8 };
  }
  // 换季 3/4/10/11
  if ([3, 4, 10, 11].includes(m)) {
    return { fungal: 5, allergy: 14, mite: 6, bacterial: 4, sensitive: 12 };
  }
  // 冬季干燥
  return { fungal: 3, allergy: 6, mite: 2, bacterial: 4, sensitive: 10 };
}

function clamp(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function score(pet, history, season) {
  const breed = pet?.breed || "";
  const age = ageInYears(pet?.birthDate);
  const ageRisk = age < 1 ? 12 : age > 8 ? 14 : 0; // 幼年和老年风险高

  const out = {};
  for (const dim of DIMENSIONS) {
    let s = 30 + (season[dim.key] || 0) + ageRisk;
    // 品种命中 +18
    if (HIGH_RISK_BREEDS[dim.key].some((b) => breed.includes(b))) s += 18;
    // 历史诊断同类 +12 每条(最多 +24)
    const hits = history[dim.key] || 0;
    s += Math.min(24, hits * 12);
    out[dim.key] = clamp(s);
  }
  return out;
}

function bucketHistory(records) {
  const counts = {
    fungal: 0,
    allergy: 0,
    mite: 0,
    bacterial: 0,
    sensitive: 0,
  };
  records.forEach((r) => {
    const name = (r.diagnosisResult?.diseaseName || "").toLowerCase();
    if (name.match(/真菌|癣/)) counts.fungal++;
    if (name.match(/过敏|湿疹/)) counts.allergy++;
    if (name.match(/螨|寄生/)) counts.mite++;
    if (name.match(/脓|细菌|感染/)) counts.bacterial++;
    if (name.match(/敏感|皮炎/)) counts.sensitive++;
  });
  return counts;
}

function makeAdvice(scores, pet) {
  const advice = [];
  if (scores.fungal >= 60)
    advice.push(`${pet?.name || "宠物"}所属品种皮肤褶皱多,建议每月使用抗真菌香波 1-2 次。`);
  if (scores.allergy >= 60)
    advice.push("换季时减少外出,室内使用空气净化器,排查食物过敏源。");
  if (scores.mite >= 60)
    advice.push("夏季加强体外驱虫,每月一次预防药物。");
  if (scores.bacterial >= 60)
    advice.push("避免长时间潮湿环境,洗澡后充分吹干。");
  if (scores.sensitive >= 60)
    advice.push("季节交替时观察是否瘙痒/红肿,异常变化及时记录。");
  if (advice.length === 0)
    advice.push("当前各项风险均低于警戒线,继续保持现有护理习惯即可。");
  return advice;
}

// GET /api/risk/:petId —— 风险评分
exports.getPetRisk = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId)
      return res.status(401).json({ success: false, message: "请先登录" });

    const pet = await Pet.findOne({ _id: req.params.petId, userId }).lean();
    if (!pet)
      return res
        .status(404)
        .json({ success: false, message: "未找到该宠物或无权访问" });

    const history = await DiagnosisRecord.find({ userId, petId: pet._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .catch(() => []);

    const buckets = bucketHistory(history);
    const season = seasonalBoost();
    const scores = score(pet, buckets, season);

    const radar = DIMENSIONS.map((d) => ({
      key: d.key,
      label: d.label,
      value: scores[d.key],
    }));

    const overall = clamp(
      radar.reduce((a, b) => a + b.value, 0) / radar.length
    );

    res.json({
      success: true,
      data: {
        pet: {
          id: pet._id,
          name: pet.name,
          breed: pet.breed,
          type: pet.type,
        },
        radar,
        overall,
        overallLabel:
          overall >= 70 ? "高风险" : overall >= 50 ? "中等风险" : "低风险",
        topRisk: radar.slice().sort((a, b) => b.value - a.value)[0],
        season: getSeasonName(),
        advice: makeAdvice(scores, pet),
        historyCount: history.length,
      },
    });
  } catch (err) {
    console.error("getPetRisk 失败:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

function getSeasonName() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "春季";
  if (m >= 6 && m <= 8) return "夏季";
  if (m >= 9 && m <= 11) return "秋季";
  return "冬季";
}
