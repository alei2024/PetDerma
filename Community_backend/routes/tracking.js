const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const ctrl = require("../controllers/trackingController");

router.post("/", authenticateToken, ctrl.createTracking);
router.get("/", authenticateToken, ctrl.listTracking);
router.get("/:id", authenticateToken, ctrl.getTracking);
router.post("/:id/entry", authenticateToken, ctrl.addEntry);
router.delete("/:id", authenticateToken, ctrl.deleteTracking);

module.exports = router;
