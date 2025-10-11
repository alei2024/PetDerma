const Notification = require("../models/Notification");
const socketService = require("../services/socketService");

// 获取用户通知列表
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;

    console.log(`📋 获取用户 ${userId} 的通知列表`);

    const notifications = await Notification.getUserNotifications(
      userId,
      parseInt(limit),
      skip,
      unreadOnly === "true"
    );

    const total = await Notification.countDocuments({
      recipientId: userId,
      isDeleted: false,
      ...(unreadOnly === "true" ? { isRead: false } : {}),
    });

    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: total,
        },
        unreadCount,
      },
    });
  } catch (error) {
    console.error("获取通知失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 标记通知为已读
const markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: "请提供有效的通知ID列表",
      });
    }

    console.log(`📖 标记通知为已读:`, notificationIds);

    await Notification.markAsRead(notificationIds, userId);

    // 获取更新后的未读数量
    const unreadCount = await Notification.getUnreadCount(userId);

    // 通过WebSocket通知前端更新未读数量
    socketService.sendNotification(userId, {
      type: "unread_count_updated",
      unreadCount,
    });

    res.json({
      success: true,
      message: "通知已标记为已读",
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    console.error("标记通知已读失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 删除通知
const deleteNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: "请提供有效的通知ID列表",
      });
    }

    console.log(`🗑️ 删除通知:`, notificationIds);

    await Notification.deleteNotifications(notificationIds, userId);

    res.json({
      success: true,
      message: "通知已删除",
    });
  } catch (error) {
    console.error("删除通知失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 获取未读通知数量
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    console.error("获取未读数量失败:", error);
    res.status(500).json({
      success: false,
      message: "服务器内部错误",
    });
  }
};

// 创建通知的辅助函数
const createAndSendNotification = async (data) => {
  try {
    const notification = await Notification.createNotification(data);

    if (notification) {
      // 通过WebSocket实时发送通知
      socketService.sendNotification(data.recipientId, {
        type: "new_notification",
        notification: notification.toObject(),
      });

      return notification;
    }
  } catch (error) {
    console.error("创建通知失败:", error);
  }
  return null;
};

module.exports = {
  getNotifications,
  markNotificationsAsRead,
  deleteNotifications,
  getUnreadCount,
  createAndSendNotification,
};
