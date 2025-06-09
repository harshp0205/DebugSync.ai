const mongoose = require("mongoose");
const RoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  code: { type: String, default: "" },
  chat: { type: [
    {
      sender: String,
      text: String,
      timestamp: { type: Date, default: Date.now }
    }
  ], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model("Room", RoomSchema);