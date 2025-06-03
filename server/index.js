const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const Redis = require("redis");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// Setup Redis Pub/Sub
// const pub = Redis.createClient();
// const sub = pub.duplicate();

(async () => {
//   await pub.connect();
//   await sub.connect();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`${socket.id} joined ${roomId}`);
    });

    socket.on("hello-from-client", (msg) => {
      console.log("Received from client:", msg);
      socket.emit("hello-from-server", "Hello from server!");
    });

    socket.on("code-change", ({ roomId, code }) => {
    //   pub.publish(roomId, code);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Subscribe to all Redis channels only once
//   sub.pSubscribe("*", (message, channel) => {
//     io.to(channel).emit("receive-code", message);
//   });

  httpServer.listen(4040, () => console.log("Server on 4040"));
  app.get("/", (req, res) => {
    res.send("DebugSync.AI Server is running");
  });
})();