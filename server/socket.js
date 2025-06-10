// server/socket.js
const Room = require("./models/Room");
const { redisClient } = require("./services/redisService");

function setupSocket(io) {
  // --- Real-time Presence ---
  const roomUsers = {};
  // --- Chat Request/Response Logic ---
  const chatRequests = {};
  const chatAccepted = {};

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
    });

    socket.on("save-room", async ({ roomId, code }) => {
      const room = await Room.findOne({ roomId });
      let chat = [];
      if (room && room.chat) chat = room.chat;
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
      io.to(roomId).emit("remote-cursor", { cursor, clientId, username: clientId });
    });

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
      socket.to(roomId).emit("language-change", { language });
    });

    socket.on("chat-request", ({ roomId, from }) => {
      if (!roomUsers[roomId]) return;
      chatRequests[roomId] = from;
      chatAccepted[roomId] = new Set([from]);
      Array.from(roomUsers[roomId]).forEach((u) => {
        if (u !== from) {
          io.to(roomId).emit("chat-request-received", { to: u, from });
        }
      });
    });

    socket.on("chat-request-response", ({ roomId, username, accepted }) => {
      if (!roomUsers[roomId] || !chatRequests[roomId]) return;
      if (!accepted) {
        io.to(roomId).emit("chat-cancel", { by: username });
        delete chatRequests[roomId];
        delete chatAccepted[roomId];
        return;
      }
      chatAccepted[roomId].add(username);
      if (chatAccepted[roomId].size === roomUsers[roomId].size) {
        io.to(roomId).emit("chat-start", { users: Array.from(roomUsers[roomId]) });
        delete chatRequests[roomId];
        delete chatAccepted[roomId];
      }
    });

    socket.on("group-message", async ({ roomId, username, message }) => {
      io.to(roomId).emit("group-message", { username, message });
      await Room.findOneAndUpdate(
        { roomId },
        { $push: { chat: { sender: username, text: message, timestamp: new Date() } }, $set: { updatedAt: new Date() } },
        { upsert: true }
      );
    });

    socket.on("kick-user", async ({ roomId, target }) => {
      const room = await Room.findOne({ roomId });
      if (!room) return;
      if (socket._username !== room.admin) return;
      await Room.updateOne({ roomId }, { $pull: { users: target } });
      for (const [id, s] of io.of("/").sockets) {
        if (s._roomId === roomId && s._username === target) {
          s.emit("kicked", { roomId });
          s.leave(roomId);
        }
      }
      const updatedRoom = await Room.findOne({ roomId });
      io.to(roomId).emit("room-admin", { admin: updatedRoom.admin, users: updatedRoom.users });
      io.to(roomId).emit("room-users", updatedRoom.users);
    });
  });
}

module.exports = { setupSocket };
