const express = require("express");
const router = express.Router();
const {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  getUserPosts,
  getUserFavorites,
  getUserComments,
  getMyPosts,
  getPopularTags,
  imageSearch,
} = require("../controllers/postController");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

// 获取帖子列表 - 使用可选认证（用于显示用户相关的点赞、收藏状态）
router.get("/", optionalAuth, getPosts);

// 获取热门标签
router.get("/tags", getPopularTags);

// 图像相似度搜索 - 不需要认证
router.post("/image-search", imageSearch);

// 获取帖子详情 - 使用可选认证
router.get("/:id", optionalAuth, getPostById);

// 获取用户帖子
router.get("/user/:userId", getUserPosts);

// 需要认证的路由
router.use(authenticateToken);

// 创建帖子 - 需要认证
router.post("/", createPost);

// 更新帖子
router.put("/:id", updatePost);

// 删除帖子
router.delete("/:id", deletePost);

// 获取当前用户的收藏帖子
router.get("/my/favorites", getUserFavorites);

// 获取当前用户的评论
router.get("/my/comments", getUserComments);

// 获取当前用户发布的帖子
router.get("/my/posts", getMyPosts);

module.exports = router;
