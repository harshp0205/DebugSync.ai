import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import CodeEditor from "./Editor";
import { FaPlay, FaMagic, FaSave, FaSignOutAlt, FaPowerOff, FaTerminal, FaLightbulb, FaComments } from "react-icons/fa";

// Glassmorphism main container
export default function CodeEditorPage({
  code,
  setCode,
  socket,
  roomId,
  onLeaveRoom,
}) {
  const [output, setOutput] = useState("");
  const [toast, setToast] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [language, setLanguage] = useState("javascript");
  const [users, setUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [pendingExit, setPendingExit] = useState(false);
  const navigate = useNavigate();

  // Get username from localStorage (assuming it's stored as 'username')
  const username = localStorage.getItem("username") || "User";

  const initialSnippets = {
    javascript: `// JavaScript Example\nconsole.log('Hello, world!');`,
    cpp: `// C++ Example\n#include <iostream>\nint main() {\n    std::cout << \"Hello, world!\\n\";\n    return 0;\n}`
  };

  // Assign a color to each user in the room
  function getColorForUser(username) {
    const palette = [
      '#ff4b4b', '#4bafff', '#4bffb3', '#ffb34b', '#b34bff', '#ff4bb3', '#4bff4b', '#ffd24b', '#4bffd2', '#d24bff', '#ff4bd2', '#4bd2ff', '#d2ff4b', '#b3ff4b', '#4bb3ff', '#ffb3b3', '#b3b3ff', '#b3ffb3', '#ffb3ff', '#b3ffff', '#ffffb3'
    ];
    // Hash username to pick a color
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }

  useEffect(() => {
    if (!socket || !roomId) return;
    socket.emit("user-join", { roomId, username });
    socket.on("room-users", setUsers);
    return () => socket.off("room-users", setUsers);
  }, [socket, roomId, username]);

  // Listen for language changes from other users
  useEffect(() => {
    if (!socket || !roomId) return;
    const handleLanguageChange = ({ language }) => {
      setLanguage(language);
      setCode(initialSnippets[language] || '');
    };
    socket.on("language-change", handleLanguageChange);
    return () => socket.off("language-change", handleLanguageChange);
  }, [socket, roomId]);

  // Listen for user list updates and update remote cursor colors
  useEffect(() => {
    if (!socket || !roomId) return;
    const handleRoomUsers = (userList) => {
      setUsers(userList);
      setRemoteCursors(prev => {
        const updated = { ...prev };
        userList.forEach(u => {
          if (updated[u]) updated[u].color = getColorForUser(u);
        });
        return updated;
      });
    };
    socket.on("room-users", handleRoomUsers);
    return () => socket.off("room-users", handleRoomUsers);
  }, [socket, roomId]);

  // --- Real-time Cursor State ---
  useEffect(() => {
    if (!socket || !roomId) return;
    const handleRemoteCursor = ({ cursor, clientId, username }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [username]: { cursor, username, color: getColorForUser(username) }
      }));
    };
    socket.on("remote-cursor", handleRemoteCursor);
    return () => socket.off("remote-cursor", handleRemoteCursor);
  }, [socket, roomId]);

  const logout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const handleLeaveRoom = () => {
    // If there are unsaved changes, prompt the user
    if (code && socket && roomId) {
      setShowExitPrompt(true);
      setPendingExit(true);
      return;
    }
    // Clear all room-specific state on leave
    setOutput("");
    setShowOutput(false);
    setLanguage("javascript");
    setUsers([]);
    setRemoteCursors({});
    setChatMessages([]);
    setChatInput("");
    if (onLeaveRoom) onLeaveRoom();
  };

  const confirmExit = (shouldSave) => {
    setShowExitPrompt(false);
    setPendingExit(false);
    if (shouldSave && socket && roomId) {
      socket.emit("save-room", { roomId, code });
    }
    // Clear all room-specific state on leave
    setOutput("");
    setShowOutput(false);
    setLanguage("javascript");
    setUsers([]);
    setRemoteCursors({});
    setChatMessages([]);
    setChatInput("");
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
        body: JSON.stringify({ code, language }),
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

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    setChatMessages(msgs => [...msgs, { sender: username, text: chatInput }]);
    setChatInput("");
    // Call backend for AI response
    const res = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: chatInput }),
    });
    const data = await res.json();
    setChatMessages(msgs => [...msgs, { sender: "AI", text: data.response }]);
  };

  // When language changes locally, emit to others and set initial code
  const handleLanguageSelect = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    setCode(initialSnippets[lang] || '');
    if (socket && roomId) {
      socket.emit("language-change", { roomId, language: lang });
    }
  };

  useEffect(() => {
    // When joining a new room, reset all state to fresh
    setOutput("");
    setShowOutput(false);
    setLanguage("javascript");
    setUsers([]);
    setRemoteCursors({});
    setChatMessages([]);
    setChatInput("");
  }, [roomId]);

  // When a new room is created, reset all state to fresh
  const handleRoomSelected = (newRoomId) => {
    setOutput("");
    setShowOutput(false);
    setLanguage("javascript");
    setUsers([]);
    setRemoteCursors({});
    setChatMessages([]);
    setChatInput("");
    setCode(initialSnippets["javascript"]);
    if (typeof onLeaveRoom === "function") onLeaveRoom();
    // Set the new roomId (handled in App.jsx, but this ensures state is fresh)
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#232526] via-[#414345] to-[#232526] overflow-hidden">
      {/* Info Bar (left side) */}
      <div className="fixed left-6 z-30 flex flex-col gap-2 items-start bg-white/10 backdrop-blur-md rounded-xl shadow-lg px-5 py-3 border border-white/10 min-w-[180px]">
        <div className="flex items-center gap-2">
          <span className="text-gray-300 font-semibold">Room:</span>
          <span className="text-blue-300 font-mono text-base">{roomId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-300 font-semibold">User:</span>
          <span className="text-green-300 font-mono text-base">{username}</span>
        </div>
        <div className="mt-2">
          <span className="text-gray-400 text-xs font-semibold">Participants:</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {users.map(u => (
              <div key={u} className="flex items-center gap-2 bg-gray-800/80 px-3 py-1 rounded-lg shadow border border-white/10">
                <span style={{ background: getColorForUser(u) }} className="inline-block w-3 h-3 rounded-full border border-white/70"></span>
                <span className="truncate text-white/90 font-mono text-sm">{u}</span>
              </div>
            ))}
          </div>
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
        <div className="flex gap-2 items-center">
          <select
            value={language}
            onChange={handleLanguageSelect}
            className="bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:outline-none"
          >
            <option value="javascript">JavaScript</option>
            <option value="cpp">C++</option>
          </select>
          <button
            onClick={handleRun}
            className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-lg shadow hover:scale-105 transition-all text-sm font-medium"
          >
            <FaPlay className="text-base" /> Run
          </button>
          {/* <button
            onClick={handleSuggest}
            className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-lg shadow hover:scale-105 transition-all text-sm font-medium"
          >
            <FaMagic className="text-base" /> Suggest
          </button> */}
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
            remoteCursors={remoteCursors}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-xl p-3 shadow border border-white/10 flex flex-col min-h-[32px] max-h-32 transition-all duration-200">
              <div className="flex items-center gap-1 mb-1">
                <FaTerminal className="text-green-400 text-base" />
                <strong className="text-green-200 text-base">Output</strong>
              </div>
              <pre className="text-green-100 font-mono whitespace-pre-wrap break-words text-sm mt-1 max-h-24 overflow-auto">{output}</pre>
            </div>
            {/* <div className={`bg-gradient-to-br from-purple-900/80 to-pink-900/80 rounded-xl p-3 shadow border border-white/10 flex flex-col transition-all duration-200 ${showSuggestion ? 'min-h-[180px]' : 'min-h-[32px]'}`}>
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
            </div> */}
          </div>
        </div>
      </div>

      {/* AI Chatbot Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white/10 backdrop-blur-lg shadow-2xl border-l border-white/20 z-40 flex flex-col transition-transform duration-300 ${chatOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="font-bold text-lg text-purple-200 flex items-center gap-2"><FaComments /> AI Assistant</span>
          <button onClick={() => setChatOpen(false)} className="text-white text-xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`rounded-lg px-3 py-2 max-w-[90%] ${msg.sender === "AI" ? "bg-purple-900 text-purple-100 self-end ml-auto" : "bg-gray-800 text-white self-start mr-auto"}`}>{msg.text}</div>
          ))}
        </div>
        <div className="p-3 border-t border-white/10 flex gap-2">
          <input
            className="flex-1 rounded-lg px-3 py-2 bg-gray-900 text-white focus:outline-none"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSendChat()}
            placeholder="Ask the AI anything..."
          />
          <button onClick={handleSendChat} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold">Send</button>
        </div>
      </div>
      {/* Chat open button */}
      <button onClick={() => setChatOpen(true)} className="fixed right-6 bottom-6 z-50 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center text-2xl"><FaComments /></button>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 text-gray-900 px-6 py-3 rounded-xl shadow-2xl font-semibold text-base z-50 animate-fade-in">
          {toast}
        </div>
      )}

      {/* Exit confirmation modal */}
      {showExitPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-gray-900 rounded-xl shadow-xl p-8 flex flex-col gap-4 border border-white/20 min-w-[320px]">
            <div className="text-lg text-white font-semibold">Do you want to save your work before exiting?</div>
            <div className="flex gap-4 justify-end">
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                onClick={() => confirmExit(true)}
              >
                Save & Exit
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold"
                onClick={() => confirmExit(false)}
              >
                Exit Without Saving
              </button>
              <button
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold"
                onClick={() => { setShowExitPrompt(false); setPendingExit(false); }}
              >
                Cancel
              </button>
            </div>
          </div>
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
