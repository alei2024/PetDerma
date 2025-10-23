const mongoose = require("mongoose");

const diagnosisRecordSchema = new mongoose.Schema(
  {
    // 用户信息
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 宠物信息
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
      index: true,
    },
    petName: {
      type: String,
      required: true,
    },
    petType: {
      type: String,
      enum: ["dog", "cat", "rabbit", "hamster", "other"],
      required: true,
    },

    // 诊断图片
    images: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Image",
      },
    ],

    // 用户输入的症状描述
    symptomDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    // AI诊断结果
    diagnosisResult: {
      diseaseName: {
        type: String,
        required: true,
      },
      confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      severity: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      description: {
        type: String,
        required: true,
      },
      suggestions: {
        homeAdvice: [String],
        medicalAdvice: [String],
        preventAdvice: [String],
      },
      warning: {
        type: String,
        default: "此结果仅供参考，请以专业兽医诊断为准。",
      },
      // 详细的预测信息
      predictedClass: String,
      allProbabilities: [
        {
          class: String,
          diseaseName: String,
          probability: Number,
        },
      ],
      imageCount: {
        type: Number,
        default: 1,
      },
    },

    // 记录状态
    status: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
      index: true,
    },

    // 是否收藏
    isFavorite: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
diagnosisRecordSchema.index({ userId: 1, status: 1, createdAt: -1 });
diagnosisRecordSchema.index({ userId: 1, isFavorite: 1, createdAt: -1 });
diagnosisRecordSchema.index({ petId: 1, status: 1 });
diagnosisRecordSchema.index({ "diagnosisResult.diseaseName": 1 });

// 虚拟字段：记录ID
diagnosisRecordSchema.virtual("recordId").get(function () {
  return this._id.toString();
});

// 确保虚拟字段包含在JSON输出中
diagnosisRecordSchema.set("toJSON", { virtuals: true });
diagnosisRecordSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("DiagnosisRecord", diagnosisRecordSchema);
