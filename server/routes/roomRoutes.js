// server/routes/roomRoutes.js
const express = require("express");
const router = express.Router();
const { deleteRoom, getRoomChat, getRoomHistory } = require("../controllers/roomController");

router.delete("/room/:roomId", deleteRoom);
router.get("/room/:roomId/chat", getRoomChat);
router.get("/room/:roomId/history", getRoomHistory);

module.exports = router;
