const express = require("express");
const router = express.Router();
const {
  getPets,
  getPet,
  createPet,
  updatePet,
  deletePet,
  updatePetAvatar,
  getBreeds,
} = require("../controllers/petController");
const { authenticateToken } = require("../middleware/auth");

// 获取宠物品种列表（无需认证）
router.get("/breeds", getBreeds);

// 需要认证的路由
router.use(authenticateToken);

// 获取用户的宠物列表
router.get("/", getPets);

// 获取单个宠物信息
router.get("/:petId", getPet);

// 创建宠物
router.post("/", createPet);

// 更新宠物信息
router.put("/:petId", updatePet);

// 删除宠物
router.delete("/:petId", deletePet);

// 更新宠物头像
router.put("/:petId/avatar", updatePetAvatar);

module.exports = router;
