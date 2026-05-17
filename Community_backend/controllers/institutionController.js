const Institution = require("../models/Institution");
const PreConsultReport = require("../models/PreConsultReport");
const Appointment = require("../models/Appointment");

// ==================== 机构注册/认证 ====================

// 提交入驻申请
exports.register = async (req, res) => {
  try {
    const { name, type, contact, phone, address, description, licenseUrl } = req.body;

    if (!name || !contact || !phone) {
      return res.status(400).json({ success: false, message: "请填写必填信息" });
    }

    const existing = await Institution.findOne({ userId: req.user.userId });
    if (existing) {
      return res.status(400).json({ success: false, message: "您已提交过入驻申请" });
    }

    const typeMap = { hospital: "宠物医院", clinic: "宠物诊所", care: "护理店" };

    const institution = new Institution({
      userId: req.user.userId,
      name,
      type,
      typeText: typeMap[type] || type,
      contact,
      phone,
      address,
      description: description || "",
      licenseUrl: licenseUrl || "",
      status: "pending",
    });

    await institution.save();

    res.json({
      success: true,
      message: "入驻申请已提交，等待审核",
      data: institution,
    });
  } catch (error) {
    console.error("机构注册失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 获取机构资料
exports.getProfile = async (req, res) => {
  try {
    const institution = await Institution.findOne({ userId: req.user.userId });
    if (!institution) {
      return res.status(404).json({ success: false, message: "机构不存在" });
    }
    res.json({ success: true, data: institution });
  } catch (error) {
    console.error("获取机构资料失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 更新机构资料
exports.updateProfile = async (req, res) => {
  try {
    const updateData = req.body;
    const institution = await Institution.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: updateData },
      { new: true }
    );
    if (!institution) {
      return res.status(404).json({ success: false, message: "机构不存在" });
    }
    res.json({ success: true, message: "资料已更新", data: institution });
  } catch (error) {
    console.error("更新机构资料失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 获取附近机构
exports.getNearby = async (req, res) => {
  try {
    const { lat, lng, type } = req.query;

    let query = { status: "approved" };
    if (type) {
      query.type = type;
    }

    let institutions;
    if (lat && lng) {
      institutions = await Institution.aggregate([
        { $match: query },
        {
          $geoNear: {
            near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
            distanceField: "distance",
            spherical: true,
            maxDistance: 10000,
          },
        },
        { $limit: 20 },
      ]);
    } else {
      institutions = await Institution.find(query).limit(20);
    }

    res.json({ success: true, data: institutions });
  } catch (error) {
    console.error("获取附近机构失败:", error);
    // 返回空列表而不是报错
    res.json({ success: true, data: [] });
  }
};

// ==================== AI预问诊报告 ====================

// 接收AI预问诊报告
exports.receiveReport = async (req, res) => {
  try {
    const reportData = req.body;

    const report = new PreConsultReport({
      institutionId: reportData.institutionId || null,
      userId: req.user.userId,
      petName: reportData.petName || "",
      petType: reportData.petType || "",
      petBreed: reportData.petBreed || "",
      petAvatar: reportData.petAvatar || "",
      ownerName: reportData.ownerName || req.user.nickname || "",
      ownerPhone: reportData.ownerPhone || "",
      diseaseName: reportData.diseaseName || "",
      severity: reportData.severity || "待评估",
      confidence: reportData.confidence || 0,
      description: reportData.description || "",
      aiSummary: reportData.aiSummary || "",
      symptoms: reportData.symptoms || [],
      affectedAreas: reportData.affectedAreas || [],
      weight: reportData.weight || "",
      allergies: reportData.allergies || "",
      sterilized: reportData.sterilized || "未知",
      recentContact: reportData.recentContact || "",
      images: reportData.images || [],
      needCareAdvice: reportData.needCareAdvice || false,
      source: reportData.source || "user",
      status: "pending",
    });

    await report.save();

    res.json({ success: true, message: "报告已接收", data: report });
  } catch (error) {
    console.error("接收报告失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 发送报告到机构（宠主端）
exports.sendReport = async (req, res) => {
  try {
    const { institutionId, institutionName, reportData } = req.body;

    if (!institutionId) {
      return res.status(400).json({ success: false, message: "请选择机构" });
    }

    const report = new PreConsultReport({
      institutionId,
      userId: req.user.userId,
      petName: reportData.petName || "",
      petType: reportData.petType || "",
      diseaseName: reportData.diseaseName || "",
      severity: reportData.severity || "待评估",
      confidence: reportData.confidence || 0,
      description: reportData.description || "",
      aiSummary: reportData.aiSummary || "",
      symptoms: reportData.symptoms || [],
      affectedAreas: reportData.affectedAreas || [],
      weight: reportData.weight || "",
      allergies: reportData.allergies || "",
      sterilized: reportData.sterilized || "未知",
      recentContact: reportData.recentContact || "",
      images: reportData.images || [],
      needCareAdvice: reportData.needCareAdvice || false,
      source: "user",
      status: "pending",
    });

    await report.save();

    res.json({
      success: true,
      message: `报告已发送给 ${institutionName}`,
      data: report,
    });
  } catch (error) {
    console.error("发送报告失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 获取机构收到的报告列表
exports.getReports = async (req, res) => {
  try {
    const institution = await Institution.findOne({ userId: req.user.userId });
    if (!institution) {
      return res.status(404).json({ success: false, message: "机构不存在" });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const query = { institutionId: institution._id };
    if (status) query.status = status;

    const total = await PreConsultReport.countDocuments(query);
    const reports = await PreConsultReport.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const stats = {
      pending: await PreConsultReport.countDocuments({ institutionId: institution._id, status: "pending" }),
      read: await PreConsultReport.countDocuments({ institutionId: institution._id, status: "read" }),
      completed: await PreConsultReport.countDocuments({ institutionId: institution._id, status: "completed" }),
      total,
    };

    res.json({ success: true, data: { reports, stats } });
  } catch (error) {
    console.error("获取报告列表失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 获取报告详情
exports.getReportDetail = async (req, res) => {
  try {
    const report = await PreConsultReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "报告不存在" });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    console.error("获取报告详情失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 标记报告为已读
exports.markReportRead = async (req, res) => {
  try {
    const report = await PreConsultReport.findByIdAndUpdate(
      req.params.id,
      { status: "read" },
      { new: true }
    );
    if (!report) {
      return res.status(404).json({ success: false, message: "报告不存在" });
    }
    res.json({ success: true, message: "已标记为已读", data: report });
  } catch (error) {
    console.error("标记报告失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// ==================== 预约管理 ====================

// 创建预约
exports.createAppointment = async (req, res) => {
  try {
    const { institutionId, petName, petType, ownerName, ownerPhone, service, date, time, notes } = req.body;

    if (!institutionId || !petName || !date || !time) {
      return res.status(400).json({ success: false, message: "请填写完整的预约信息" });
    }

    const appointment = new Appointment({
      institutionId,
      userId: req.user.userId,
      petName,
      petType: petType || "",
      ownerName: ownerName || "",
      ownerPhone: ownerPhone || "",
      service: service || "",
      date,
      time,
      notes: notes || "",
      status: "pending",
    });

    await appointment.save();

    res.json({ success: true, message: "预约已提交", data: appointment });
  } catch (error) {
    console.error("创建预约失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 获取机构预约列表
exports.getAppointments = async (req, res) => {
  try {
    const institution = await Institution.findOne({ userId: req.user.userId });
    if (!institution) {
      return res.status(404).json({ success: false, message: "机构不存在" });
    }

    const { date, status } = req.query;
    const query = { institutionId: institution._id };
    if (date) query.date = date;
    if (status) query.status = status;

    const appointments = await Appointment.find(query)
      .sort({ time: 1 });

    const stats = {
      pending: await Appointment.countDocuments({ institutionId: institution._id, status: "pending" }),
      confirmed: await Appointment.countDocuments({ institutionId: institution._id, status: "confirmed" }),
      completed: await Appointment.countDocuments({ institutionId: institution._id, status: "completed" }),
      cancelled: await Appointment.countDocuments({ institutionId: institution._id, status: "cancelled" }),
    };

    res.json({ success: true, data: { appointments, stats } });
  } catch (error) {
    console.error("获取预约列表失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};

// 更新预约状态
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status, statusText } = req.body;
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "无效的状态" });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: "预约不存在" });
    }

    res.json({ success: true, message: `预约已${statusText || status}`, data: appointment });
  } catch (error) {
    console.error("更新预约状态失败:", error);
    res.status(500).json({ success: false, message: "服务器内部错误" });
  }
};
