// server/controllers/authController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "debugsyncsecret";

async function signup(req, res) {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: "Username, email and password required." });
  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ error: "Email or username already registered." });
    const user = new User({ username, email, password });
    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, email: user.email, username: user.username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required." });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials." });
    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ error: "Invalid credentials." });
    const token = jwt.sign({ id: user._id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, email: user.email, username: user.username });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { signup, login };
