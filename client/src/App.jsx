import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import io from "socket.io-client";
import Login from "./components/Login";
import Register from "./components/Signup";
import CodeEditorPage from "./components/CodeEditor";
import RoomSelector from "./components/RoomSelector";

const socket = io("http://localhost:4040", {
  autoConnect: true,
});

function App() {
  const [code, setCode] = useState("// Start coding...");
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [roomId, setRoomId] = useState("");
  const isLoggedIn = !!localStorage.getItem("loggedIn");

  useEffect(() => {
    if (!roomId) return;
    // Connection status listeners
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
    socket.emit("join-room", roomId);
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

  if (!isLoggedIn) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  if (!roomId) {
    return <RoomSelector onRoomSelected={setRoomId} />;
  }

  const handleLeaveRoom = () => {
    setRoomId("");
  };

  return (
    <Router>
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
          element={<Navigate to="/home" />}
        />
        <Route
          path="/home"
          element={
            <CodeEditorPage
              code={code}
              setCode={handleChange}
              socket={socket}
              roomId={roomId}
              onLeaveRoom={handleLeaveRoom}
            />
          }
        />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </Router>
  );
}

export default App;