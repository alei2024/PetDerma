const mongoose = require("mongoose");

const healthRecordSchema = new mongoose.Schema(
  {
    // 关联用户和宠物
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
      index: true,
    },

    // 基本信息
    weight: {
      type: Number,
      min: 0,
      max: 200,
    },

    // 过敏史
    allergies: {
      type: String,
      default: "无",
      maxlength: 500,
    },

    // 绝育状态
    sterilized: {
      type: String,
      enum: ["是", "否"],
      required: true,
    },

    // 定期驱虫
    deworming: {
      frequency: {
        type: String,
        enum: ["每月", "每季度", "偶尔", "从不"],
        required: true,
      },
      lastDate: {
        type: Date,
      },
    },

    // 近期接触史
    recentContact: {
      type: String,
      default: "",
      maxlength: 500,
    },

    // 既往皮肤病史
    skinDiseaseHistory: [
      {
        startDate: {
          type: Date,
          required: true,
        },
        diseaseName: {
          type: String,
          required: true,
          maxlength: 100,
        },
        affectedAreas: [{
          type: String,
          enum: ["背部", "腹部", "爪缝", "面部", "全身"],
        }],
        symptoms: [{
          type: String,
          enum: ["掉毛", "结痂", "渗液", "红斑", "瘙痒"],
        }],
        medication: {
          type: String,
          default: "",
          maxlength: 200,
        },
        isCured: {
          type: String,
          enum: ["是", "否"],
          required: true,
        },
        notes: {
          type: String,
          default: "",
          maxlength: 300,
        },
      },
    ],

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
healthRecordSchema.index({ userId: 1, petId: 1, status: 1 });
healthRecordSchema.index({ petId: 1, status: 1 });
healthRecordSchema.index({ createdAt: -1 });

// 中间件：更新时自动设置updatedAt
healthRecordSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// 静态方法：根据用户ID和宠物ID查找健康档案
healthRecordSchema.statics.findByUserAndPet = function (userId, petId) {
  return this.findOne({ userId, petId, status: "active" });
};

// 静态方法：根据用户ID查找所有健康档案
healthRecordSchema.statics.findByUserId = function (userId) {
  return this.find({ userId, status: "active" }).populate('petId', 'name avatar type breed');
};

module.exports = mongoose.model("HealthRecord", healthRecordSchema);
