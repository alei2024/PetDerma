const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { getPetRisk } = require("../controllers/riskController");

router.get("/:petId", authenticateToken, getPetRisk);

module.exports = router;
