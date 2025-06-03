import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      if (email === "user@example.com" && password === "password123" || email === "user1@example.com" && password === "password123" ) {
        localStorage.setItem("loggedIn", "true");
        navigate("/home");
      } else {
        setError("Invalid email or password.");
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-white">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-8 rounded-lg shadow-lg w-96 flex flex-col gap-4"
      >
        <div className="flex flex-col items-center mb-2">
          <span className="text-3xl mb-2">🔒</span>
          <h2 className="text-2xl font-bold">Sign In</h2>
        </div>
        {error && (
          <div className="bg-red-700 text-white p-2 rounded text-center mb-2">
            {error}
          </div>
        )}
        <input
          className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          disabled={loading}
        />
        <input
          className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={loading}
        />
        <button
          className={`w-full bg-blue-600 hover:bg-blue-700 p-3 rounded font-semibold transition ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          type="submit"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        <div className="flex justify-between items-center mt-2 text-sm">
          <Link to="/forgot" className="text-blue-400 hover:underline">
            Forgot password?
          </Link>
          <span>
            No account?{" "}
            <Link to="/register" className="text-blue-400 hover:underline">
              Register
            </Link>
          </span>
        </div>
      </form>
    </div>
  );
}