const mongoose = require("mongoose");

const petSchema = new mongoose.Schema(
  {
    // 关联用户
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 基本信息
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    
    // 头像
    avatar: {
      url: {
        type: String,
        default: "/images/default_pet.png",
      },
      source: {
        type: String,
        enum: ["default", "upload"],
        default: "default",
      },
      key: {
        type: String,
        default: "",
      },
      imageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Image",
      },
    },

    // 类型（猫/狗）
    type: {
      type: String,
      required: true,
      enum: ["cat", "dog"],
    },

    // 品种
    breed: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    // 性别
    gender: {
      type: String,
      required: true,
      enum: ["male", "female"],
    },

    // 出生日期
    birthDate: {
      type: Date,
      required: true,
    },


    // 备注
    notes: {
      type: String,
      default: "",
      maxlength: 500,
    },

    // 状态
    status: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
    },

    // 创建时间
    createdAt: {
      type: Date,
      default: Date.now,
    },

    // 更新时间
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
petSchema.index({ userId: 1, status: 1 });
petSchema.index({ name: "text" });
petSchema.index({ type: 1 });
petSchema.index({ breed: 1 });

// 虚拟字段：年龄（年）
petSchema.virtual("age").get(function () {
  if (!this.birthDate) return null;
  
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// 虚拟字段：年龄（月）
petSchema.virtual("ageInMonths").get(function () {
  if (!this.birthDate) return null;
  
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  const yearDiff = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  return yearDiff * 12 + monthDiff;
});

// 确保虚拟字段包含在JSON输出中
petSchema.set("toJSON", { virtuals: true });
petSchema.set("toObject", { virtuals: true });

// 中间件：更新时自动设置updatedAt
petSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// 静态方法：根据用户ID查找宠物
petSchema.statics.findByUserId = function (userId) {
  return this.find({ userId, status: "active" }).sort({ createdAt: -1 });
};

// 静态方法：根据ID和用户ID查找宠物
petSchema.statics.findByUserAndId = function (userId, petId) {
  return this.findOne({ _id: petId, userId, status: "active" });
};

module.exports = mongoose.model("Pet", petSchema);
