const express = require("express");
const router = express.Router();
const { authenticateToken: auth } = require("../middleware/auth");
const consultationController = require("../controllers/consultationController");

// 发送宠物问诊请求
router.post("/pet-consultation", auth, consultationController.sendPetConsultation.bind(consultationController));

// 测试Coze智能体连接
router.get("/test-connection", auth, consultationController.testCozeConnection.bind(consultationController));

// 创建新的问诊会话
router.post("/create-session", auth, consultationController.createConsultationSession.bind(consultationController));

// 发送消息到Coze智能体
router.post("/send-message", auth, consultationController.sendMessage.bind(consultationController));

// 获取问诊历史
router.get("/history/:conversationId", auth, consultationController.getConsultationHistory.bind(consultationController));

module.exports = router;
