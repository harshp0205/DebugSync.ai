import { useNavigate } from "react-router-dom";
import { useState } from "react";
import CodeEditor from "./Editor";
import { FaPlay, FaMagic, FaSave, FaSignOutAlt, FaPowerOff, FaTerminal, FaLightbulb } from "react-icons/fa";

// Glassmorphism main container
export default function CodeEditorPage({
  code,
  setCode,
  socket,
  roomId,
  onLeaveRoom,
}) {
  const [output, setOutput] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [toast, setToast] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const navigate = useNavigate();

  // Get username from localStorage (assuming it's stored as 'username')
  const username = localStorage.getItem("username") || "User";

  const logout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const handleLeaveRoom = () => {
    if (onLeaveRoom) onLeaveRoom();
  };

  const handleSaveRoom = () => {
    if (socket && roomId) {
      socket.emit("save-room", { roomId, code });
    }
    setToast("Room saved!");
    setTimeout(() => setToast(""), 2000);
  };

  const handleRun = async () => {
    setOutput("Running...");
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: "javascript" }),
      });
      const result = await res.json();
      setOutput(
        result.error
          ? `Error: ${result.error}\n${result.stderr || ""}`
          : result.stdout || result.stderr || "No output"
      );
    } catch (e) {
      setOutput("Failed to run code: " + e.message);
    }
  };

  const handleSuggest = async () => {
    setSuggestion("Loading...");
    try {
      const res = await fetch("/api/llm-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          prompt: "Suggest a code completion or improvement for this code:",
        }),
      });
      const data = await res.json();
      setSuggestion(data.suggestion || "No suggestion.");
    } catch (e) {
      setSuggestion("Failed to get suggestion: " + e.message);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#232526] via-[#414345] to-[#232526] overflow-hidden">
      {/* Info Bar (left side) */}
      <div className=" fixed left-6 z-30 flex flex-col gap-2 items-start bg-white/10 backdrop-blur-md rounded-xl shadow-lg px-5 py-3 border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-gray-300 font-semibold">Room:</span>
          <span className="text-blue-300 font-mono text-base">{roomId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-300 font-semibold">User:</span>
          <span className="text-green-300 font-mono text-base">{username}</span>
        </div>
      </div>

      {/* Top Bar */}
      <div className="fixed top-0 left-0 w-full flex items-center justify-between px-6 py-3 z-20 backdrop-blur-md bg-white/10 border-b border-white/10 shadow-md">
        <div className="flex items-center gap-2">
          <img src="/vite.svg" alt="Logo" className="h-7 w-7 drop-shadow-lg" />
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent select-none">
            DebugSync.AI
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRun}
            className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-lg shadow hover:scale-105 transition-all text-sm font-medium"
          >
            <FaPlay className="text-base" /> Run
          </button>
          <button
            onClick={handleSuggest}
            className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-lg shadow hover:scale-105 transition-all text-sm font-medium"
          >
            <FaMagic className="text-base" /> Suggest
          </button>
          <button
            onClick={handleSaveRoom}
            className="flex items-center gap-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-1.5 rounded-lg shadow hover:scale-105 transition-all text-sm font-medium"
          >
            <FaSave className="text-base" /> Save
          </button>
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-1 bg-gradient-to-r from-gray-400 to-gray-600 text-white px-3 py-1.5 rounded-lg shadow hover:scale-105 transition-all text-sm font-medium"
          >
            <FaSignOutAlt className="text-base" /> Exit
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1.5 rounded-lg shadow hover:scale-105 transition-all text-sm font-medium"
          >
            <FaPowerOff className="text-base" /> Logout
          </button>
        </div>
      </div>

      {/* Main Card (glassmorphism, centered, not overflowing) */}
      <div className="relative z-10 mt-24 w-full max-w-3xl flex flex-col gap-4 items-center px-2">
        <div className="w-full rounded-2xl bg-white/10 backdrop-blur-lg shadow-xl border border-white/20 p-4 flex flex-col gap-3">
          <CodeEditor
            value={code}
            onChange={setCode}
            socket={socket}
            roomId={roomId}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-xl p-3 shadow border border-white/10 flex flex-col min-h-[32px] max-h-32 transition-all duration-200">
              <div className="flex items-center gap-1 mb-1">
                <FaTerminal className="text-green-400 text-base" />
                <strong className="text-green-200 text-base">Output</strong>
              </div>
              <pre className="text-green-100 font-mono whitespace-pre-wrap break-words text-sm mt-1 max-h-24 overflow-auto">{output}</pre>
            </div>
            <div className={`bg-gradient-to-br from-purple-900/80 to-pink-900/80 rounded-xl p-3 shadow border border-white/10 flex flex-col transition-all duration-200 ${showSuggestion ? 'min-h-[180px]' : 'min-h-[32px]'}`}>
              <div className="flex items-center gap-1 mb-1 justify-between">
                <div className="flex items-center gap-1">
                  <FaLightbulb className="text-purple-300 text-base" />
                  <strong className="text-purple-100 text-base">AI Suggestion</strong>
                </div>
                <button
                  className="text-xs text-purple-100 hover:underline focus:outline-none"
                  onClick={() => setShowSuggestion(v => !v)}
                >
                  {showSuggestion ? "Hide" : "Show"}
                </button>
              </div>
              {showSuggestion && (
                <pre className="text-purple-100 font-mono whitespace-pre-wrap break-words text-sm mt-1 max-h-64 overflow-auto">{suggestion}</pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 text-gray-900 px-6 py-3 rounded-xl shadow-2xl font-semibold text-base z-50 animate-fade-in">
          {toast}
        </div>
      )}

      {/* Animations */}
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.4s cubic-bezier(.4,0,.2,1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
