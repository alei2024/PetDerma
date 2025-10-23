const DiagnosisRecord = require("../models/DiagnosisRecord");
const Pet = require("../models/Pet");
const HealthRecord = require("../models/HealthRecord");
const Image = require("../models/Image");
const mongoose = require("mongoose");

// 创建诊断记录
const createDiagnosisRecord = async (req, res) => {
  try {
    const {
      petId,
      petName,
      petType,
      images,
      symptomDescription,
      diagnosisResult,
    } = req.body;

    const userId = req.user.userId;

    // 验证必填字段
    if (!petId || !petName || !petType || !symptomDescription || !diagnosisResult) {
      return res.status(400).json({
        success: false,
        message: "缺少必填字段",
      });
    }

    // 验证宠物是否属于当前用户
    const pet = await Pet.findByUserAndId(userId, petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "宠物不存在或不属于当前用户",
      });
    }

    // 处理图片上传（简化版本，暂时跳过图片处理）
    let imageIds = [];
    if (images && images.length > 0) {
      console.log(`收到 ${images.length} 张图片，暂时跳过图片处理`);
      // 暂时不处理图片，直接创建诊断记录
    }

    // 创建诊断记录
    const diagnosisRecord = new DiagnosisRecord({
      userId,
      petId,
      petName,
      petType,
      images: imageIds,
      symptomDescription,
      diagnosisResult,
      isFavorite: true, // 显式设置为true，确保新创建的记录默认被收藏
    });

    const savedRecord = await diagnosisRecord.save();
    await savedRecord.populate("images");

    res.status(200).json({
      success: true,
      message: "诊断记录创建成功",
      data: savedRecord,
    });
  } catch (error) {
    console.error("创建诊断记录失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
      error: error.message,
    });
  }
};

// 获取用户的诊断记录列表
const getDiagnosisRecords = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, favorite } = req.query;

    const query = { userId, status: "active" };
    
    // 如果请求收藏的记录
    if (favorite === "true") {
      query.isFavorite = true;
    }

    const records = await DiagnosisRecord.find(query)
      .populate("images")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DiagnosisRecord.countDocuments(query);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error("获取诊断记录失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
      error: error.message,
    });
  }
};

// 获取单个诊断记录详情
const getDiagnosisRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const record = await DiagnosisRecord.findOne({
      _id: id,
      userId,
      status: "active",
    }).populate("images");

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "诊断记录不存在",
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("获取诊断记录详情失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
      error: error.message,
    });
  }
};

// 收藏/取消收藏诊断记录
const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const record = await DiagnosisRecord.findOne({
      _id: id,
      userId,
      status: "active",
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "诊断记录不存在",
      });
    }

    record.isFavorite = !record.isFavorite;
    await record.save();

    res.json({
      success: true,
      message: record.isFavorite ? "收藏成功" : "取消收藏成功",
      data: {
        isFavorite: record.isFavorite,
      },
    });
  } catch (error) {
    console.error("切换收藏状态失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
      error: error.message,
    });
  }
};

// 删除诊断记录
const deleteDiagnosisRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log('删除诊断记录请求:', { id, userId });

    const record = await DiagnosisRecord.findOne({
      _id: id,
      userId,
      status: "active",
    });

    if (!record) {
      console.log('诊断记录不存在:', { id, userId });
      return res.status(404).json({
        success: false,
        message: "诊断记录不存在",
      });
    }

    console.log('找到诊断记录:', record._id);
    
    // 真正的数据库删除（物理删除）
    await DiagnosisRecord.deleteOne({ _id: id });

    console.log('诊断记录已从数据库中物理删除:', record._id);

    res.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除诊断记录失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
      error: error.message,
    });
  }
};

// 获取诊断统计信息
const getDiagnosisStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const totalRecords = await DiagnosisRecord.countDocuments({
      userId,
      status: "active",
    });

    const favoriteRecords = await DiagnosisRecord.countDocuments({
      userId,
      status: "active",
      isFavorite: true,
    });

    // 按疾病类型统计
    const diseaseStats = await DiagnosisRecord.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: "active",
        },
      },
      {
        $group: {
          _id: "$diagnosisResult.diseaseName",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    res.json({
      success: true,
      data: {
        totalRecords,
        favoriteRecords,
        diseaseStats,
      },
    });
  } catch (error) {
    console.error("获取诊断统计失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
      error: error.message,
    });
  }
};

// 格式化数据为Coze智能体输入格式
const formatDataForCoze = (diagnosisRecord, pet, healthRecord) => {
  // 计算年龄
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const age = calculateAge(pet.birthDate);

  // 格式化既往皮肤病史
  const formatSkinDiseaseHistory = (history) => {
    if (!history || history.length === 0) return [];
    
    return history.map(record => ({
      startDate: record.startDate,
      diseaseName: record.diseaseName,
      affectedAreas: record.affectedAreas || [],
      symptoms: record.symptoms || [],
      medication: record.medication || "",
      isCured: record.isCured,
      notes: record.notes || ""
    }));
  };

  // 格式化概率信息
  const formatProbabilities = (probabilities) => {
    if (!probabilities || probabilities.length === 0) return [];
    
    return probabilities.map(prob => ({
      class: prob.class,
      diseaseName: prob.diseaseName,
      probability: prob.probability
    }));
  };

  return {
    petInfo: {
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      gender: pet.gender,
      age: age,
      notes: pet.notes || ""
    },
    currentDiagnosis: {
      symptomDescription: diagnosisRecord.symptomDescription,
      diseaseName: diagnosisRecord.diagnosisResult.diseaseName,
      confidence: diagnosisRecord.diagnosisResult.confidence,
      severity: diagnosisRecord.diagnosisResult.severity,
      description: diagnosisRecord.diagnosisResult.description,
      allProbabilities: formatProbabilities(diagnosisRecord.diagnosisResult.allProbabilities)
    },
    healthProfile: {
      currentWeight: healthRecord?.weight || null,
      allergies: healthRecord?.allergies || "无",
      sterilized: healthRecord?.sterilized || "否",
      deworming: {
        frequency: healthRecord?.deworming?.frequency || "从不",
        lastDate: healthRecord?.deworming?.lastDate || null
      },
      recentContact: healthRecord?.recentContact || "",
      skinDiseaseHistory: formatSkinDiseaseHistory(healthRecord?.skinDiseaseHistory)
    }
  };
};

// 整合PetData用于Coze智能体
const integratePetData = async (userId, petId) => {
  try {
    // 获取当前宠物信息
    const pet = await Pet.findByUserAndId(userId, petId);
    if (!pet) {
      throw new Error("宠物不存在");
    }

    // 获取该宠物最新的收藏诊断记录
    let latestFavoriteRecord = await DiagnosisRecord.findOne({
      userId,
      petId: petId,
      status: "active",
      isFavorite: true
    }).sort({ createdAt: -1 });

    // 如果没有收藏的诊断记录，尝试获取最新的诊断记录
    if (!latestFavoriteRecord) {
      console.log('没有收藏的诊断记录，尝试获取最新的诊断记录');
      latestFavoriteRecord = await DiagnosisRecord.findOne({
        userId,
        petId: petId,
        status: "active"
      }).sort({ createdAt: -1 });
    }

    // 如果仍然没有诊断记录，抛出错误提示用户先进行诊断
    if (!latestFavoriteRecord) {
      console.log('没有找到任何诊断记录，需要先进行皮肤病诊断');
      throw new Error("请先进行皮肤病诊断，然后再进行智能问诊");
    }

    // 获取该宠物的健康档案
    const healthRecord = await HealthRecord.findByUserAndPet(userId, petId);

    // 格式化数据
    const petData = formatDataForCoze(latestFavoriteRecord, pet, healthRecord);
    
    return petData;
  } catch (error) {
    console.error("整合PetData失败:", error);
    throw error;
  }
};

// 获取用于Coze智能体的格式化数据
const getCozeInputData = async (req, res) => {
  try {
    const { petId } = req.params;
    const userId = req.user.userId;

    // 验证参数
    if (!petId) {
      return res.status(400).json({
        success: false,
        message: "缺少宠物ID参数",
      });
    }

    // 整合PetData
    const petData = await integratePetData(userId, petId);

    res.json({
      success: true,
      message: "PetData整合成功",
      data: petData,
    });
  } catch (error) {
    console.error("获取Coze输入数据失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
      error: error.message,
    });
  }
};

module.exports = {
  createDiagnosisRecord,
  getDiagnosisRecords,
  getDiagnosisRecordById,
  toggleFavorite,
  deleteDiagnosisRecord,
  getDiagnosisStats,
  getCozeInputData,
  integratePetData,
  formatDataForCoze,
};
