import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CodeEditor from "./Editor";

export default function CodeEditorPage() {
  const [code, setCode] = useState("// Start coding...");
  const navigate = useNavigate();

    const logout = () => {
    localStorage.removeItem("loggedIn");
    setTimeout(() => navigate("/login"), 0);
    };

  return (
    <div className="p-4 bg-gray-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl">DebugSync.AI</h1>
        <button
          onClick={logout}
          className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
      <CodeEditor value={code} onChange={setCode} />
    </div>
  );
}
