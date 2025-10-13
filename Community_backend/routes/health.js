const express = require("express");
const router = express.Router();
const {
  getHealthRecords,
  getHealthRecord,
  saveHealthRecord,
  deleteHealthRecord,
  addSkinDiseaseHistory,
  deleteSkinDiseaseHistory,
} = require("../controllers/healthController");
const { authenticateToken } = require("../middleware/auth");

// 所有路由都需要认证
router.use(authenticateToken);

// 获取用户的健康档案列表
router.get("/", getHealthRecords);

// 获取单个宠物的健康档案
router.get("/:petId", getHealthRecord);

// 创建或更新健康档案
router.post("/:petId", saveHealthRecord);
router.put("/:petId", saveHealthRecord);

// 删除健康档案
router.delete("/:petId", deleteHealthRecord);

// 添加皮肤病史记录
router.post("/:petId/skin-disease", addSkinDiseaseHistory);

// 删除皮肤病史记录
router.delete("/:petId/skin-disease/:historyId", deleteSkinDiseaseHistory);

module.exports = router;
