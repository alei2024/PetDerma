const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // 接收者
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 发送者
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 通知类型
    type: {
      type: String,
      enum: ["like", "comment", "favorite", "share", "system"],
      required: true,
      index: true,
    },

    // 通知标题
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },

    // 通知内容
    content: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // 相关帖子ID（如果适用）
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },

    // 相关评论ID（如果适用）
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    // 是否已读
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 是否已删除
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 额外数据（JSON格式）
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// 复合索引
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isDeleted: 1, createdAt: -1 });

// 虚拟字段：通知ID
notificationSchema.virtual("notificationId").get(function () {
  return this._id.toString();
});

// 确保虚拟字段包含在JSON输出中
notificationSchema.set("toJSON", { virtuals: true });
notificationSchema.set("toObject", { virtuals: true });

// 静态方法：创建通知
notificationSchema.statics.createNotification = async function (data) {
  const {
    recipientId,
    senderId,
    type,
    title,
    content,
    postId = null,
    commentId = null,
    metadata = {},
  } = data;

  // 避免给自己发送通知
  if (recipientId.toString() === senderId.toString()) {
    return null;
  }

  const notification = new this({
    recipientId,
    senderId,
    type,
    title,
    content,
    postId,
    commentId,
    metadata,
  });

  await notification.save();

  // 填充发送者信息
  await notification.populate("senderId", "nickName avatar");

  return notification;
};

// 静态方法：获取用户通知列表
notificationSchema.statics.getUserNotifications = function (
  userId,
  limit = 20,
  skip = 0,
  unreadOnly = false
) {
  const query = {
    recipientId: userId,
    isDeleted: false,
  };

  if (unreadOnly) {
    query.isRead = false;
  }

  return this.find(query)
    .populate("senderId", "nickName avatar")
    .populate("postId", "title content")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// 静态方法：标记通知为已读
notificationSchema.statics.markAsRead = function (notificationIds, userId) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      recipientId: userId,
    },
    {
      $set: { isRead: true },
    }
  );
};

// 静态方法：获取未读通知数量
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    recipientId: userId,
    isRead: false,
    isDeleted: false,
  });
};

// 静态方法：删除通知
notificationSchema.statics.deleteNotifications = function (
  notificationIds,
  userId
) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      recipientId: userId,
    },
    {
      $set: { isDeleted: true },
    }
  );
};

module.exports = mongoose.model("Notification", notificationSchema);
