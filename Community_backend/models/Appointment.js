const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    petName: { type: String, required: true },
    petType: { type: String, default: "" },
    ownerName: { type: String, default: "" },
    ownerPhone: { type: String, default: "" },
    service: { type: String, default: "" },
    date: {
      type: String,
      enum: ["today", "tomorrow", "week"],
      required: true,
    },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ institutionId: 1, date: 1 });
appointmentSchema.index({ institutionId: 1, status: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
