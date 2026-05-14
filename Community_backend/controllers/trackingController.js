const LesionTracking = require("../models/LesionTracking");
const Pet = require("../models/Pet");

// ===== 愈合评分公式 =====
// healingScore = 100 - severity*12 - rednessScore*0.25 - areaScore*0.25
// severity=5,redness=100,area=100 -> 0(最差)
// severity=1,redness=10,area=10   -> ~83(轻微)
// severity=3,redness=50,area=50   -> ~39(中等)
function computeHealingScore({ severity, rednessScore = 50, areaScore = 50 }) {
  const raw = 100 - severity * 12 - rednessScore * 0.25 - areaScore * 0.25;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

// ===== 趋势分析 =====
function analyzeTrend(entries) {
  if (!entries || entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
  const scores = sorted.map((e) => e.healingScore);
  const current = scores[scores.length - 1];
  const previous = scores.length >= 2 ? scores[scores.length - 2] : null;

  // 最近最多5个点的简单线性回归(单位:每天的分数变化)
  const lastN = sorted.slice(-5);
  let slopePerDay = 0;
  if (lastN.length >= 2) {
    const t0 = new Date(lastN[0].recordedAt).getTime();
    const xs = lastN.map((e) => (new Date(e.recordedAt).getTime() - t0) / (1000 * 60 * 60 * 24));
    const ys = lastN.map((e) => e.healingScore);
    const n = xs.length;
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0,
      den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - meanX) * (ys[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    slopePerDay = den > 1e-6 ? num / den : 0;
  }

  // 趋势分类
  // 愈合阈值 85:severity 最小为 1 时本身已扣 12 分,
  // 95+ 不可达;85+ 表示"严重度=1 + 红肿/范围接近 0",视作基本愈合
  let trend, trendType, trendIcon;
  if (current >= 85) {
    trend = "已基本愈合";
    trendType = "healed";
    trendIcon = "✓";
  } else if (slopePerDay > 2) {
    const pct = previous ? Math.round(((current - previous) / Math.max(previous, 1)) * 100) : 0;
    trend = pct > 0 ? `好转中,较上次提升 ${pct}%` : "好转中";
    trendType = "improving";
    trendIcon = "↗";
  } else if (slopePerDay < -2) {
    trend = "恶化趋势,建议就医";
    trendType = "worsening";
    trendIcon = "↘";
  } else {
    trend = "病情稳定,继续观察";
    trendType = "stable";
    trendIcon = "→";
  }

  // 愈合天数预测(只在仍处恢复期 + 有上扬斜率时给)
  let daysToHeal = null;
  if (trendType !== "healed" && slopePerDay > 0.5 && current < 100) {
    const days = Math.ceil((100 - current) / slopePerDay);
    if (days > 0 && days <= 90) daysToHeal = days;
  }

  // 复发判定:历史出现过 >=85(已愈合) 后又跌到 <70
  let hasRelapsed = false;
  for (let i = 0; i < scores.length - 1; i++) {
    if (scores[i] >= 85) {
      const restMin = Math.min(...scores.slice(i + 1));
      if (restMin < 70) {
        hasRelapsed = true;
        break;
      }
    }
  }

  // 复诊建议
  const last3 = sorted.slice(-3);
  const needsRevisit =
    slopePerDay < -3 || (last3.length >= 3 && last3.every((e) => e.severity >= 4));

  return {
    currentScore: current,
    previousScore: previous,
    trend,
    trendType,
    trendIcon,
    daysToHeal,
    hasRelapsed,
    needsRevisit,
    slopePerDay: Number(slopePerDay.toFixed(2)),
    pointCount: scores.length,
  };
}

// ===== 控制器 =====

// POST /api/tracking 创建跟踪档案
exports.createTracking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId, petName, petType, lesionName, bodyPart, diagnosisName, firstEntry } = req.body;

    if (!petId || !lesionName) {
      return res.status(400).json({ success: false, message: "petId 和 lesionName 必填" });
    }

    // 校验宠物归属:防止把跟踪档案挂到他人宠物或不存在的宠物上
    const pet = await Pet.findOne({ _id: petId, userId });
    if (!pet) {
      return res.status(403).json({
        success: false,
        message: "未找到该宠物或无权操作",
      });
    }

    const doc = new LesionTracking({
      userId,
      petId,
      petName: petName || pet.name || "宠物",
      petType: petType || pet.type || "dog",
      lesionName,
      bodyPart: bodyPart || "未指定",
      diagnosisName: diagnosisName || "未诊断",
      entries: [],
    });

    if (firstEntry) {
      const score = computeHealingScore(firstEntry);
      doc.entries.push({ ...firstEntry, healingScore: score });
    }

    await doc.save();
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error("createTracking 失败:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/tracking?petId=xxx 列出该用户的所有档案(可按宠物过滤)
exports.listTracking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId, status } = req.query;
    const filter = { userId };
    if (petId) filter.petId = petId;
    if (status) filter.status = status;

    const docs = await LesionTracking.find(filter).sort({ updatedAt: -1 }).lean();

    const enriched = docs.map((doc) => {
      const analysis = analyzeTrend(doc.entries);
      return {
        ...doc,
        latestEntry: doc.entries.length > 0 ? doc.entries[doc.entries.length - 1] : null,
        analysis,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error("listTracking 失败:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/tracking/:id 详情(含趋势分析)
exports.getTracking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const doc = await LesionTracking.findOne({ _id: req.params.id, userId }).lean();
    if (!doc) return res.status(404).json({ success: false, message: "档案不存在" });

    const analysis = analyzeTrend(doc.entries);
    const sortedEntries = [...doc.entries].sort(
      (a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)
    );

    res.json({ success: true, data: { ...doc, entries: sortedEntries, analysis } });
  } catch (err) {
    console.error("getTracking 失败:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/tracking/:id/entry 追加新记录
exports.addEntry = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { imageList, severity, confidence, rednessScore, areaScore, notes, diagnosisRecordId } =
      req.body;

    if (severity == null) {
      return res.status(400).json({ success: false, message: "severity 必填" });
    }

    const doc = await LesionTracking.findOne({ _id: req.params.id, userId });
    if (!doc) return res.status(404).json({ success: false, message: "档案不存在" });

    const healingScore = computeHealingScore({ severity, rednessScore, areaScore });

    const entry = {
      imageList: imageList || [],
      severity,
      confidence: confidence || 0,
      rednessScore: rednessScore != null ? rednessScore : 50,
      areaScore: areaScore != null ? areaScore : 50,
      healingScore,
      notes: notes || "",
      recordedAt: new Date(),
      diagnosisRecordId,
    };
    doc.entries.push(entry);

    // 自动更新状态:愈合或复发(阈值 85)
    if (healingScore >= 85) doc.status = "healed";
    else if (doc.status === "healed" && healingScore < 70) doc.status = "relapsed";
    else if (doc.status !== "healed") doc.status = "active";

    await doc.save();

    const analysis = analyzeTrend(doc.entries);
    res.status(201).json({ success: true, data: { tracking: doc, analysis } });
  } catch (err) {
    console.error("addEntry 失败:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/tracking/:id 删除档案
exports.deleteTracking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await LesionTracking.deleteOne({ _id: req.params.id, userId });
    if (result.deletedCount === 0)
      return res.status(404).json({ success: false, message: "档案不存在" });
    res.json({ success: true });
  } catch (err) {
    console.error("deleteTracking 失败:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 暴露算法供 seed 脚本复用
exports._computeHealingScore = computeHealingScore;
exports._analyzeTrend = analyzeTrend;
