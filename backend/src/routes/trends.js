const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { getFundUtilizationTrends } = require('../services/dashboardService');

// GET /api/v1/trends/expenditure
router.get('/expenditure', authMiddleware, (req, res) => {
  const db = getDb();
  const trends = getFundUtilizationTrends(db, req.user, req.query);
  return res.json(trends);
});

// GET /api/v1/trends/districts
router.get('/districts', (req, res) => {
  const db = getDb();
  const { state_id, house_type } = req.query;
  try {
    let sql = `
      SELECT 
        d.district_name as district,
        s.state_name as state,
        count(w.id) as works,
        coalesce(sum(CASE WHEN r.risk_level = 'High' OR r.risk_level = 'Critical' OR r.risk_score >= 50 THEN 1 ELSE 0 END), 0) as highRisk,
        coalesce(sum(CASE WHEN LOWER(w.status) LIKE '%delay%' THEN 1 ELSE 0 END), 0) as delayed,
        coalesce(sum(CASE WHEN LOWER(w.status) LIKE '%complete%' OR LOWER(w.status) LIKE '%success%' THEN 1 ELSE 0 END), 0) as completed,
        coalesce(sum(w.sanctioned_amount), 0) as sanctioned,
        coalesce(sum(w.expenditure), 0) as expenditure
      FROM works w
      JOIN districts d ON w.district_id = d.district_id
      LEFT JOIN states s ON w.state_id = s.state_id
      LEFT JOIN risk_assessments r ON w.id = r.work_id
      WHERE 1=1
    `;
    const params = [];
    if (state_id && state_id !== 'All') {
      sql += " AND w.state_id = ?";
      params.push(Number(state_id));
    }
    if (house_type && house_type !== 'All') {
      sql += " AND w.house_type = ?";
      params.push(house_type);
    }
    sql += " GROUP BY d.district_id, d.district_name ORDER BY works DESC LIMIT 25";

    const rows = db.prepare(sql).all(...params);
    return res.json(rows);
  } catch (err) {
    return res.json([]);
  }
});

// GET /api/v1/trends/states
router.get('/states', (req, res) => {
  const db = getDb();
  const { house_type } = req.query;
  try {
    let sql = `
      SELECT 
        s.state_id,
        s.state_name as state,
        s.state_code,
        count(w.id) as totalWorks,
        coalesce(sum(CASE WHEN LOWER(w.status) LIKE '%complete%' OR LOWER(w.status) LIKE '%success%' THEN 1 ELSE 0 END), 0) as completed,
        coalesce(sum(CASE WHEN LOWER(w.status) LIKE '%progress%' OR LOWER(w.status) = 'ongoing' THEN 1 ELSE 0 END), 0) as ongoing,
        coalesce(sum(CASE WHEN LOWER(w.status) LIKE '%delay%' THEN 1 ELSE 0 END), 0) as delayed,
        coalesce(sum(CASE WHEN r.risk_level = 'High' OR r.risk_level = 'Critical' OR r.risk_score >= 50 THEN 1 ELSE 0 END), 0) as highRisk,
        coalesce(sum(w.sanctioned_amount), 0) as totalFunds,
        coalesce(sum(w.expenditure), 0) as expenditure
      FROM states s
      LEFT JOIN works w ON s.state_id = w.state_id
    `;
    const params = [];
    if (house_type && house_type !== 'All') {
      sql += " AND w.house_type = ?";
      params.push(house_type);
    }
    sql += `
      LEFT JOIN risk_assessments r ON w.id = r.work_id
      GROUP BY s.state_id, s.state_name, s.state_code
      ORDER BY totalWorks DESC, s.state_name ASC
    `;

    const rows = db.prepare(sql).all(...params);
    return res.json(rows);
  } catch (err) {
    return res.json([]);
  }
});

module.exports = router;
