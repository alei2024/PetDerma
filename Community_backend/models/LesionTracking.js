const mongoose = require("mongoose");

const trackingEntrySchema = new mongoose.Schema(
  {
    imageList: [{ type: String }],
    severity: { type: Number, min: 1, max: 5, required: true },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    rednessScore: { type: Number, min: 0, max: 100, default: 50 },
    areaScore: { type: Number, min: 0, max: 100, default: 50 },
    healingScore: { type: Number, min: 0, max: 100, required: true },
    notes: { type: String, default: "", maxlength: 500 },
    recordedAt: { type: Date, default: Date.now, index: true },
    diagnosisRecordId: { type: mongoose.Schema.Types.ObjectId, ref: "DiagnosisRecord" },
  },
  { _id: true, timestamps: false }
);

const lesionTrackingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    petId: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    petName: { type: String, required: true },
    petType: { type: String, enum: ["dog", "cat", "rabbit", "hamster", "other"], default: "dog" },

    lesionName: { type: String, required: true, maxlength: 50 },
    bodyPart: { type: String, default: "未指定", maxlength: 30 },
    diagnosisName: { type: String, default: "未诊断" },

    status: { type: String, enum: ["active", "healed", "relapsed"], default: "active", index: true },

    entries: [trackingEntrySchema],
  },
  { timestamps: true }
);

lesionTrackingSchema.index({ userId: 1, petId: 1, status: 1 });

module.exports = mongoose.model("LesionTracking", lesionTrackingSchema);
