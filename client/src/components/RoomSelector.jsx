import { useState } from "react";
import { FaPlus, FaSignInAlt, FaDoorOpen } from "react-icons/fa";

export default function RoomSelector({ onRoomSelected }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const createRoom = () => {
    const newRoom = Math.random().toString(36).slice(2, 8);
    onRoomSelected(newRoom);
  };

  const joinRoom = () => {
    if (!input.trim()) {
      setError("Please enter a room code.");
      return;
    }
    setError("");
    onRoomSelected(input.trim());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#232526] via-[#414345] to-[#232526]">
      <div className="rounded-3xl bg-white/10 backdrop-blur-lg shadow-2xl border border-white/20 p-8 flex flex-col gap-8 items-center w-full max-w-md">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
          DebugSync.AI
        </h1>
        <button
          onClick={createRoom}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-all text-lg font-semibold w-full justify-center"
        >
          <FaPlus /> Create New Room
        </button>
        <div className="flex flex-col gap-2 w-full">
          <div className="flex gap-2 items-center w-full">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Enter room code"
              className="p-3 rounded-lg text-black flex-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={joinRoom}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-3 rounded-xl shadow-md hover:scale-105 transition-all text-lg font-semibold"
            >
              <FaSignInAlt /> Join
            </button>
          </div>
          {error && (
            <div className="text-red-400 text-sm mt-1">{error}</div>
          )}
        </div>
        <div className="flex flex-col items-center mt-4 text-gray-400 text-sm gap-1">
          <FaDoorOpen className="text-2xl mb-1" />
          <span>
            Enter a room code to join an existing session, or create a new room.
          </span>
        </div>
      </div>
    </div>
  );
}