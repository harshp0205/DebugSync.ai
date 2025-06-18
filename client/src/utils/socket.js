import { io } from "socket.io-client";

// Use the correct socket URL based on environment
let socketURL;

// Check if we're running in development or production
if (import.meta.env.DEV) {
  // In development with Vite, use the proxy configuration
  socketURL = '/';  // This will be proxied by Vite to the backend
} else {
  // In production, you would use your production URL
  socketURL = window.location.origin;
}

console.log('Connecting to Socket.IO at:', socketURL);

// Create socket instance with proper configuration
const socket = io(socketURL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
  transports: ['polling', 'websocket']  // Try polling first, then upgrade
});

// Connection event handlers
socket.on("connect", () => {
  console.log("Socket connected successfully:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error.message);
});

// Export socket instance
export default socket;
