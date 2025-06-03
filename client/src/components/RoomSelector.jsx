import { useState } from "react";

export default function RoomSelector({ onRoomSelected }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const createRoom = () => {
    // Generate a random 6-character room code
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
    <div className="flex flex-col items-center gap-4 mt-24">
      <button
        onClick={createRoom}
        className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700"
      >
        Create New Room
      </button>
      <div className="flex gap-2 items-center">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Enter room code"
          className="p-2 rounded text-black"
        />
        <button
          onClick={joinRoom}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Join Room
        </button>
      </div>
      {error && <div className="text-red-400">{error}</div>}
    </div>
  );
}
