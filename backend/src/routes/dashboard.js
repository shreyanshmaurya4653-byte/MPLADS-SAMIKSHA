const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { getDashboardKPIs, getFundUtilizationTrends } = require('../services/dashboardService');
const { getAlertsForUser } = require('../services/alertService');

// GET /api/v1/dashboard/stats
router.get('/stats', authMiddleware, (req, res) => {
  const db = getDb();
  const kpis = getDashboardKPIs(db, req.user, req.query);
  return res.json(kpis);
});

// GET /api/v1/dashboard/utilization-trends
router.get('/utilization-trends', authMiddleware, (req, res) => {
  const db = getDb();
  const trends = getFundUtilizationTrends(db, req.user, req.query);
  return res.json(trends);
});

// GET /api/v1/dashboard/recent-alerts
router.get('/recent-alerts', authMiddleware, (req, res) => {
  const db = getDb();
  const alerts = getAlertsForUser(db, req.user, req.query);
  return res.json(alerts.slice(0, 10));
});

module.exports = router;
