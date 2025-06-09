const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const Redis = require("redis");
require("dotenv").config();
// Patch: Load OPENROUTER_API_KEY from .env if not already set
if (!process.env.OPENROUTER_API_KEY) {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      if (line.startsWith('OPENROUTER_API_KEY=')) {
        process.env.OPENROUTER_API_KEY = line.split('=')[1].trim();
        break;
      }
    }
  }
}
const mongoose = require("mongoose");
const Room = require("./Room");
const axios = require("axios");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const User = require("./User");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "debugsyncsecret";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const redisClient = Redis.createClient();
(async () => {
  await redisClient.connect();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.on("join-room", async (roomId) => {
      socket.join(roomId);
      console.log(`${socket.id} joined ${roomId}`);
      let room = await Room.findOne({ roomId });
      let code = room ? room.code : "";
      const redisCode = await redisClient.get(`room:${roomId}:code`);
      if (redisCode !== null && redisCode !== undefined && redisCode !== "") {
        code = redisCode;
      }
      // Track admin and users
      let username = socket._username;
      if (!username) {
        // Try to get from handshake auth (for new connections)
        username = socket.handshake.query.username || socket.handshake.auth?.username;
      }
      if (!username) {
        username = `User-${socket.id.slice(-4)}`;
      }
      if (!room) {
        // First user is admin
        await Room.create({ roomId, code, admin: username, users: [username] });
        socket._isAdmin = true;
      } else {
        // Add user to users array if not present
        if (!room.users.includes(username)) {
          await Room.updateOne({ roomId }, { $addToSet: { users: username } });
        }
        socket._isAdmin = (room.admin === username);
      }
      socket._roomId = roomId;
      socket._username = username;
      socket.emit("receive-code", code);
      // Send admin info to all users in the room
      const updatedRoom = await Room.findOne({ roomId });
      io.to(roomId).emit("room-admin", { admin: updatedRoom.admin, users: updatedRoom.users });
    });

    socket.on("code-change", async ({ roomId, code }) => {
      await redisClient.set(`room:${roomId}:code`, code);
      socket.to(roomId).emit("receive-code", code);
      // No longer save code snapshot here
    });
    socket.on("save-room", async ({ roomId, code }) => {
      // Save code and chat to MongoDB
      const room = await Room.findOne({ roomId });
      let chat = [];
      if (room && room.chat) chat = room.chat;
      // Save code snapshot to history in MongoDB (only on save)
      const user = socket._username || "Unknown";
      await Room.findOneAndUpdate(
        { roomId },
        {
          code,
          chat,
          updatedAt: new Date(),
          $push: { history: { code, timestamp: new Date(), user } }
        },
        { upsert: true }
      );
      await redisClient.set(`room:${roomId}:code`, code);
      socket.emit("room-saved", { success: true });
    });

    socket.on("cursor-change", ({ roomId, cursor, clientId }) => {
      // Find username for this clientId (not tracked yet, so just send clientId for now)
      io.to(roomId).emit("remote-cursor", { cursor, clientId, username: clientId });
    });

    // --- Real-time Presence ---
    const roomUsers = {};

    // --- Chat Request/Response Logic ---
    // Track chat request state per room
    const chatRequests = {};
    const chatAccepted = {};

    socket.on("user-join", ({ roomId, username }) => {
      if (!roomUsers[roomId]) roomUsers[roomId] = new Set();
      roomUsers[roomId].add(username);
      io.to(roomId).emit("room-users", Array.from(roomUsers[roomId]));
      socket.join(roomId);
      socket._roomId = roomId;
      socket._username = username;
    });
    socket.on("disconnect", () => {
      const { _roomId, _username } = socket;
      if (_roomId && _username && roomUsers[_roomId]) {
        roomUsers[_roomId].delete(_username);
        io.to(_roomId).emit("room-users", Array.from(roomUsers[_roomId]));
      }
      console.log("User disconnected:", socket.id);
    });

    socket.on("language-change", ({ roomId, language }) => {
      // Broadcast to all users in the room except sender
      socket.to(roomId).emit("language-change", { language });
    });

    socket.on("chat-request", ({ roomId, from }) => {
      if (!roomUsers[roomId]) return;
      chatRequests[roomId] = from;
      chatAccepted[roomId] = new Set([from]); // requester auto-accepts
      // Notify all other users in the room
      Array.from(roomUsers[roomId]).forEach((u) => {
        if (u !== from) {
          io.to(roomId).emit("chat-request-received", { to: u, from });
        }
      });
    });

    socket.on("chat-request-response", ({ roomId, username, accepted }) => {
      if (!roomUsers[roomId] || !chatRequests[roomId]) return;
      if (!accepted) {
        // Someone declined, cancel chat for all
        io.to(roomId).emit("chat-cancel", { by: username });
        delete chatRequests[roomId];
        delete chatAccepted[roomId];
        return;
      }
      chatAccepted[roomId].add(username);
      // If all users accepted, start chat
      if (chatAccepted[roomId].size === roomUsers[roomId].size) {
        io.to(roomId).emit("chat-start", { users: Array.from(roomUsers[roomId]) });
        delete chatRequests[roomId];
        delete chatAccepted[roomId];
      }
    });

    // --- Group Chat Logic ---
    socket.on("group-message", async ({ roomId, username, message }) => {
      // Broadcast to all users in the room
      io.to(roomId).emit("group-message", { username, message });
      // Save to MongoDB
      await Room.findOneAndUpdate(
        { roomId },
        { $push: { chat: { sender: username, text: message, timestamp: new Date() } }, $set: { updatedAt: new Date() } },
        { upsert: true }
      );
    });

    // Kick user event (admin only)
    socket.on("kick-user", async ({ roomId, target }) => {
      const room = await Room.findOne({ roomId });
      if (!room) return;
      if (socket._username !== room.admin) return; // Only admin can kick
      // Remove user from users array
      await Room.updateOne({ roomId }, { $pull: { users: target } });
      // Notify kicked user
      for (const [id, s] of io.of("/").sockets) {
        if (s._roomId === roomId && s._username === target) {
          s.emit("kicked", { roomId });
          s.leave(roomId);
        }
      }
      // Notify all users of updated user list
      const updatedRoom = await Room.findOne({ roomId });
      io.to(roomId).emit("room-admin", { admin: updatedRoom.admin, users: updatedRoom.users });
      io.to(roomId).emit("room-users", updatedRoom.users);
    });
  });

  httpServer.listen(4040, () => console.log("Server on 4040"));
  app.get("/", (req, res) => {
    res.send("DebugSync.AI Server is running");
  });
})();

app.use(express.json()); // Ensure JSON body parsing for API endpoints

// User signup
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: "Username, email and password required." });
  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ error: "Email or username already registered." });
    const user = new User({ username, email, password });
    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, email: user.email, username: user.username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// User login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required." });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials." });
    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ error: "Invalid credentials." });
    const token = jwt.sign({ id: user._id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, email: user.email, username: user.username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Node.js Only Code Execution (Initial Version) ---
app.post("/api/run", (req, res) => {
  const { code, language } = req.body;
  if (language === "javascript") {
    const tempFile = path.join(__dirname, "tempCode.js");
    fs.writeFileSync(tempFile, code);
    exec(`node "${tempFile}"`, { timeout: 5000 }, (err, stdout, stderr) => {
      fs.unlinkSync(tempFile);
      res.json({
        stdout,
        stderr,
        error: err ? err.message : null,
      });
    });
  } else if (language === "cpp" || language === "c++") {
    const tempFile = path.join(__dirname, "tempCode.cpp");
    const execFile = path.join(__dirname, "tempCode.exe");
    fs.writeFileSync(tempFile, code);
    exec(`g++ "${tempFile}" -o "${execFile}"`, { timeout: 5000 }, (compileErr, compileStdout, compileStderr) => {
      if (compileErr) {
        fs.unlinkSync(tempFile);
        return res.json({
          stdout: compileStdout,
          stderr: compileStderr,
          error: compileErr.message,
        });
      }
      exec(`"${execFile}"`, { timeout: 5000 }, (runErr, runStdout, runStderr) => {
        fs.unlinkSync(tempFile);
        fs.unlinkSync(execFile);
        res.json({
          stdout: runStdout,
          stderr: runStderr,
          error: runErr ? runErr.message : null,
        });
      });
    });
  } else {
    return res.status(400).json({ error: "Only JavaScript and C++ are supported in this demo." });
  }
});

// AI Chatbot endpoint (OpenRouter free model)
app.post("/api/ai-chat", async (req, res) => {
  const { message } = req.body;
  try {
    const openrouterRes = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openrouter/cinematika-7b", // or "openrouter/mistral-7b"
        messages: [
          { role: "system", content: "You are a helpful programming assistant." },
          { role: "user", content: message },
        ],
        max_tokens: 256,
        temperature: 0.7,
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    res.json({ response: openrouterRes.data.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a room and its data
app.delete("/api/room/:roomId", async (req, res) => {
  const { roomId } = req.params;
  try {
    // Remove from MongoDB
    await Room.deleteOne({ roomId });
    // Remove from Redis
    await redisClient.del(`room:${roomId}:code`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fetch chat history for a room
app.get("/api/room/:roomId/chat", async (req, res) => {
  const { roomId } = req.params;
  try {
    const room = await Room.findOne({ roomId });
    res.json({ chat: room && room.chat ? room.chat : [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fetch code history for a room
app.get("/api/room/:roomId/history", async (req, res) => {
  const { roomId } = req.params;
  try {
    const room = await Room.findOne({ roomId });
    res.json({ history: room && room.history ? room.history : [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});