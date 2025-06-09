import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import io from "socket.io-client";
import Login from "./components/Login";
import Register from "./components/Signup";
import CodeEditorPage from "./components/CodeEditor";
import RoomSelector from "./components/RoomSelector";

const socket = io("http://localhost:4040", {
  autoConnect: true,
});

function AppRoutes() {
  const [code, setCode] = useState("// Start coding...");
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [roomId, setRoomId] = useState("");
  const isLoggedIn = !!localStorage.getItem("loggedIn");
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomId) return;
    function onConnect() {
      setIsConnected(true);
      socket.emit("join-room", roomId);
      socket.emit("hello-from-client", "Hello from client!");
    }
    function onDisconnect() {
      setIsConnected(false);
    }
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("hello-from-server", (msg) => {
      console.log("Received from server:", msg);
    });
    socket.on("receive-code", (newCode) => {
      setCode(newCode);
    });
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("receive-code");
      socket.off("hello-from-server");
    };
  }, [roomId]);

  const handleChange = (val) => {
    setCode(val);
    if (roomId) {
      socket.emit("code-change", { roomId, code: val });
    }
  };

  // Handler for joining/creating a room
  const handleRoomSelected = (newRoomId) => {
    setRoomId(newRoomId);
    navigate("/room");
  };

  // Handler for leaving a room
  const handleLeaveRoom = () => {
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
        Room: <span className="text-blue-300 font-mono">{roomId}</span> | Socket: {isConnected ? (
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