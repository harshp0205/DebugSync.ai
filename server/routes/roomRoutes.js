// server/routes/roomRoutes.js
const express = require("express");
const router = express.Router();
const { deleteRoom, getRoomChat, getRoomHistory } = require("../controllers/roomController");
const Room = require("../models/Room");

router.delete("/room/:roomId", deleteRoom);
router.get("/room/:roomId/chat", getRoomChat);
router.get("/room/:roomId/history", getRoomHistory);

// New: Check if room exists
router.get("/room/:roomId/exists", async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    res.json({ exists: !!room });
  } catch (e) {
    res.status(500).json({ exists: false, error: e.message });
  }
});

module.exports = router;
