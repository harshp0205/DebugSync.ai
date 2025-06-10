const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const { createServer } = require("http");
const { Server } = require("socket.io");
const { connectRedis } = require("./services/redisService");
const { setupSocket } = require("./socket");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Connect to Redis
connectRedis();

// Middleware
app.use(express.json());

// Routes
app.use("/api", require("./routes/aiRoutes"));
app.use("/api", require("./routes/authRoutes"));
app.use("/api", require("./routes/codeRoutes"));
app.use("/api", require("./routes/roomRoutes"));

// Root endpoint
app.get("/", (req, res) => {
  res.send("DebugSync.AI Server is running");
});

// Socket.IO setup
setupSocket(io);

// Start server
const PORT = process.env.PORT || 4040;
httpServer.listen(PORT, () => console.log(`Server on ${PORT}`));