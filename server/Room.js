const mongoose = require("mongoose");
const RoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  code: { type: String, default: "" },
  admin: { type: String }, // email or username of admin
  users: { type: [String], default: [] }, // list of users in the room
  history: { type: [
    {
      code: String,
      timestamp: { type: Date, default: Date.now },
      user: String
    }
  ], default: [] },
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