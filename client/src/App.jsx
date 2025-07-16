import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import io from "socket.io-client";
import Login from "./components/Login";
import Register from "./components/Signup";
import CodeEditorPage from "./components/CodeEditor";
import RoomSelector from "./components/RoomSelector";

// Create socket connection with dynamic username
let socket = null;

function createSocketConnection() {
  const username = localStorage.getItem("username") || "User";
  
  if (socket) {
    socket.disconnect();
  }
  
  socket = io("http://localhost:3000", {
    autoConnect: true,
    query: {
      username: username
    },
    auth: {
      username: username
    }
  });
  
  console.log(`Socket connecting with username: ${username}`);
  return socket;
}

function AppRoutes() {
  const [code, setCode] = useState("// Start coding...");
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState("");
  const isLoggedIn = !!localStorage.getItem("loggedIn");
  const navigate = useNavigate();

  // Initialize socket connection when logged in
  useEffect(() => {
    if (isLoggedIn && !socket) {
      socket = createSocketConnection();
      setIsConnected(socket.connected);
      
      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
        setIsConnected(true);
      });
      
      socket.on("disconnect", () => {
        console.log("Socket disconnected");
        setIsConnected(false);
      });
      
      socket.on("room-error", (data) => {
        console.error("Room error:", data.error);
        alert(`Room error: ${data.error}`);
      });
    }
    
    return () => {
      if (socket && !isLoggedIn) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!roomId || !socket) return;
    
    function onConnect() {
      console.log(`Joining room ${roomId} with socket ${socket.id}`);
      socket.emit("join-room", roomId);
    }
    
    if (socket.connected) {
      onConnect();
    } else {
      socket.on("connect", onConnect);
    }
    
    socket.on("receive-code", (newCode) => {
      console.log("Received code update");
      setCode(newCode);
    });
    
    return () => {
      socket.off("connect", onConnect);
      socket.off("receive-code");
    };
  }, [roomId]);

  const handleChange = (val) => {
    setCode(val);
    if (roomId && socket) {
      socket.emit("code-change", { roomId, code: val });
    }
  };

  // Handler for joining/creating a room
  const handleRoomSelected = (newRoomId) => {
    console.log(`Room selected: ${newRoomId}`);
    setRoomId(newRoomId);
    navigate("/room");
  };

  // Handler for leaving a room
  const handleLeaveRoom = () => {
    console.log(`Leaving room: ${roomId}`);
    setRoomId("");
    navigate("/home");
  };

  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <>
      <div className="fixed top-0 right-0 m-2 text-xs text-gray-400 z-50">
        Room: <span className="text-blue-300 font-mono">{roomId || "None"}</span> | Socket: {isConnected ? (
          <span className="text-green-400">Connected</span>
        ) : (
          <span className="text-red-400">Disconnected</span>
        )}
      </div>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/home" />} />
        <Route
          path="/home"
          element={<RoomSelector onRoomSelected={handleRoomSelected} />} />
        <Route
          path="/room"
          element={roomId ? (
            <CodeEditorPage
              code={code}
              setCode={handleChange}
              socket={socket}
              roomId={roomId}
              onLeaveRoom={handleLeaveRoom}
            />
          ) : (
            <Navigate to="/home" />
          )}
        />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;