// server/routes/aiRoutes.js
const express = require("express");
const router = express.Router();
const { aiChat } = require("../controllers/aiController");

router.post("/ai-chat", aiChat);

module.exports = router;
