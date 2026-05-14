/**
 * 预置 demo 宠物医院数据(成都市核心区为例)
 * 运行: cd Community_backend && node scripts/seed-hospitals.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Hospital = require("../models/Hospital");

const MONGO =
  process.env.MONGODB_URI || "mongodb://localhost:27017/PetDerma_Community";

const hospitals = [
  {
    name: "瑞鹏宠物医院(春熙路店)",
    address: "成都市锦江区春熙路 39 号",
    city: "成都",
    phone: "028-86001234",
    openHours: "09:00-22:00",
    latitude: 30.6586,
    longitude: 104.0817,
    specialties: ["皮肤科", "真菌感染", "过敏性皮炎", "猫专科"],
    is24h: false,
    petsAccepted: ["dog", "cat"],
    rating: 4.8,
    reviewCount: 326,
    description:
      "锦江核心商圈连锁宠物医院,皮肤科主任医师驻诊,擅长真菌、螨虫、过敏类皮肤病。",
    images: ["/images/default_pet.png"],
    priceRange: "150-600/次",
    isRecommended: true,
  },
  {
    name: "派多格 24 小时急诊医院",
    address: "成都市武侯区天府大道 316 号",
    city: "成都",
    phone: "028-85551122",
    openHours: "24 小时",
    latitude: 30.6203,
    longitude: 104.0651,
    specialties: ["24 小时急诊", "外科", "皮肤科", "蠕形螨病"],
    is24h: true,
    petsAccepted: ["dog", "cat", "rabbit"],
    rating: 4.6,
    reviewCount: 198,
    description:
      "全天候急诊宠物医院,皮肤外科手术经验丰富,严重皮肤感染、化脓性病灶清创。",
    images: ["/images/default_pet.png"],
    priceRange: "200-800/次",
    isRecommended: false,
  },
  {
    name: "宠颐生动物医院(高新店)",
    address: "成都市高新区交子大道 199 号",
    city: "成都",
    phone: "028-85998877",
    openHours: "08:30-21:30",
    latitude: 30.6038,
    longitude: 104.0628,
    specialties: ["皮肤科", "癣病", "免疫科", "猫专科"],
    is24h: false,
    petsAccepted: ["dog", "cat"],
    rating: 4.7,
    reviewCount: 412,
    description:
      "宠颐生连锁旗舰店,皮肤镜检诊断、伍德灯、真菌培养一站式,适合疑难皮肤病。",
    images: ["/images/default_pet.png"],
    priceRange: "180-700/次",
    isRecommended: true,
  },
  {
    name: "美联众合动物医院",
    address: "成都市青羊区琴台路 78 号",
    city: "成都",
    phone: "028-86334455",
    openHours: "09:00-21:00",
    latitude: 30.6685,
    longitude: 104.0593,
    specialties: ["皮肤科", "湿疹", "过敏性皮炎", "营养调理"],
    is24h: false,
    petsAccepted: ["dog", "cat"],
    rating: 4.5,
    reviewCount: 156,
    description:
      "高端宠物综合医院,提供皮肤过敏源检测和食物排除饮食方案。",
    images: ["/images/default_pet.png"],
    priceRange: "200-900/次",
    isRecommended: false,
  },
  {
    name: "新瑞鹏精准医疗中心",
    address: "成都市锦江区滨江东路 12 号",
    city: "成都",
    phone: "028-86997788",
    openHours: "09:00-23:00",
    latitude: 30.6492,
    longitude: 104.0907,
    specialties: ["皮肤科", "真菌感染", "细菌性脓皮病", "皮肤镜"],
    is24h: false,
    petsAccepted: ["dog", "cat"],
    rating: 4.9,
    reviewCount: 521,
    description:
      "区域内皮肤病诊疗标杆,配备数字皮肤镜、激光治疗仪。",
    images: ["/images/default_pet.png"],
    priceRange: "250-1200/次",
    isRecommended: true,
  },
  {
    name: "宠爱国际动物医院",
    address: "成都市成华区建设北路 56 号",
    city: "成都",
    phone: "028-83661199",
    openHours: "09:00-22:00",
    latitude: 30.6862,
    longitude: 104.1041,
    specialties: ["皮肤科", "螨虫", "脱毛"],
    is24h: false,
    petsAccepted: ["dog", "cat", "hamster"],
    rating: 4.4,
    reviewCount: 89,
    description: "社区型宠物医院,常见皮肤问题处理及时,价格平实。",
    images: ["/images/default_pet.png"],
    priceRange: "120-450/次",
    isRecommended: false,
  },
  {
    name: "猫舍(只看猫)动物诊所",
    address: "成都市武侯区一环路南二段 22 号",
    city: "成都",
    phone: "028-85226677",
    openHours: "10:00-20:00",
    latitude: 30.6402,
    longitude: 104.0772,
    specialties: ["猫专科", "皮肤科", "真菌感染", "癣病"],
    is24h: false,
    petsAccepted: ["cat"],
    rating: 4.9,
    reviewCount: 287,
    description:
      "成都仅有的几家纯猫科诊所之一,猫皮肤癣治愈率高,环境无犬应激。",
    images: ["/images/default_pet.png"],
    priceRange: "180-650/次",
    isRecommended: true,
  },
  {
    name: "动物之家社区宠物诊所",
    address: "成都市青羊区青华路 88 号",
    city: "成都",
    phone: "028-86001100",
    openHours: "08:00-20:00",
    latitude: 30.6630,
    longitude: 104.0421,
    specialties: ["全科", "皮肤科", "疫苗"],
    is24h: false,
    petsAccepted: ["dog", "cat", "rabbit", "hamster"],
    rating: 4.3,
    reviewCount: 64,
    description: "社区便民宠物诊所,日常皮肤病咨询及基础治疗。",
    images: ["/images/default_pet.png"],
    priceRange: "80-350/次",
    isRecommended: false,
  },
];

async function main() {
  await mongoose.connect(MONGO);
  console.log("✅ 已连接 MongoDB");

  const removed = await Hospital.deleteMany({});
  console.log(`🧹 清除 ${removed.deletedCount} 条旧医院数据`);

  const inserted = await Hospital.insertMany(hospitals);
  console.log(`✅ 插入 ${inserted.length} 条 demo 医院`);
  inserted.forEach((h) =>
    console.log(`   - ${h.name} [${h.specialties.join(",")}] ⭐${h.rating}`)
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed 失败:", err);
  process.exit(1);
});
