const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const Redis = require("redis");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// Setup Redis
const redisClient = Redis.createClient();
(async () => {
  await redisClient.connect();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", async (roomId) => {
      socket.join(roomId);
      console.log(`${socket.id} joined ${roomId}`);
      // Load code from Redis and send to client
      const code = await redisClient.get(`room:${roomId}:code`);
      socket.emit("receive-code", code || "");
    });

    socket.on("hello-from-client", (msg) => {
      console.log("Received from client:", msg);
      socket.emit("hello-from-server", "Hello from server!");
    });

    socket.on("code-change", async ({ roomId, code }) => {
      // Save code to Redis
      await redisClient.set(`room:${roomId}:code`, code);
      socket.to(roomId).emit("receive-code", code);
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