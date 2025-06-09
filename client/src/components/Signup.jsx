import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Simple validation
    if (!username || !email || !password || !confirm) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      setSuccess("Account created! Redirecting to login...");
      // Optionally store username for immediate use (not required, but for consistency)
      localStorage.setItem("username", username);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#24243e] text-white">
      <form
        onSubmit={handleSubmit}
        className="relative bg-gradient-to-br from-[#232526]/90 via-[#414345]/90 to-[#232526]/90 p-10 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col gap-7 border border-white/10 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center mb-2">
          <span className="text-5xl mb-3 drop-shadow-lg">📝</span>
          <h2 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight drop-shadow-lg">
            Create Account
          </h2>
        </div>
        {error && (
          <div className="bg-gradient-to-r from-red-700/90 to-pink-700/90 text-white p-3 rounded-xl text-center mb-2 animate-fade-in border border-red-400/40 shadow-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-gradient-to-r from-green-700/90 to-emerald-700/90 text-white p-3 rounded-xl text-center mb-2 animate-fade-in border border-green-400/40 shadow-lg">
            {success}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <input
            className="w-full p-4 bg-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-white placeholder-gray-300 border border-white/10 transition text-lg shadow-inner"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            disabled={loading}
          />
          <input
            className="w-full p-4 bg-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-300 border border-white/10 transition text-lg shadow-inner"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            disabled={loading}
          />
          <input
            className="w-full p-4 bg-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-white placeholder-gray-300 border border-white/10 transition text-lg shadow-inner"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={loading}
          />
          <input
            className="w-full p-4 bg-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-white placeholder-gray-300 border border-white/10 transition text-lg shadow-inner"
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            disabled={loading}
          />
        </div>
        <button
          className={`w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 p-4 rounded-xl font-bold shadow-xl transition-all duration-200 text-xl tracking-wide mt-2 ${
            loading ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
          }`}
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="loader"></span> Signing up...
            </span>
          ) : (
            "Sign Up"
          )}
        </button>
        <div className="flex justify-center items-center mt-3 text-base text-gray-200">
          Already have an account?{" "}
          <Link
            to="/login"
            className="ml-2 text-blue-300 hover:underline font-semibold transition-colors duration-150"
          >
            Login
          </Link>
        </div>
        {/* Loader animation and fade-in animation */}
        <style>{`
          .loader {
            border: 3px solid #fff3;
            border-top: 3px solid #fff;
            border-radius: 50%;
            width: 1.2em;
            height: 1.2em;
            animation: spin 0.8s linear infinite;
            display: inline-block;
            vertical-align: middle;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-fade-in {
            animation: fadeIn 0.4s cubic-bezier(.4,0,.2,1);
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </form>
    </div>
  );
}