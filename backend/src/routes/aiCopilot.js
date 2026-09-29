const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { handleCopilotQuery } = require('../services/aiCopilotService');

// POST /api/v1/ai-copilot/query
router.post('/query', authMiddleware, (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  const db = getDb();

  try {
    const result = handleCopilotQuery(db, prompt, req.user);

    res.json({
      query: prompt,
      answer: result.answer,
      data_context: result.dataContext || null,
      suggested_questions: result.suggestedQuestions || [],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in AI copilot query:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
