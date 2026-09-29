const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const geoCache = new Map();
function getCached(key, ttl = 300000) {
  const item = geoCache.get(key);
  if (item && Date.now() - item.ts < ttl) return item.val;
  return null;
}
function setCached(key, val) {
  geoCache.set(key, { val, ts: Date.now() });
}

// GET /api/v1/jurisdiction/geo-master (Public endpoint for demo state/district/constituency selector)
router.get('/geo-master', (req, res) => {
  const cached = getCached('geo-master', 600000);
  if (cached) return res.json(cached);

  const db = getDb();
  try {
    const states = db.prepare("SELECT state_id, state_name, state_code FROM states ORDER BY state_name ASC").all();
    const districts = db.prepare("SELECT district_id, state_id, district_name, district_code FROM districts ORDER BY district_name ASC").all();
    const constituencies = db.prepare(`
      SELECT c.constituency_id, c.state_id, c.district_id, c.constituency_name, c.mp_name, c.mp_party, c.house_type, d.district_name
      FROM constituencies c
      LEFT JOIN districts d ON c.district_id = d.district_id
      ORDER BY c.constituency_name ASC
    `).all();
    const result = { states, districts, constituencies };
    setCached('geo-master', result);
    return res.json(result);
  } catch (err) {
    console.error('Error fetching geo master data:', err);
    return res.status(500).json({ detail: "Failed to fetch geography master data" });
  }
});

router.get('/hierarchy', authMiddleware, (req, res) => {
  const role = req.user?.role || "Ministry";
  const userStateId = req.user?.state_id || 1;
  const userDistId = req.user?.district_id || 1;
  const userConstId = req.user?.constituency_id || 1;

  const cacheKey = `hierarchy:${role}:${userStateId}:${userDistId}:${userConstId}`;
  const cached = getCached(cacheKey, 300000);
  if (cached) return res.json(cached);

  const db = getDb();

  // 1. Fetch states
  let states;
  if (role === "Ministry" || role === "Admin") {
    states = db.prepare("SELECT state_id, state_name, state_code FROM states ORDER BY state_name ASC").all();
  } else {
    states = db.prepare("SELECT state_id, state_name, state_code FROM states WHERE state_id = ?").all(userStateId);
  }

  // 2. Fetch districts
  let districts;
  if (role === "Ministry" || role === "Admin") {
    districts = db.prepare("SELECT district_id, state_id, district_name, district_code FROM districts ORDER BY district_name ASC").all();
  } else if (role === "State") {
    districts = db.prepare("SELECT district_id, state_id, district_name, district_code FROM districts WHERE state_id = ? ORDER BY district_name ASC").all(userStateId);
  } else {
    // District or MP
    districts = db.prepare("SELECT district_id, state_id, district_name, district_code FROM districts WHERE district_id = ?").all(userDistId);
  }

  // 3. Fetch subdivisions
  let subdivisions;
  if (role === "Ministry" || role === "Admin") {
    subdivisions = db.prepare("SELECT subdivision_id, district_id, subdivision_name, subdivision_code FROM subdivisions ORDER BY district_id ASC, subdivision_name ASC").all();
  } else if (role === "State") {
    subdivisions = db.prepare(`
      SELECT s.subdivision_id, s.district_id, s.subdivision_name, s.subdivision_code 
      FROM subdivisions s
      JOIN districts d ON s.district_id = d.district_id
      WHERE d.state_id = ?
      ORDER BY s.district_id ASC, s.subdivision_name ASC
    `).all(userStateId);
  } else {
    // District or MP
    subdivisions = db.prepare("SELECT subdivision_id, district_id, subdivision_name, subdivision_code FROM subdivisions WHERE district_id = ? ORDER BY subdivision_name ASC").all(userDistId);
  }

  // 4. Fetch constituencies with MP details
  let constSql = `
    SELECT c.constituency_id, c.state_id, c.district_id, c.constituency_name, 
           c.constituency_number, c.mp_name, c.mp_party, c.house_type,
           COALESCE(c.allocated_amount, 0) as allocated_amount,
           d.district_name, s.state_name
    FROM constituencies c
    LEFT JOIN districts d ON c.district_id = d.district_id
    LEFT JOIN states s ON c.state_id = s.state_id
  `;
  let constituencies;
  if (role === "Ministry" || role === "Admin") {
    constSql += " ORDER BY c.constituency_name ASC";
    constituencies = db.prepare(constSql).all();
  } else if (role === "State") {
    constSql += " WHERE c.state_id = ? ORDER BY c.constituency_name ASC";
    constituencies = db.prepare(constSql).all(userStateId);
  } else if (role === "District") {
    constSql += " WHERE c.district_id = ? ORDER BY c.constituency_name ASC";
    constituencies = db.prepare(constSql).all(userDistId);
  } else {
    // MP
    constSql += " WHERE c.constituency_id = ? ORDER BY c.constituency_name ASC";
    constituencies = db.prepare(constSql).all(userConstId);
  }

  // 5. Extract unique MP list (Accommodates multiple MPs in district, both Lok Sabha & Rajya Sabha)
  const seenMps = new Set();
  const mps = [];
  for (const c of constituencies) {
    const mp = c.mp_name;
    if (mp && !seenMps.has(mp.toLowerCase().trim())) {
      seenMps.add(mp.toLowerCase().trim());
      mps.push({
        mp_name: mp,
        mp_party: c.mp_party || "Independent",
        house_type: c.house_type || "Lok Sabha",
        allocated_amount: Number(c.allocated_amount || 0),
        constituency_id: c.constituency_id,
        constituency_name: c.constituency_name,
        district_id: c.district_id,
        district_name: c.district_name,
        state_id: c.state_id,
        state_name: c.state_name
      });
    }
  }

  // Query additional MPs with works in this district or state (includes Rajya Sabha MPs who recommend works here)
  let worksMpSql = `
    SELECT DISTINCT w.mp_name, w.house_type, w.district_id, w.state_id, d.district_name, s.state_name
    FROM works w
    LEFT JOIN districts d ON w.district_id = d.district_id
    LEFT JOIN states s ON w.state_id = s.state_id
    WHERE w.mp_name IS NOT NULL AND TRIM(w.mp_name) != ''
  `;
  const worksMpParams = [];
  if (role === "District") {
    worksMpSql += " AND w.district_id = ?";
    worksMpParams.push(userDistId);
  } else if (role === "State") {
    worksMpSql += " AND w.state_id = ?";
    worksMpParams.push(userStateId);
  } else if (role === "MP") {
    worksMpSql += " AND (w.constituency_id = ? OR w.district_id = ?)";
    worksMpParams.push(userConstId || 1, userDistId || 1);
  }
  worksMpSql += " ORDER BY w.mp_name ASC";

  const worksMps = db.prepare(worksMpSql).all(...worksMpParams);
  for (const wm of worksMps) {
    const key = wm.mp_name.toLowerCase().trim();
    if (!seenMps.has(key)) {
      seenMps.add(key);
      mps.push({
        mp_name: wm.mp_name,
        mp_party: wm.house_type === "Rajya Sabha" ? "Rajya Sabha (State Council)" : "Lok Sabha Representative",
        house_type: wm.house_type || "Rajya Sabha",
        constituency_id: null,
        constituency_name: wm.house_type === "Rajya Sabha" ? "Rajya Sabha (State Nominated/Elected)" : (wm.district_name || "District Scope"),
        district_id: wm.district_id,
        district_name: wm.district_name,
        state_id: wm.state_id,
        state_name: wm.state_name
      });
    }
  }

  const result = {
    user_role: role,
    user_scope: {
      state_id: userStateId,
      district_id: userDistId,
      constituency_id: userConstId
    },
    states,
    districts,
    subdivisions,
    constituencies,
    mps
  };
  setCached(cacheKey, result);
  return res.json(result);
});

// GET /api/v1/jurisdiction/parliament
router.get('/parliament', authMiddleware, (req, res) => {
  const db = getDb();
  const { house_type, state_id, search } = req.query;
  const user = req.user || {};
  let effectiveStateId = state_id;
  if (user.role === 'State' && user.state_id) {
    effectiveStateId = user.state_id;
  }

  try {
    const stateFilterWorks = (effectiveStateId && effectiveStateId !== 'All') ? ` AND state_id = ${Number(effectiveStateId)}` : '';
    const stateFilterEnt = (effectiveStateId && effectiveStateId !== 'All') ? ` AND state_id = ${Number(effectiveStateId)}` : '';

    // 1. Parliamentary summary metrics directly from works table
    const lsWorks = db.prepare(`
      SELECT 
        COUNT(id) as total_works,
        COALESCE(SUM(sanctioned_amount), 0) as total_sanctioned,
        COALESCE(SUM(expenditure), 0) as total_expenditure
      FROM works
      WHERE house_type = 'Lok Sabha'${stateFilterWorks}
    `).get() || {};

    const rsWorks = db.prepare(`
      SELECT 
        COUNT(id) as total_works,
        COALESCE(SUM(sanctioned_amount), 0) as total_sanctioned,
        COALESCE(SUM(expenditure), 0) as total_expenditure
      FROM works
      WHERE house_type = 'Rajya Sabha'${stateFilterWorks}
    `).get() || {};

    const lsEnt = db.prepare(`
      SELECT 
        COUNT(DISTINCT constituency_id) as active_mps,
        COALESCE(SUM(allocated_amount), 0) as total_allocated
      FROM constituencies
      WHERE house_type = 'Lok Sabha'${stateFilterEnt}
    `).get() || {};

    const rsEnt = db.prepare(`
      SELECT 
        COUNT(DISTINCT constituency_id) as active_mps,
        COALESCE(SUM(allocated_amount), 0) as total_allocated
      FROM constituencies
      WHERE house_type = 'Rajya Sabha'${stateFilterEnt}
    `).get() || {};

    // 2. Query Parliament Members directory with works count, allocated limit, and financial aggregations
    let sql = `
      WITH work_stats AS (
        SELECT 
          constituency_id,
          COUNT(id) as works_count,
          SUM(sanctioned_amount) as sanctioned_amount,
          SUM(expenditure) as expenditure_amount
        FROM works
        GROUP BY constituency_id
      )
      SELECT 
        c.constituency_id, c.state_id, c.district_id, c.constituency_name,
        c.constituency_number, c.mp_name, c.mp_party, c.house_type,
        COALESCE(c.allocated_amount, 0) as allocated_amount,
        s.state_name, d.district_name,
        COALESCE(ws.works_count, 0) as works_count,
        COALESCE(ws.sanctioned_amount, 0) as sanctioned_amount,
        COALESCE(ws.expenditure_amount, 0) as expenditure_amount,
        25.0 as avg_risk_score
      FROM constituencies c
      LEFT JOIN states s ON c.state_id = s.state_id
      LEFT JOIN districts d ON c.district_id = d.district_id
      LEFT JOIN work_stats ws ON c.constituency_id = ws.constituency_id
      WHERE 1=1
    `;
    const params = [];

    if (house_type && house_type !== 'All') {
      sql += " AND c.house_type = ?";
      params.push(house_type);
    }

    if (effectiveStateId && effectiveStateId !== 'All') {
      sql += " AND c.state_id = ?";
      params.push(Number(effectiveStateId));
    }

    if (user.role === 'MP') {
      sql += " AND (c.constituency_id = ? OR LOWER(c.mp_name) LIKE ?)";
      params.push(user.constituency_id || 1, `%${(user.name || '').trim().toLowerCase()}%`);
    } else if (search && search.trim()) {
      sql += " AND (LOWER(c.mp_name) LIKE ? OR LOWER(c.constituency_name) LIKE ? OR LOWER(c.mp_party) LIKE ?)";
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term, term);
    }

    sql += " ORDER BY c.house_type ASC, s.state_name ASC, c.constituency_name ASC";
    const members = db.prepare(sql).all(...params);

    const lsSanc = parseFloat(lsWorks.total_sanctioned || 0);
    const lsExp = parseFloat(lsWorks.total_expenditure || 0);
    const rsSanc = parseFloat(rsWorks.total_sanctioned || 0);
    const rsExp = parseFloat(rsWorks.total_expenditure || 0);

    const lsAlloc = parseFloat(lsEnt.total_allocated || 0);
    const rsAlloc = parseFloat(rsEnt.total_allocated || 0);

    return res.json({
      summary: {
        total_allocated: lsAlloc + rsAlloc,
        lok_sabha: {
          total_seats: 543,
          active_mps: lsEnt.active_mps || 543,
          allocated_amount: lsAlloc,
          works_count: lsWorks.total_works || 0,
          total_sanctioned: lsSanc,
          total_expenditure: lsExp,
          utilization_rate: lsSanc > 0 ? Math.round((lsExp / lsSanc) * 100) : 0
        },
        rajya_sabha: {
          total_seats: 245,
          active_mps: rsEnt.active_mps || 232,
          allocated_amount: rsAlloc,
          works_count: rsWorks.total_works || 0,
          total_sanctioned: rsSanc,
          total_expenditure: rsExp,
          utilization_rate: rsSanc > 0 ? Math.round((rsExp / rsSanc) * 100) : 0
        }
      },
      members
    });
  } catch (err) {
    console.error('Error fetching parliament data:', err);
    return res.status(500).json({ detail: "Failed to fetch parliament metrics" });
  }
});

module.exports = router;
