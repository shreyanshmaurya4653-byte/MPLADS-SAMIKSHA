const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

/**
 * Builds role-enforced SQL where clause for Finance analytics
 */
function buildFinanceWhere(req) {
  const role = req.user?.role || 'Ministry';
  const user = req.user || {};
  let { state_id, district_id, subdivision, constituency_id, mp_name, house_type } = req.query;

  // Strict RBAC jurisdictional enforcement
  if (role === 'District') {
    state_id = user.state_id || 1;
    district_id = user.district_id || 1;
  } else if (role === 'State') {
    state_id = user.state_id || 1;
    // District within this state can be optionally filtered by State officer
  } else if (role === 'MP') {
    if (user.constituency_id) constituency_id = user.constituency_id;
    if (user.name) mp_name = user.name;
    if (user.state_id) state_id = user.state_id;
    if (user.house_type && !house_type) house_type = user.house_type;
  }

  const whereClauses = ["1=1"];
  const params = [];
  const entWhere = [];
  const entParams = [];

  if (state_id && state_id !== 'All') {
    whereClauses.push("w.state_id = ?");
    params.push(Number(state_id));
    entWhere.push("state_id = ?");
    entParams.push(Number(state_id));
  }
  if (district_id && district_id !== 'All') {
    whereClauses.push("w.district_id = ?");
    params.push(Number(district_id));
    entWhere.push("district_id = ?");
    entParams.push(Number(district_id));
  }
  if (subdivision && subdivision !== 'All') {
    whereClauses.push("w.subdivision = ?");
    params.push(subdivision);
  }
  if (constituency_id && constituency_id !== 'All') {
    whereClauses.push("w.constituency_id = ?");
    params.push(Number(constituency_id));
    entWhere.push("constituency_id = ?");
    entParams.push(Number(constituency_id));
  }
  if (mp_name && mp_name !== 'All') {
    whereClauses.push("LOWER(w.mp_name) LIKE ?");
    const term = `%${mp_name.trim().toLowerCase()}%`;
    params.push(term);
    entWhere.push("LOWER(mp_name) LIKE ?");
    entParams.push(term);
  }
  if (house_type && house_type !== 'All') {
    whereClauses.push("w.house_type = ?");
    params.push(house_type);
    entWhere.push("house_type = ?");
    entParams.push(house_type);
  }

  return {
    whereSql: whereClauses.join(" AND "),
    params,
    entWhereSql: entWhere.length > 0 ? "WHERE " + entWhere.join(" AND ") : "",
    entParams,
    effectiveScope: { role, state_id, district_id, constituency_id, mp_name, house_type }
  };
}

// GET /api/v1/finance/overview
router.get('/overview', authMiddleware, (req, res) => {
  const db = getDb();
  const { whereSql, params, entWhereSql, entParams, effectiveScope } = buildFinanceWhere(req);

  try {
    const totals = db.prepare(`
      SELECT 
        COUNT(1) as total_projects,
        COALESCE(SUM(sanctioned_amount), 0) as total_sanctioned,
        COALESCE(SUM(released_amount), 0) as total_released,
        COALESCE(SUM(expenditure), 0) as total_expenditure
      FROM works w
      WHERE ${whereSql}
    `).get(...params);

    const sanctioned = totals?.total_sanctioned || 0;
    const released = (totals?.total_released && totals.total_released > 0) ? totals.total_released : sanctioned;
    const expenditure = totals?.total_expenditure || 0;
    const unspent = Math.max(0, released - expenditure);
    const utilizationRate = released > 0 ? Math.round((expenditure / released * 100.0) * 10) / 10 : 0;

    // Yearly pipeline dynamically computed from database records
    let yearlyBreakdown = [];
    try {
      const yrRows = db.prepare(`
        SELECT 
          strftime('%Y', COALESCE(start_date, 'now')) as yr,
          coalesce(sum(sanctioned_amount), 0) / 10000000.0 as sanctioned,
          coalesce(sum(released_amount), 0) / 10000000.0 as released,
          coalesce(sum(expenditure), 0) / 10000000.0 as spent
        FROM works w
        WHERE ${whereSql} AND sanctioned_amount > 0
        GROUP BY yr
        ORDER BY yr ASC
      `).all(...params);

      if (yrRows && yrRows.length > 0) {
        yearlyBreakdown = yrRows.map(r => ({
          year: r.yr,
          allocated: r.released,
          sanctioned: r.sanctioned,
          released: r.released,
          spent: r.spent,
          utilization: r.sanctioned > 0 ? Math.round((r.spent / r.sanctioned) * 1000) / 10 : 0
        }));
      }
    } catch (e) {
      yearlyBreakdown = [];
    }

    // Sector cost comparison
    const categoryAverages = db.prepare(`
      SELECT 
        category,
        count(1) as count,
        round(avg(sanctioned_amount), 2) as avg_sanctioned,
        round(avg(expenditure), 2) as avg_expenditure
      FROM works w
      WHERE ${whereSql} AND category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY count DESC
      LIMIT 6
    `).all(...params);

    // Compute entitlement / allocated limit for this specific jurisdiction
    let totalEntitlement = 0;
    try {
      const entSql = `SELECT COALESCE(SUM(allocated_amount), 0) as total_ent FROM constituencies ${entWhereSql}`;
      const r = db.prepare(entSql).get(...entParams);
      if (r && r.total_ent > 0) totalEntitlement = Number(r.total_ent);
    } catch (e) {}

    // Special case for MP role: standard annual entitlement is ₹5 Cr
    if (effectiveScope.role === 'MP' && totalEntitlement === 0) {
      totalEntitlement = 50000000;
    }

    const totalProjects = totals?.total_projects || 0;
    const totalAllocated = totalEntitlement > 0 ? totalEntitlement : (totalProjects > 0 ? (released * 1.12) : 0);

    // Mismatched payment milestones
    let flaggedPayments = [];
    try {
      flaggedPayments = db.prepare(`
        SELECT 
          p.*,
          w.title as work_title,
          w.physical_progress as current_physical_progress,
          w.sanctioned_amount
        FROM payments p
        JOIN works w ON p.work_id = w.id
        WHERE (${whereSql}) AND (p.is_flagged = 1 OR (p.amount > (w.sanctioned_amount * 0.40) AND w.physical_progress < 30))
        ORDER BY p.payment_id DESC
        LIMIT 20
      `).all(...params);

      if (!flaggedPayments || flaggedPayments.length === 0) {
        flaggedPayments = db.prepare(`
          SELECT 
            e.expenditure_id as payment_id,
            e.work_id,
            e.amount,
            e.expenditure_date as payment_date,
            e.vendor_name as payee_name,
            e.payment_status as status,
            w.title as work_title,
            w.physical_progress as current_physical_progress,
            w.sanctioned_amount
          FROM expenditures e
          JOIN works w ON e.work_id = w.id
          WHERE (${whereSql}) AND w.sanctioned_amount > 0 AND e.amount > (w.sanctioned_amount * 0.40) AND w.physical_progress < 30
          LIMIT 20
        `).all(...params);
      }
    } catch (e) {
      flaggedPayments = [];
    }

    return res.json({
      summary: {
        total_projects: totalProjects,
        total_allocated: totalAllocated,
        total_sanctioned: sanctioned,
        total_released: released,
        total_spent: expenditure,
        unspent_balance: unspent,
        utilization_rate: utilizationRate,
        scope: effectiveScope
      },
      pipeline_stages: [
        { stage: "Allocated", amount: totalAllocated, percentage: totalAllocated > 0 ? 100 : 0 },
        { stage: "Sanctioned", amount: sanctioned, percentage: totalAllocated > 0 ? Math.round((sanctioned / totalAllocated) * 100) : 0 },
        { stage: "Released", amount: released, percentage: totalAllocated > 0 ? Math.round((released / totalAllocated) * 100) : 0 },
        { stage: "Expenditure", amount: expenditure, percentage: utilizationRate }
      ],
      yearly_trends: yearlyBreakdown,
      category_baselines: categoryAverages,
      flagged_milestone_payments: flaggedPayments
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/v1/finance/payments
router.get('/payments', authMiddleware, (req, res) => {
  const db = getDb();
  const { whereSql, params } = buildFinanceWhere(req);
  const { flaggedOnly, limit } = req.query;

  const extraClauses = [whereSql];
  const queryParams = [...params];

  if (flaggedOnly === 'true') {
    extraClauses.push("(e.amount > (w.sanctioned_amount * 0.40) AND (w.physical_progress < 30 OR w.status = 'DELAYED'))");
  }

  const finalWhere = extraClauses.join(" AND ");
  const queryLimit = limit ? Number(limit) : 100;

  try {
    const rows = db.prepare(`
      SELECT 
        e.expenditure_id as payment_id,
        e.work_id,
        e.amount,
        e.expenditure_date as payment_date,
        e.vendor_name as payee_name,
        e.payment_status as status,
        w.title as work_title,
        w.category,
        w.sanctioned_amount,
        w.physical_progress,
        w.state_id,
        w.district_id,
        w.mp_name,
        w.house_type
      FROM expenditures e
      JOIN works w ON e.work_id = w.id
      WHERE ${finalWhere}
      ORDER BY e.expenditure_id DESC
      LIMIT ?
    `).all(...queryParams, queryLimit);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
