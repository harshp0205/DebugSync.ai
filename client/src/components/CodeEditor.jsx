import { useNavigate } from "react-router-dom";
import CodeEditor from "./Editor";

export default function CodeEditorPage({
  code,
  setCode,
  socket,
  roomId,
  onLeaveRoom,
}) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("loggedIn");
    setTimeout(() => navigate("/login"), 0);
  };

  const handleLeaveRoom = () => {
    if (onLeaveRoom) onLeaveRoom();
  };

  const handleSaveRoom = () => {
    if (socket && roomId) {
      socket.emit("save-room", { roomId, code });
    }
    // Optionally show a toast/alert for feedback
    alert("Room saved!");
  };

  return (
    <div className="p-4 bg-gray-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl">DebugSync.AI</h1>
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSaveRoom}
            className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
          >
            Save Room
          </button>
          <button
            onClick={handleLeaveRoom}
            className="bg-yellow-600 px-3 py-1 rounded hover:bg-yellow-700"
          >
            Leave Room
          </button>
          <button
            onClick={logout}
            className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
      <CodeEditor
        value={code}
        onChange={setCode}
        socket={socket}
        roomId={roomId}
      />
    </div>
  );
}
