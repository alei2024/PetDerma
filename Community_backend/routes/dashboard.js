const express = require("express");
const router = express.Router();
const { optionalAuth } = require("../middleware/auth");
const { getStats } = require("../controllers/dashboardController");

router.get("/stats", optionalAuth, getStats);

module.exports = router;
