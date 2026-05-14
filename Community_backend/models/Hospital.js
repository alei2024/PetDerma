const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    address: { type: String, required: true, maxlength: 200 },
    city: { type: String, default: "未指定" },
    phone: { type: String, default: "" },
    openHours: { type: String, default: "9:00-21:00" },

    // 经纬度(腾讯/高德格式)
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },

    // 标签数组(疾病专长 + 服务类别)
    specialties: [{ type: String }], // 例如:["真菌感染", "皮肤科", "猫专科"]
    is24h: { type: Boolean, default: false },
    petsAccepted: [{ type: String }], // ["dog", "cat"]

    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },

    // 简介与图片(demo 用)
    description: { type: String, default: "" },
    images: [{ type: String }],

    // 收费参考(展示用)
    priceRange: { type: String, default: "100-500/次" },

    // 标记本平台推荐
    isRecommended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 地理索引,支持 $near 查询
hospitalSchema.index({ longitude: 1, latitude: 1 });
hospitalSchema.index({ specialties: 1 });

module.exports = mongoose.model("Hospital", hospitalSchema);
