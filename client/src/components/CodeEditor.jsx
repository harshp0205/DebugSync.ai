import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import CodeEditor from "./Editor";
import { FaPlay, FaMagic, FaSave, FaSignOutAlt, FaPowerOff, FaTerminal, FaLightbulb, FaComments, FaHistory } from "react-icons/fa";

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
  // const [groupChatOpen, setGroupChatOpen] = useState(false);
  // const [groupInput, setGroupInput] = useState("");
  // const [groupMessages, setGroupMessages] = useState([]);
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

  // --- Track last saved code to avoid unnecessary save prompts ---
  const [lastSavedCode, setLastSavedCode] = useState(code);

  // Update lastSavedCode on save
  const handleSaveRoom = () => {
    if (socket && roomId) {
      socket.emit("save-room", { roomId, code });
      setLastSavedCode(code);
    }
    setToast("Room saved!");
    setTimeout(() => setToast(""), 2000);
  };

  // Update lastSavedCode when code is loaded from server (on join)
  useEffect(() => {
    setLastSavedCode(code);
  }, [roomId]);

  // Only prompt to save if code is different from last saved
  const handleLeaveRoom = () => {
    if (code !== lastSavedCode && code && socket && roomId) {
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
    if (onLeaveRoom) onLeaveRoom(); // App will handle navigation
  };

  const confirmExit = (shouldSave) => {
    setShowExitPrompt(false);
    setPendingExit(false);
    if (shouldSave && socket && roomId) {
      socket.emit("save-room", { roomId, code });
      setLastSavedCode(code);
    }
    // Clear all room-specific state on leave
    setOutput("");
    setShowOutput(false);
    setLanguage("javascript");
    setUsers([]);
    setRemoteCursors({});
    setChatMessages([]);
    setChatInput("");
    if (onLeaveRoom) onLeaveRoom(); // App will handle navigation
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
    // Fetch group chat history for this room
    fetch(`/api/room/${roomId}/chat`).then(res => res.json()).then(data => {
      setGroupMessages(Array.isArray(data.chat) ? data.chat : []);
    });
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

  // --- Add state and logic at the top of the component ---
  const [groupChatOpen, setGroupChatOpen] = useState(false);
  const [groupInput, setGroupInput] = useState("");
  const [groupMessages, setGroupMessages] = useState([]);

  // --- Socket logic for group chat ---
  useEffect(() => {
    if (!socket || !roomId) return;
    const handleGroupMessage = ({ username: sender, message }) => {
      setGroupMessages(msgs => [...msgs, { sender, text: message }]);
    };
    socket.on("group-message", handleGroupMessage);
    return () => socket.off("group-message", handleGroupMessage);
  }, [socket, roomId]);

  const handleSendGroupChat = () => {
    if (!groupInput.trim()) return;
    socket.emit("group-message", { roomId, username, message: groupInput });
    setGroupInput("");
  };

  // --- History modal state ---
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch history when modal is opened
  const openHistory = async () => {
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/room/${roomId}/history`);
      const data = await res.json();
      setHistory(Array.isArray(data.history) ? data.history.reverse() : []);
    } catch (e) {
      setHistory([]);
    }
    setLoadingHistory(false);
  };
  const closeHistory = () => {
    setShowHistory(false);
    setSelectedSnapshot(null);
  };

  // --- Admin and user management ---
  const [admin, setAdmin] = useState("");
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (!socket || !roomId) return;
    const handleRoomAdmin = ({ admin, users }) => {
      setAdmin(admin);
      setAllUsers(users);
    };
    socket.on("room-admin", handleRoomAdmin);
    return () => socket.off("room-admin", handleRoomAdmin);
  }, [socket, roomId]);

  // Listen for being kicked
  useEffect(() => {
    if (!socket) return;
    const handleKicked = ({ roomId: kickedRoom }) => {
      if (kickedRoom === roomId) {
        alert("You have been kicked from the room by the admin.");
        if (onLeaveRoom) onLeaveRoom();
      }
    };
    socket.on("kicked", handleKicked);
    return () => socket.off("kicked", handleKicked);
  }, [socket, roomId, onLeaveRoom]);

  // Kick user (admin only)
  const handleKickUser = (target) => {
    if (window.confirm(`Kick ${target} from the room?`)) {
      socket.emit("kick-user", { roomId, target });
    }
  };

  // --- Notification state for chat and group chat ---
  const [aiUnread, setAiUnread] = useState(false);
  const [groupUnread, setGroupUnread] = useState(false);

  // Mark AI chat as read when opened
  useEffect(() => {
    if (chatOpen) setAiUnread(false);
  }, [chatOpen]);
  // Mark group chat as read when opened
  useEffect(() => {
    if (groupChatOpen) setGroupUnread(false);
  }, [groupChatOpen]);

  // Set AI chat unread when new AI message arrives and sidebar is closed
  useEffect(() => {
    if (!chatOpen && chatMessages.length > 0) {
      const last = chatMessages[chatMessages.length - 1];
      if (last && last.sender === "AI") setAiUnread(true);
    }
    // eslint-disable-next-line
  }, [chatMessages]);

  // Set group chat unread when new group message arrives and sidebar is closed
  useEffect(() => {
    if (!groupChatOpen && groupMessages.length > 0) {
      const last = groupMessages[groupMessages.length - 1];
      if (last && last.sender !== username) setGroupUnread(true);
    }
    // eslint-disable-next-line
  }, [groupMessages]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#18181c] via-[#232526] to-[#18181c] overflow-hidden text-white">
      {/* Info Bar (left side) */}
      <div className="fixed left-6 top-24 z-30 flex flex-col gap-2 items-start bg-[#232526]/80 backdrop-blur-md rounded-2xl shadow-2xl px-4 py-3 border border-white/10 min-w-[160px] max-w-[200px]">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-semibold text-xs">Room:</span>
          <span className="text-blue-300 font-mono text-xs">{roomId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-semibold text-xs">User:</span>
          <span className="text-green-300 font-mono text-xs">{username}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-gray-400 text-xs font-semibold">Admin:</span>
          <span className="text-yellow-300 text-xs font-mono font-bold">
            {admin || "(no admin)"}
          </span>
        </div>
        <div className="mt-2">
          <span className="text-gray-500 text-xs font-semibold">Participants:</span>
          <div className="flex flex-col gap-1 mt-1 w-full">
            {allUsers.filter(u => u !== admin).length === 0 && (
              <span className="text-gray-400 text-xs">No other participants</span>
            )}
            {allUsers.filter(u => u !== admin).map(u => (
              <div key={u} className="flex items-center gap-1 bg-[#232526]/90 px-2 py-1 rounded-md shadow border border-white/10 min-w-0 max-w-full">
                <span style={{ background: getColorForUser(u) }} className="inline-block w-2 h-2 rounded-full border border-white/70"></span>
                <span className="truncate text-white/90 font-mono text-xs max-w-[70px]">{u || "(unknown)"}</span>
                {admin === username && u !== username && (
                  <button
                    className="ml-1 text-[10px] text-red-400 hover:text-red-600 font-bold px-1 py-0.5 rounded hover:bg-red-900/30 transition"
                    onClick={() => handleKickUser(u)}
                    title={`Kick ${u}`}
                  >
                    Kick
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Bar */}
      <div className="fixed top-0 left-0 w-full flex items-center justify-between px-8 py-4 z-20 backdrop-blur-md bg-[#232526]/80 border-b border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <img src="/vite.svg" alt="Logo" className="h-8 w-8 drop-shadow-lg" />
          <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent select-none tracking-tight drop-shadow-lg">
            DebugSync.AI
          </span>
        </div>
        <div className="flex gap-0 items-center bg-[#18181c]/80 rounded-2xl shadow border border-white/10 px-2 py-1">
          {/* Language Selector as a pill tab */}
          <div className="flex items-center mr-2">
            <span className="text-xs text-gray-400 font-semibold mr-2">Language:</span>
            <select
              value={language}
              onChange={handleLanguageSelect}
              className="bg-[#232526] text-white rounded-full px-3 py-1 text-base border border-gray-700 focus:outline-none shadow font-semibold hover:bg-[#232526]/80 transition-all duration-150"
              style={{ minWidth: 120 }}
            >
              <option value="javascript">JavaScript</option>
              <option value="cpp">C++</option>
            </select>
          </div>
          {/* Tab-style buttons */}
          <button
            onClick={handleRun}
            className="flex items-center gap-1 px-4 py-2 rounded-full font-semibold text-base bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow hover:scale-105 hover:from-green-600 hover:to-emerald-700 focus:outline-none border-2 border-transparent mx-1 transition-all duration-150"
            style={{ boxShadow: '0 2px 8px #00ffb340' }}
          >
            <FaPlay className="text-lg" /> Run
          </button>
          <button
            onClick={handleSaveRoom}
            className="flex items-center gap-2 px-3 py-2 rounded-full font-semibold text-base bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow hover:scale-105 hover:from-blue-600 hover:to-cyan-600 focus:outline-none border-2 border-transparent mx-1 transition-all duration-150"
            style={{ boxShadow: '0 2px 8px #38bdf840' }}
          >
            <FaSave className="text-lg" /> Save
          </button>
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-base bg-gradient-to-r from-gray-400 to-gray-600 text-white shadow hover:scale-105 hover:from-gray-500 hover:to-gray-700 focus:outline-none border-2 border-transparent mx-1 transition-all duration-150"
            style={{ boxShadow: '0 2px 8px #a3a3a340' }}
          >
            <FaSignOutAlt className="text-lg" /> Exit
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-base bg-gradient-to-r from-red-500 to-pink-600 text-white shadow hover:scale-105 hover:from-red-600 hover:to-pink-700 focus:outline-none border-2 border-transparent mx-1 transition-all duration-150"
            style={{ boxShadow: '0 2px 8px #ff4b4b40' }}
          >
            <FaPowerOff className="text-lg" /> Logout
          </button>
          {/* History Button */}
          <button
            onClick={openHistory}
            className="flex items-center gap-2 px-3 py-2 rounded-full font-semibold text-base bg-gradient-to-r from-yellow-500 to-yellow-700 text-white shadow hover:scale-105 hover:from-yellow-600 hover:to-yellow-800 focus:outline-none border-2 border-transparent mx-1 transition-all duration-150"
            style={{ boxShadow: '0 2px 8px #facc1540' }}
            title="View Room History"
          >
            <FaHistory className="text-lg" /> History
          </button>
        </div>
      </div>

      {/* Main Card (glassmorphism, centered, not overflowing) */}
      <div className="relative z-10 mt-28 w-full max-w-4xl flex flex-col gap-6 items-center px-2">
        <div className="w-full rounded-3xl bg-[#18181c]/90 backdrop-blur-2xl shadow-2xl border border-white/20 p-6 flex flex-col gap-5">
          <CodeEditor
            value={code}
            onChange={setCode}
            socket={socket}
            roomId={roomId}
            remoteCursors={remoteCursors}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <div className="bg-gradient-to-br from-[#232526]/90 to-[#18181c]/90 rounded-2xl p-4 shadow border border-white/10 flex flex-col min-h-[40px] max-h-40 transition-all duration-200">
              <div className="flex items-center gap-2 mb-1">
                <FaTerminal className="text-green-400 text-lg" />
                <strong className="text-green-200 text-lg">Output</strong>
              </div>
              <pre className="text-green-100 font-mono whitespace-pre-wrap break-words text-base mt-11 max-h-52 overflow-auto">{output}</pre>
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

      {/* Chat/Assistant Toggle Buttons */}
      {/* Only show both buttons if neither chat is open. If one is open, show a small floating button for the other. */}
      {(!chatOpen && !groupChatOpen) && (
        <div className="fixed right-8 bottom-16 z-50 flex flex-col gap-4">
          <button
            onClick={() => { setChatOpen(true); setGroupChatOpen(false); }}
            className={`relative bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full p-5 shadow-2xl flex items-center justify-center text-3xl transition-all duration-150 hover:scale-105`}
            title="AI Assistant"
          >
            <FaComments />
            {aiUnread && (
              <span className="absolute top-2 right-2 w-3 h-3 bg-pink-400 border-2 border-white rounded-full animate-pulse shadow-lg"></span>
            )}
          </button>
          <button
            onClick={() => { setGroupChatOpen(true); setChatOpen(false); }}
            className={`relative bg-gradient-to-br from-blue-600 via-cyan-600 to-green-500 hover:from-blue-700 hover:to-green-700 text-white rounded-full p-5 shadow-2xl flex items-center justify-center text-3xl transition-all duration-150 hover:scale-105`}
            title="Group Chat"
          >
            <span className="font-bold text-xl">👥</span>
            {groupUnread && (
              <span className="absolute top-2 right-2 w-3 h-3 bg-yellow-400 border-2 border-white rounded-full animate-pulse shadow-lg"></span>
            )}
          </button>
        </div>
      )}
      {chatOpen && !groupChatOpen && (
        <button
          onClick={() => { setGroupChatOpen(true); setChatOpen(false); }}
          className="fixed right-8 bottom-16 z-50 bg-gradient-to-br from-blue-600 via-cyan-600 to-green-500 hover:from-blue-700 hover:to-green-700 text-white rounded-full p-3 shadow-2xl flex items-center justify-center text-2xl transition-all duration-150 hover:scale-110"
          title="Open Group Chat"
        >
          <span className="font-bold">👥</span>
          {groupUnread && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-yellow-400 border-2 border-white rounded-full animate-pulse shadow-lg"></span>
          )}
        </button>
      )}
      {groupChatOpen && !chatOpen && (
        <button
          onClick={() => { setChatOpen(true); setGroupChatOpen(false); }}
          className="fixed right-8 bottom-16 z-50 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full p-3 shadow-2xl flex items-center justify-center text-2xl transition-all duration-150 hover:scale-110"
          title="Open AI Assistant"
        >
          <FaComments />
          {aiUnread && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-pink-400 border-2 border-white rounded-full animate-pulse shadow-lg"></span>
          )}
        </button>
      )}

      {/* AI Chatbot Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-[#232526]/90 backdrop-blur-2xl shadow-2xl border-l border-white/20 z-40 flex flex-col transition-transform duration-300 ${chatOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <span className="font-bold text-2xl text-purple-200 flex items-center gap-3"><FaComments /> AI Assistant</span>
          <button onClick={() => setChatOpen(false)} className="text-white text-4xl w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-all duration-150">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`rounded-xl px-4 py-3 max-w-[90%] ${msg.sender === "AI" ? "bg-purple-900 text-purple-100 self-end ml-auto" : "bg-gray-800 text-white self-start mr-auto"}`}>{msg.text}</div>
          ))}
        </div>
        <div className="p-4 border-t border-white/10 flex gap-3">
          <input
            className="flex-1 rounded-xl px-4 py-3 bg-gray-900 text-white focus:outline-none"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSendChat()}
            placeholder="Ask the AI anything..."
          />
          <button onClick={handleSendChat} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold">Send</button>
        </div>
      </div>

      {/* Group Chat Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-[#232526]/90 backdrop-blur-2xl shadow-2xl border-l border-white/20 z-40 flex flex-col transition-transform duration-300 ${groupChatOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <span className="font-bold text-2xl text-blue-200 flex items-center gap-3">👥 Group Chat</span>
          <button onClick={() => setGroupChatOpen(false)} className="text-white text-4xl w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-all duration-150">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {groupMessages.map((msg, i) => (
            <div
              key={i}
              className={`relative group rounded-xl px-4 py-3 max-w-[90%] ${msg.sender === username ? "bg-blue-900 text-blue-100 self-end ml-auto" : "bg-gray-800 text-white self-start mr-auto"}`}
            >
              {msg.sender}: {msg.text}
              {msg.timestamp && (
                <span
                  className="absolute -top-7 left-0 bg-black/80 text-xs text-gray-200 px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-white/10 flex gap-3">
          <input
            className="flex-1 rounded-xl px-4 py-3 bg-gray-900 text-white focus:outline-none"
            value={groupInput}
            onChange={e => setGroupInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSendGroupChat()}
            placeholder="Message the group..."
          />
          <button onClick={handleSendGroupChat} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold">Send</button>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/90 text-gray-900 px-8 py-4 rounded-2xl shadow-2xl font-semibold text-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      {/* Exit confirmation modal */}
      {showExitPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#232526] rounded-2xl shadow-2xl p-10 flex flex-col gap-6 border border-white/20 min-w-[340px]">
            <div className="text-xl text-white font-semibold">Do you want to save your work before exiting?</div>
            <div className="flex gap-6 justify-end">
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-semibold"
                onClick={() => confirmExit(true)}
              >
                Save & Exit
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-semibold"
                onClick={() => confirmExit(false)}
              >
                Exit Without Saving
              </button>
              <button
                className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-3 rounded-xl font-semibold"
                onClick={() => { setShowExitPrompt(false); setPendingExit(false); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#232526] rounded-2xl shadow-2xl p-8 flex flex-col gap-4 border border-white/20 min-w-[480px] max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xl text-white font-semibold flex items-center gap-2"><FaHistory /> Room History</div>
              <button onClick={closeHistory} className="text-white text-3xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-all duration-150">×</button>
            </div>
            {loadingHistory ? (
              <div className="text-gray-300 text-center py-8">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No history found for this room.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Group history by username */}
                {Object.entries(
                  history.reduce((acc, snap) => {
                    const user = snap.user || "Unknown";
                    if (!acc[user]) acc[user] = [];
                    acc[user].push(snap);
                    return acc;
                  }, {})
                ).map(([user, snaps]) => (
                  <div key={user} className="mb-2">
                    <div className="text-lg font-bold text-blue-300 mb-1">{username}</div>
                    <div className="flex flex-col gap-2">
                      {snaps.map((snap, idx) => (
                        <div
                          key={idx}
                          className={`rounded-xl px-4 py-3 bg-[#18181c]/80 border border-white/10 flex flex-col gap-1 cursor-pointer hover:bg-[#232526]/90 transition`}
                          onClick={() => setSelectedSnapshot(snap)}
                        >
                          <div className="flex items-center gap-3 text-sm text-gray-300">
                            <span className="text-gray-400">{new Date(snap.timestamp).toLocaleString()}</span>
                          </div>
                          <pre className="text-xs text-gray-200 mt-1 max-h-16 overflow-auto whitespace-pre-wrap break-words">{snap.code.slice(0, 200)}{snap.code.length > 200 ? "..." : ""}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Snapshot detail modal */}
            {selectedSnapshot && (
              <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70">
                <div className="bg-[#232526] rounded-2xl shadow-2xl p-8 flex flex-col gap-4 border border-white/20 min-w-[480px] max-w-2xl max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg text-white font-semibold flex items-center gap-2"><FaHistory /> Snapshot</div>
                    <button onClick={() => setSelectedSnapshot(null)} className="text-white text-3xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-all duration-150">×</button>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="font-bold text-blue-200">{selectedSnapshot.user || "Unknown"}</span>
                    <span className="text-gray-400">{new Date(selectedSnapshot.timestamp).toLocaleString()}</span>
                  </div>
                  <pre className="text-sm text-gray-200 mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words border border-white/10 rounded-xl bg-[#18181c]/80 p-4">{selectedSnapshot.code}</pre>
                </div>
              </div>
            )}
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

