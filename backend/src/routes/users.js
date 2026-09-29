const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');

// GET /api/v1/users
router.get('', (req, res) => {
  const db = getDb();
  try {
    const users = db.prepare("SELECT id, name, email, role, state_id, district_id, constituency_id, avatar FROM users WHERE is_active = 1").all();
    return res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      state_id: u.state_id,
      district_id: u.district_id,
      constituency_id: u.constituency_id,
      avatar: u.avatar || "US"
    })));
  } catch (e) {
    return res.status(500).json({ detail: e.message });
  }
});

module.exports = router;
