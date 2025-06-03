import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Simple validation
    if (!email || !password || !confirm) {
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

    // Simulate async signup
    setTimeout(() => {
      setSuccess("Account created! Redirecting to login...");
      setLoading(false);
      setTimeout(() => navigate("/login"), 1200);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-white">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-8 rounded-lg shadow-lg w-96 flex flex-col gap-4"
      >
        <div className="flex flex-col items-center mb-2">
          <span className="text-3xl mb-2">📝</span>
          <h2 className="text-2xl font-bold">Create Account</h2>
        </div>
        {error && (
          <div className="bg-red-700 text-white p-2 rounded text-center mb-2">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-700 text-white p-2 rounded text-center mb-2">
            {success}
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
          autoComplete="new-password"
          disabled={loading}
        />
        <input
          className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="password"
          placeholder="Confirm Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          disabled={loading}
        />
        <button
          className={`w-full bg-green-600 hover:bg-green-700 p-3 rounded font-semibold transition ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>
        <div className="flex justify-center items-center mt-2 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="ml-1 text-blue-400 hover:underline">
            Login
          </Link>
        </div>
      </form>
    </div>
  );
}