const mongoose = require("mongoose");

const institutionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ["hospital", "clinic", "care"],
      required: true,
    },
    typeText: {
      type: String,
      default: "",
    },
    contact: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    licenseUrl: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },
    tags: [String],
  },
  {
    timestamps: true,
  }
);

institutionSchema.index({ userId: 1 });
institutionSchema.index({ status: 1 });
institutionSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Institution", institutionSchema);
