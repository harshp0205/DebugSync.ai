// server/controllers/roomController.js
const Room = require("../models/Room");
const { redisClient } = require("../services/redisService");

async function deleteRoom(req, res) {
  const { roomId } = req.params;
  try {
    await Room.deleteOne({ roomId });
    await redisClient.del(`room:${roomId}:code`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getRoomChat(req, res) {
  const { roomId } = req.params;
  try {
    const room = await Room.findOne({ roomId });
    res.json({ chat: room && room.chat ? room.chat : [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getRoomHistory(req, res) {
  const { roomId } = req.params;
  try {
    const room = await Room.findOne({ roomId });
    res.json({ history: room && room.history ? room.history : [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { deleteRoom, getRoomChat, getRoomHistory };
