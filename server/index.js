require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { connectRedis } = require("./services/redisService");

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Connect to Redis
connectRedis();

// Routes
app.use("/api", require("./routes/aiRoutes"));
app.use("/api", require("./routes/authRoutes"));
app.use("/api", require("./routes/codeRoutes"));
app.use("/api", require("./routes/roomRoutes"));

// Root endpoint
app.get("/", (req, res) => {
  res.send("DebugSync.AI Server is running");
});

// Error handling middleware with more detailed logging
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: JSON.stringify(req.body).substring(0, 1000) // Truncated body for logging
  });
  
  res.status(500).json({ 
    message: 'Internal Server Error', 
    error: err.message,
    path: req.path
  });
});

// Setup Socket.IO with the same HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Import socket handlers but pass the io instance
const setupSocketHandlers = require('./socket');
setupSocketHandlers(io);

// Socket.io connection debugging
io.engine.on("connection_error", (err) => {
  console.log("Socket.io connection error:", err.req, err.code, err.message, err.context);
});

// Start server
httpServer.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT} with Socket.io`)
);

// Export io instance if needed elsewhere
module.exports = { app, io };