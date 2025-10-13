const HealthRecord = require("../models/HealthRecord");
const Pet = require("../models/Pet");
const User = require("../models/User");

// 获取用户的健康档案列表
const getHealthRecords = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const healthRecords = await HealthRecord.findByUserId(userId);
    
    res.json({
      success: true,
      data: healthRecords,
    });
  } catch (error) {
    console.error("获取健康档案列表错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取单个宠物的健康档案
const getHealthRecord = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId } = req.params;
    
    // 验证宠物是否属于当前用户
    const pet = await Pet.findByUserAndId(userId, petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "宠物不存在",
      });
    }
    
    const healthRecord = await HealthRecord.findByUserAndPet(userId, petId);
    
    if (!healthRecord) {
      return res.json({
        success: true,
        data: null,
        message: "该宠物暂无健康档案",
      });
    }
    
    res.json({
      success: true,
      data: healthRecord,
    });
  } catch (error) {
    console.error("获取健康档案错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 创建或更新健康档案
const saveHealthRecord = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId } = req.params;
    const {
      weight,
      allergies,
      sterilized,
      deworming,
      recentContact,
      skinDiseaseHistory,
    } = req.body;

    // 验证宠物是否属于当前用户
    const pet = await Pet.findByUserAndId(userId, petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "宠物不存在",
      });
    }

    // 验证必填字段
    if (!sterilized || !deworming?.frequency) {
      return res.status(400).json({
        success: false,
        message: "绝育状态和驱虫频率是必填的",
      });
    }

    // 验证绝育状态
    if (!["是", "否"].includes(sterilized)) {
      return res.status(400).json({
        success: false,
        message: "绝育状态只能是'是'或'否'",
      });
    }

    // 验证驱虫频率
    if (!["每月", "每季度", "偶尔", "从不"].includes(deworming.frequency)) {
      return res.status(400).json({
        success: false,
        message: "驱虫频率只能是'每月'、'每季度'、'偶尔'或'从不'",
      });
    }

    // 验证皮肤病史数据
    if (skinDiseaseHistory && Array.isArray(skinDiseaseHistory)) {
      for (const history of skinDiseaseHistory) {
        if (!history.startDate || !history.diseaseName || !history.isCured) {
          return res.status(400).json({
            success: false,
            message: "皮肤病史中开始时间、患病名称和是否治愈是必填的",
          });
        }
        
        if (!["是", "否"].includes(history.isCured)) {
          return res.status(400).json({
            success: false,
            message: "是否治愈只能是'是'或'否'",
          });
        }
      }
    }

    // 查找现有健康档案
    let healthRecord = await HealthRecord.findByUserAndPet(userId, petId);

    const healthData = {
      userId,
      petId,
      weight: weight ? parseFloat(weight) : undefined,
      allergies: allergies || "无",
      sterilized,
      deworming: {
        frequency: deworming.frequency,
        lastDate: deworming.lastDate ? new Date(deworming.lastDate) : undefined,
      },
      recentContact: recentContact || "",
      skinDiseaseHistory: skinDiseaseHistory || [],
    };

    if (healthRecord) {
      // 更新现有健康档案
      healthRecord = await HealthRecord.findByIdAndUpdate(
        healthRecord._id,
        { ...healthData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
    } else {
      // 创建新健康档案
      healthRecord = new HealthRecord(healthData);
      await healthRecord.save();
    }

    res.json({
      success: true,
      message: "健康档案保存成功",
      data: healthRecord,
    });
  } catch (error) {
    console.error("保存健康档案错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 删除健康档案
const deleteHealthRecord = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId } = req.params;

    // 查找健康档案
    const healthRecord = await HealthRecord.findByUserAndPet(userId, petId);
    if (!healthRecord) {
      return res.status(404).json({
        success: false,
        message: "健康档案不存在",
      });
    }

    // 软删除
    await HealthRecord.findByIdAndUpdate(healthRecord._id, {
      status: "deleted",
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: "健康档案删除成功",
    });
  } catch (error) {
    console.error("删除健康档案错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 添加皮肤病史记录
const addSkinDiseaseHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId } = req.params;
    const skinDiseaseData = req.body;

    // 验证必填字段
    if (!skinDiseaseData.startDate || !skinDiseaseData.diseaseName || !skinDiseaseData.isCured) {
      return res.status(400).json({
        success: false,
        message: "开始时间、患病名称和是否治愈是必填的",
      });
    }

    // 验证是否治愈
    if (!["是", "否"].includes(skinDiseaseData.isCured)) {
      return res.status(400).json({
        success: false,
        message: "是否治愈只能是'是'或'否'",
      });
    }

    // 查找健康档案
    let healthRecord = await HealthRecord.findByUserAndPet(userId, petId);
    
    if (!healthRecord) {
      return res.status(404).json({
        success: false,
        message: "请先创建健康档案",
      });
    }

    // 添加皮肤病史记录
    const newHistory = {
      startDate: new Date(skinDiseaseData.startDate),
      diseaseName: skinDiseaseData.diseaseName,
      affectedAreas: skinDiseaseData.affectedAreas || [],
      symptoms: skinDiseaseData.symptoms || [],
      medication: skinDiseaseData.medication || "",
      isCured: skinDiseaseData.isCured,
      notes: skinDiseaseData.notes || "",
    };

    healthRecord.skinDiseaseHistory.push(newHistory);
    await healthRecord.save();

    res.json({
      success: true,
      message: "皮肤病史记录添加成功",
      data: healthRecord,
    });
  } catch (error) {
    console.error("添加皮肤病史记录错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 删除皮肤病史记录
const deleteSkinDiseaseHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId, historyId } = req.params;

    // 查找健康档案
    const healthRecord = await HealthRecord.findByUserAndPet(userId, petId);
    if (!healthRecord) {
      return res.status(404).json({
        success: false,
        message: "健康档案不存在",
      });
    }

    // 删除指定的皮肤病史记录
    healthRecord.skinDiseaseHistory = healthRecord.skinDiseaseHistory.filter(
      history => history._id.toString() !== historyId
    );
    
    await healthRecord.save();

    res.json({
      success: true,
      message: "皮肤病史记录删除成功",
      data: healthRecord,
    });
  } catch (error) {
    console.error("删除皮肤病史记录错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

module.exports = {
  getHealthRecords,
  getHealthRecord,
  saveHealthRecord,
  deleteHealthRecord,
  addSkinDiseaseHistory,
  deleteSkinDiseaseHistory,
};
