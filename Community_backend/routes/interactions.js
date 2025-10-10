const express = require("express");
const router = express.Router();
const {
  toggleLikePost,
  toggleFavoritePost,
  toggleSharePost,
  createComment,
  getPostComments,
  getCommentReplies,
  deleteComment,
  toggleLikeComment,
  getUserLikes,
  getUserFavorites,
  getUserShares,
} = require("../controllers/interactionController");
const { authenticateToken } = require("../middleware/auth");

// 评论读取接口（可选鉴权，用于获取用户交互状态）
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    // 如果有token，尝试验证
    const jwt = require("jsonwebtoken");
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );
      req.user = decoded;
    } catch (error) {
      // token无效，但不阻止请求继续
      console.log("可选认证失败，继续处理请求");
    }
  }
  next();
};

router.get("/posts/:postId/comments", optionalAuth, getPostComments);
router.get("/comments/:commentId/replies", optionalAuth, getCommentReplies);

// 需要认证的路由
router.use(authenticateToken);

// 帖子互动（鉴权）
router.post("/posts/:postId/like", toggleLikePost);
router.post("/posts/:postId/favorite", toggleFavoritePost);
router.post("/posts/:postId/share", toggleSharePost);

// 评论相关
router.post("/posts/:postId/comments", createComment);
router.delete("/comments/:commentId", deleteComment);

// 评论点赞
router.post("/comments/:commentId/like", toggleLikeComment);

// 用户互动记录
router.get("/users/:userId/likes", getUserLikes);
router.get("/users/:userId/favorites", getUserFavorites);
router.get("/users/:userId/shares", getUserShares);

module.exports = router;
