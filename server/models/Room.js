// server/models/Room.js
// ...existing code from your original Room.js...
// Just move the file, no changes needed unless you want to refactor the schema.

const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  sender: String,
  text: String,
  timestamp: Date,
});

const historySchema = new mongoose.Schema({
  code: String,
  timestamp: Date,
  user: String,
});

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  code: String,
  admin: String,
  users: [String],
  chat: [chatSchema],
  history: [historySchema],
  updatedAt: Date,
});

module.exports = mongoose.model("Room", roomSchema);
