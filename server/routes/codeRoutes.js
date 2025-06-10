// server/routes/codeRoutes.js
const express = require("express");
const router = express.Router();
const { runCode } = require("../controllers/codeController");

router.post("/run", runCode);

module.exports = router;
