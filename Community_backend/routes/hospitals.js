const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/hospitalController");
const { optionalAuth } = require("../middleware/auth");

// 全部接口允许匿名(也就是说前端无需登录就能看医院,体感更顺)
router.get("/", optionalAuth, ctrl.listHospitals);
router.get("/recommend", optionalAuth, ctrl.recommendHospitals);
router.get("/:id", optionalAuth, ctrl.getHospital);

module.exports = router;
