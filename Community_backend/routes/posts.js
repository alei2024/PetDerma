const express = require("express");
const router = express.Router();
const {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  getUserPosts,
  getPopularTags,
} = require("../controllers/postController");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

// 获取帖子列表
router.get("/", getPosts);

// 获取热门标签
router.get("/tags", getPopularTags);

// 获取帖子详情 - 使用可选认证
router.get("/:id", optionalAuth, getPostById);

// 获取用户帖子
router.get("/user/:userId", getUserPosts);

// 需要认证的路由
router.use(authenticateToken);

// 创建帖子
router.post("/", createPost);

// 更新帖子
router.put("/:id", updatePost);

// 删除帖子
router.delete("/:id", deletePost);

module.exports = router;
