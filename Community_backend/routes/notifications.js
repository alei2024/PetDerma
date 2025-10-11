const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markNotificationsAsRead,
  deleteNotifications,
  getUnreadCount,
} = require("../controllers/notificationController");
const { authenticateToken } = require("../middleware/auth");

// 所有通知路由都需要认证
router.use(authenticateToken);

// 获取通知列表
router.get("/", getNotifications);

// 获取未读通知数量
router.get("/unread-count", getUnreadCount);

// 标记通知为已读
router.put("/mark-read", markNotificationsAsRead);

// 删除通知
router.delete("/", deleteNotifications);

module.exports = router;
