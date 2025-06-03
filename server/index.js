const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const Redis = require("redis");
require("dotenv").config();
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
      socket.emit("receive-code", code);
    });

    socket.on("code-change", async ({ roomId, code }) => {
      await redisClient.set(`room:${roomId}:code`, code);
      socket.to(roomId).emit("receive-code", code);
    });
    socket.on("save-room", async ({ roomId, code }) => {
      await Room.findOneAndUpdate(
        { roomId },
        { code, updatedAt: new Date() },
        { upsert: true }
      );
      await redisClient.set(`room:${roomId}:code`, code);
      socket.emit("room-saved", { success: true });
    });

    socket.on("cursor-change", ({ roomId, cursor, clientId }) => {
      socket.to(roomId).emit("remote-cursor", { cursor, clientId });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
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
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required." });
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered." });
    const user = new User({ email, password });
    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, email: user.email });
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
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, email: user.email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Code execution endpoint (runs JS code)
app.post("/api/run", (req, res) => {
  const { code, language } = req.body;
  if (language !== "javascript") {
    return res.status(400).json({ error: "Only JavaScript is supported in this demo." });
  }
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
});

// LLM suggestion endpoint (Ollama or OpenAI)
app.post("/api/llm-suggest", async (req, res) => {
  const { code, prompt } = req.body;
  try {
    // Example for Ollama (local or remote)
    const ollamaRes = await axios.post("http://localhost:11434/api/generate", {
      model: "codellama:7b", // or "llama3" or your preferred model
      prompt: `${prompt}\n\n${code}`,
      stream: false
    });
    res.json({ suggestion: ollamaRes.data.response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});