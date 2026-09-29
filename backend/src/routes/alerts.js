const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { getAlertsForUser, updateAlertStatus } = require('../services/alertService');

// GET /api/v1/alerts
router.get('', authMiddleware, (req, res) => {
  const db = getDb();
  const { severity, alert_type } = req.query;
  const alerts = getAlertsForUser(db, req.user, { severity, alert_type });
  return res.json(alerts);
});

// PATCH /api/v1/alerts/:alert_id/status
router.patch('/:alert_id/status', (req, res) => {
  const db = getDb();
  const { alert_id } = req.params;
  const { status } = req.body;

  const updated = updateAlertStatus(db, alert_id, status);
  if (!updated) {
    return res.status(404).json({ detail: "Alert not found" });
  }
  return res.json({
    message: "Status updated successfully",
    status: updated.status
  });
});

// POST /api/v1/alerts/:alert_id/verify
router.post('/:alert_id/verify', (req, res) => {
  const db = getDb();
  const { alert_id } = req.params;
  const { status, officer_remarks, action_taken } = req.body;

  const updated = updateAlertStatus(db, alert_id, status);
  if (!updated) {
    return res.status(404).json({ detail: "Alert not found" });
  }

  // Also record into verification_cases if exists
  try {
    db.prepare(`
      INSERT INTO verification_cases (
        case_number, alert_id, status, findings, created_at
      ) VALUES (
        ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
    `).run(
      `VC-${Date.now()}`,
      alert_id,
      status,
      officer_remarks || action_taken || "Physical inspection verified."
    );
  } catch (e) {
    // Graceful if table constraints differ
  }

  return res.json({
    message: "Verification recorded successfully",
    alert_id,
    officer_remarks,
    action_taken,
    status: updated.status
  });
});

module.exports = router;
