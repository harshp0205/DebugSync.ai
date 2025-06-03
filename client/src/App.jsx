import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import io from "socket.io-client";
import Login from "./components/Login";
import Register from "./components/Signup";
import CodeEditorPage from "./components/CodeEditor";

const socket = io("http://localhost:4040", {
  autoConnect: true,
  // transports: ["websocket"], // REMOVE or change this line
});

function App() {
  const [code, setCode] = useState("// Start coding...");
  const [isConnected, setIsConnected] = useState(socket.connected);
  const isLoggedIn = !!localStorage.getItem("loggedIn");
  const roomId = "room-123";

  useEffect(() => {
    // Connection status listeners
    function onConnect() {
      setIsConnected(true);
      socket.emit("join-room", roomId);
      // Send hello from client
      socket.emit("hello-from-client", "Hello from client!");
    }
    function onDisconnect() {
      setIsConnected(false);
    }
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Listen for hello from server
    socket.on("hello-from-server", (msg) => {
      console.log("Received from server:", msg);
    });

    // Join room and receive code
    socket.emit("join-room", roomId);
    socket.on("receive-code", (newCode) => {
      setCode(newCode);
    });

    // Clean up
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("receive-code");
      socket.off("hello-from-server");
    };
  }, []);

  const handleChange = (val) => {
    setCode(val);
    socket.emit("code-change", { roomId, code: val });
  };

  return (
    <Router>
      <div className="fixed top-0 right-0 m-2 text-xs text-gray-400 z-50">
        Socket: {isConnected ? (
          <span className="text-green-400">Connected</span>
        ) : (
          <span className="text-red-400">Disconnected</span>
        )}
      </div>
      <Routes>
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to="/home" /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/home" /> : <Login />}
        />
        <Route
          path="/register"
          element={isLoggedIn ? <Navigate to="/home" /> : <Register />}
        />
        <Route
          path="/home"
          element={
            isLoggedIn ? (
              <CodeEditorPage
                code={code}
                setCode={handleChange}
                socket={socket}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;