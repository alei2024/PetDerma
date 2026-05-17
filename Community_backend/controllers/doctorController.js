const HealthRecord = require("../models/HealthRecord");

// 获取授权给当前医生的病例列表
const getCases = async (req, res) => {
  try {
    const doctorId = req.user.userId;

    let cases = await HealthRecord.find({
      sharedWith: doctorId,
      status: "active",
    })
      .populate("userId", "nickName avatar phoneNumber")
      .populate("petId", "name avatar species breed")
      .sort({ createdAt: -1 });

    // 开发/演示模式：如果没有共享记录，显示自己的记录
    if (cases.length === 0 && process.env.NODE_ENV !== "production") {
      // 自动将自己的记录加入共享列表（方便演示）
      const ownRecords = await HealthRecord.find({
        userId: doctorId,
        status: "active",
      })
        .populate("userId", "nickName avatar phoneNumber")
        .populate("petId", "name avatar species breed")
        .sort({ createdAt: -1 });

      if (ownRecords.length > 0) {
        // 自动共享给自己
        await HealthRecord.updateMany(
          { userId: doctorId, status: "active", sharedWith: { $ne: doctorId } },
          { $addToSet: { sharedWith: doctorId } }
        );
        cases = ownRecords;
      }
    }

    const total = cases.length;
    const pendingReview = cases.filter((c) => !c.aiSummary).length;
    const followUpNeeded = cases.filter(
      (c) => c.followUp && c.followUp.needed && !c.followUp.completed
    ).length;

    res.json({
      success: true,
      data: {
        cases,
        stats: { total, pendingReview, followUpNeeded },
      },
    });
  } catch (error) {
    console.error("获取病例列表失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 获取单个病例详情
const getCaseDetail = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { id } = req.params;

    const record = await HealthRecord.findOne({
      _id: id,
      sharedWith: doctorId,
      status: "active",
    })
      .populate("userId", "nickName avatar phoneNumber")
      .populate("petId", "name avatar species breed");

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "病例不存在或无访问权限",
      });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error("获取病例详情失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 生成 AI 病例摘要
const generateSummary = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { id } = req.params;

    const record = await HealthRecord.findOne({
      _id: id,
      sharedWith: doctorId,
      status: "active",
    })
      .populate("userId", "nickName")
      .populate("petId", "name species breed age");

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "病例不存在或无访问权限",
      });
    }

    // 自动生成摘要（演示用）
    const pet = record.petId || {};
    const owner = record.userId || {};
    const diseaseHistory = record.skinDiseaseHistory || [];
    const latestDisease =
      diseaseHistory.length > 0
        ? diseaseHistory[diseaseHistory.length - 1]
        : null;

    const summaryLines = [];

    if (pet.name) {
      summaryLines.push(`患宠：${pet.name}（${pet.species || "未知"}）`);
    }
    if (owner.nickName) {
      summaryLines.push(`宠主：${owner.nickName}`);
    }
    if (record.weight) {
      summaryLines.push(`体重：${record.weight}kg`);
    }
    if (latestDisease) {
      summaryLines.push(
        `诊断疾病：${latestDisease.diseaseName || "未知"}`
      );
      if (latestDisease.symptoms && latestDisease.symptoms.length > 0) {
        summaryLines.push(
          `症状表现：${latestDisease.symptoms.join("、")}`
        );
      }
      if (latestDisease.affectedAreas && latestDisease.affectedAreas.length > 0) {
        summaryLines.push(
          `患病部位：${latestDisease.affectedAreas.join("、")}`
        );
      }
    }
    if (record.allergies && record.allergies !== "无") {
      summaryLines.push(`过敏史：${record.allergies}`);
    }

    // 计算严重程度趋势
    const severityLevels = diseaseHistory.map((h) => {
      const count = (h.symptoms || []).length + (h.affectedAreas || []).length;
      if (count >= 4) return "重";
      if (count >= 2) return "中";
      return "轻";
    });
    const currentSeverity = latestDisease
      ? severityLevels[severityLevels.length - 1] || "轻"
      : "未知";

    const summary = summaryLines.join("；");
    const trend =
      diseaseHistory.length > 1
        ? `该宠物共有 ${diseaseHistory.length} 次就诊记录，病情发展已追踪。`
        : "初次就诊，建议持续观察。";

    // 保存生成的摘要
    record.aiSummary = summary;
    record.severity = currentSeverity;
    record.trend = trend;
    await record.save();

    res.json({
      success: true,
      data: {
        aiSummary: summary,
        severity: currentSeverity,
        trend,
      },
    });
  } catch (error) {
    console.error("生成AI摘要失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 更新复诊提醒
const updateFollowUp = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { id } = req.params;
    const { needed, date, note } = req.body;

    const record = await HealthRecord.findOne({
      _id: id,
      sharedWith: doctorId,
      status: "active",
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "病例不存在或无访问权限",
      });
    }

    record.followUp = {
      needed: needed !== undefined ? needed : record.followUp.needed,
      date: date || record.followUp.date,
      note: note !== undefined ? note : record.followUp.note,
      completed: false,
    };

    await record.save();

    res.json({
      success: true,
      message: "复诊提醒已更新",
      data: { followUp: record.followUp },
    });
  } catch (error) {
    console.error("更新复诊提醒失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 完成复诊
const completeFollowUp = async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const { id } = req.params;

    const record = await HealthRecord.findOne({
      _id: id,
      sharedWith: doctorId,
      status: "active",
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "病例不存在或无访问权限",
      });
    }

    record.followUp.completed = true;
    await record.save();

    res.json({
      success: true,
      message: "复诊已完成",
      data: { followUp: record.followUp },
    });
  } catch (error) {
    console.error("完成复诊失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 播种演示数据（将当前用户的记录共享给自己并添加摘要）
const seedDemoData = async (req, res) => {
  try {
    const userId = req.user.userId;

    const records = await HealthRecord.find({ userId, status: "active" });
    let count = 0;

    for (const record of records) {
      const diseaseList = (record.skinDiseaseHistory || []).map((d) => d.diseaseName).filter(Boolean);
      const symptomList = (record.skinDiseaseHistory || []).flatMap((d) => d.symptoms || []);
      const areaList = (record.skinDiseaseHistory || []).flatMap((d) => d.affectedAreas || []);

      // 共享给自己
      if (!record.sharedWith.some((id) => id.toString() === userId.toString())) {
        record.sharedWith.push(userId);
      }

      // 生成 AI 摘要
      if (!record.aiSummary) {
        const parts = [];
        if (record.petId) parts.push(`患宠 ID：${record.petId}`);
        if (diseaseList.length) parts.push(`诊断疾病：${diseaseList.join("、")}`);
        if (symptomList.length) parts.push(`症状表现：${symptomList.join("、")}`);
        if (areaList.length) parts.push(`患病部位：${areaList.join("、")}`);
        record.aiSummary = parts.join("；") || "暂无诊断数据，建议尽快就诊。";
        record.trend =
          (record.skinDiseaseHistory || []).length > 1
            ? `该宠物共有 ${record.skinDiseaseHistory.length} 次就诊记录，病情发展已追踪。`
            : "初次就诊，建议持续观察。";
        record.severity =
          symptomList.length + areaList.length >= 4 ? "重" :
          symptomList.length + areaList.length >= 2 ? "中" : "轻";
      }

      await record.save();
      count++;
    }

    res.json({
      success: true,
      message: `演示数据已就绪，共处理 ${count} 条记录`,
      data: { count },
    });
  } catch (error) {
    console.error("播种演示数据失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

module.exports = {
  getCases,
  getCaseDetail,
  generateSummary,
  updateFollowUp,
  completeFollowUp,
  seedDemoData,
};
