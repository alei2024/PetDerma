const mongoose = require("mongoose");

const preConsultReportSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    petName: { type: String, default: "" },
    petType: { type: String, default: "" },
    petBreed: { type: String, default: "" },
    petAvatar: { type: String, default: "" },
    ownerName: { type: String, default: "" },
    ownerPhone: { type: String, default: "" },
    diseaseName: { type: String, default: "" },
    severity: { type: String, default: "待评估" },
    confidence: { type: Number, default: 0 },
    description: { type: String, default: "" },
    aiSummary: { type: String, default: "" },
    symptoms: [String],
    affectedAreas: [String],
    weight: { type: String, default: "" },
    allergies: { type: String, default: "" },
    sterilized: { type: String, default: "未知" },
    recentContact: { type: String, default: "" },
    images: [String],
    status: {
      type: String,
      enum: ["pending", "read", "completed"],
      default: "pending",
    },
    needCareAdvice: { type: Boolean, default: false },
    source: { type: String, default: "user" },
  },
  {
    timestamps: true,
  }
);

preConsultReportSchema.index({ institutionId: 1, status: 1 });
preConsultReportSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("PreConsultReport", preConsultReportSchema);
