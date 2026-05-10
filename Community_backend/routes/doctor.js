const express = require("express");
const router = express.Router();
const {
  getCases,
  getCaseDetail,
  generateSummary,
  updateFollowUp,
  completeFollowUp,
  seedDemoData,
} = require("../controllers/doctorController");
const { authenticateToken } = require("../middleware/auth");

// 所有路由需要认证
router.use(authenticateToken);

// 播种演示数据（开发环境使用）
router.post("/seed-demo", seedDemoData);

// 获取授权病例列表
router.get("/cases", getCases);

// 获取病例详情
router.get("/cases/:id", getCaseDetail);

// 生成 AI 病例摘要
router.post("/cases/:id/summary", generateSummary);

// 更新复诊提醒
router.put("/cases/:id/follow-up", updateFollowUp);

// 完成复诊
router.put("/cases/:id/follow-up/complete", completeFollowUp);

module.exports = router;
