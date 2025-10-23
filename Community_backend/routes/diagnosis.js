const express = require("express");
const router = express.Router();
const { authenticateToken: auth } = require("../middleware/auth");
const {
  createDiagnosisRecord,
  getDiagnosisRecords,
  getDiagnosisRecordById,
  toggleFavorite,
  deleteDiagnosisRecord,
  getDiagnosisStats,
  getCozeInputData,
  integratePetData,
} = require("../controllers/diagnosisController");

// 创建诊断记录
router.post("/", auth, createDiagnosisRecord);

// 获取诊断记录列表
router.get("/", auth, getDiagnosisRecords);

// 获取诊断统计信息
router.get("/stats", auth, getDiagnosisStats);

// 获取单个诊断记录详情
router.get("/:id", auth, getDiagnosisRecordById);

// 收藏/取消收藏诊断记录
router.patch("/:id/favorite", auth, toggleFavorite);

// 删除诊断记录
router.delete("/:id", auth, deleteDiagnosisRecord);

// 获取用于Coze智能体的格式化数据
router.get("/coze-input/:petId", auth, getCozeInputData);

// 获取PetData整合数据（用于Coze智能体）
const getPetData = async (req, res) => {
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
    console.error("获取PetData失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
      error: error.message,
    });
  }
};

router.get("/petdata/:petId", auth, getPetData);

module.exports = router;
