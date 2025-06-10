// server/controllers/aiController.js
const { getGeminiResponse } = require("../services/geminiService");

async function aiChat(req, res) {
  const { message } = req.body;
  try {
    const response = await getGeminiResponse(message);
    res.json({ response });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { aiChat };
