const express = require("express");
const router = express.Router();
const {
  register,
  getProfile,
  updateProfile,
  getNearby,
  receiveReport,
  sendReport,
  getReports,
  getReportDetail,
  markReportRead,
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
} = require("../controllers/institutionController");
const { authenticateToken } = require("../middleware/auth");

// 机构注册/认证（需要登录）
router.post("/register", authenticateToken, register);
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.get("/nearby", getNearby);

// AI预问诊报告
router.post("/reports/receive", authenticateToken, receiveReport);
router.post("/reports/send", authenticateToken, sendReport);
router.get("/reports", authenticateToken, getReports);
router.get("/reports/:id", authenticateToken, getReportDetail);
router.put("/reports/:id/read", authenticateToken, markReportRead);

// 预约管理
router.post("/appointments", authenticateToken, createAppointment);
router.get("/appointments", authenticateToken, getAppointments);
router.put("/appointments/:id/status", authenticateToken, updateAppointmentStatus);

module.exports = router;
