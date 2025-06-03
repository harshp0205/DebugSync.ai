const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const Redis = require("redis");
require("dotenv").config();
const mongoose = require("mongoose");
const Room = require("./Room");

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