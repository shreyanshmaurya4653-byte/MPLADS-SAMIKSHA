const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { getRiskOverview, getWorkRiskDossier } = require('../services/riskService');
const { getProblemStatementAnomalies } = require('../services/anomalyService');
const {
  getAllDuplicatePairs,
  getWorkSimilarities,
  computeDetailedSimilarity
} = require('../services/similarityService');

// GET /api/v1/risks/overview
router.get('/overview', authMiddleware, (req, res) => {
  const db = getDb();
  const overview = getRiskOverview(db, req.user, req.query);
  return res.json(overview);
});

// GET /api/v1/risks/anomalies/breakdown
router.get('/anomalies/breakdown', authMiddleware, (req, res) => {
  const db = getDb();
  const anomalies = getProblemStatementAnomalies(db, req.user, req.query);
  return res.json(anomalies);
});

// GET /api/v1/risks/similarity/all-pairs
router.get('/similarity/all-pairs', (req, res) => {
  const db = getDb();
  const minThreshold = parseFloat(req.query.min_threshold || 40.0);
  const pairs = getAllDuplicatePairs(db, minThreshold);
  return res.json(pairs);
});

// GET /api/v1/risks/similarity/work/:work_id
router.get('/similarity/work/:work_id', (req, res) => {
  const db = getDb();
  const { work_id } = req.params;
  const similarities = getWorkSimilarities(db, work_id);
  return res.json(similarities);
});

// GET /api/v1/risks/similarity/compare
router.get('/similarity/compare', (req, res) => {
  const db = getDb();
  const { work_a, work_b } = req.query;

  if (!work_a || !work_b) {
    return res.status(400).json({ detail: "Both work_a and work_b parameters are required." });
  }

  const w1 = db.prepare("SELECT * FROM works WHERE id = ?").get(work_a);
  const w2 = db.prepare("SELECT * FROM works WHERE id = ?").get(work_b);

  if (!w1 || !w2) {
    return res.status(404).json({ detail: "One or both project IDs could not be found." });
  }

  const d1 = {
    id: w1.id, title: w1.title, description: w1.description,
    category: w1.category, implementing_agency: w1.implementing_agency,
    sanctioned_amount: parseFloat(w1.sanctioned_amount || 0),
    estimated_cost: parseFloat(w1.estimated_cost || 0),
    expenditure: parseFloat(w1.expenditure || 0), status: w1.status,
    constituency_id: w1.constituency_id, district_id: w1.district_id
  };
  const d2 = {
    id: w2.id, title: w2.title, description: w2.description,
    category: w2.category, implementing_agency: w2.implementing_agency,
    sanctioned_amount: parseFloat(w2.sanctioned_amount || 0),
    estimated_cost: parseFloat(w2.estimated_cost || 0),
    expenditure: parseFloat(w2.expenditure || 0), status: w2.status,
    constituency_id: w2.constituency_id, district_id: w2.district_id
  };

  const audit = computeDetailedSimilarity(d1, d2);
  return res.json({
    project_a: d1,
    project_b: d2,
    similarity_audit: audit
  });
});

// GET /api/v1/risks/work/:work_id
router.get('/work/:work_id', (req, res) => {
  const db = getDb();
  const { work_id } = req.params;
  const dossier = getWorkRiskDossier(db, work_id);
  if (!dossier || !dossier.work_id) {
    return res.status(404).json({ detail: "Work risk assessment not found" });
  }
  return res.json(dossier);
});

// GET /api/v1/risks/contractors/performance
router.get('/contractors/performance', (req, res) => {
  const db = getDb();
  const filters = req.query || {};
  const whereClauses = ["1=1"];
  const params = [];

  if (filters.subdivision && filters.subdivision !== "All") {
    whereClauses.push("w.subdivision = ?");
    params.push(filters.subdivision);
  }
  if (filters.district_id && filters.district_id !== "All") {
    whereClauses.push("w.district_id = ?");
    params.push(Number(filters.district_id));
  }
  if (filters.state_id && filters.state_id !== "All") {
    whereClauses.push("w.state_id = ?");
    params.push(Number(filters.state_id));
  }

  const whereSql = whereClauses.join(" AND ");
  try {
    const rows = db.prepare(`
      SELECT 
        cp.performance_id,
        cp.contractor_id,
        c.contractor_name,
        c.contractor_type,
        ('REG-VND-' || c.contractor_id) as registration_number,
        ('AABCP' || (1000 + c.contractor_id) || 'K') as pan_number,
        c.status as contractor_status,
        cp.project_id,
        coalesce(p.project_name, w.title, 'Community Infrastructure Development') as project_name,
        cp.completion_status,
        cp.delay_days,
        cp.quality_score,
        cp.performance_score,
        cp.cost_variance_percentage,
        cp.cancelled,
        cp.compliance_issues,
        cp.remarks,
        cp.evaluation_date
      FROM contractor_performance cp
      JOIN contractors c ON cp.contractor_id = c.contractor_id
      LEFT JOIN projects p ON cp.project_id = p.project_id
      LEFT JOIN works w ON cp.project_id = w.id
      WHERE ${whereSql}
      ORDER BY cp.performance_score ASC
    `).all(...params);
    return res.json(rows);
  } catch (e) {
    return res.json([]);
  }
});

// GET /api/v1/risks/compliance/results
router.get('/compliance/results', (req, res) => {
  const db = getDb();
  const filters = req.query || {};
  const whereClauses = ["1=1"];
  const params = [];

  if (filters.subdivision && filters.subdivision !== "All") {
    whereClauses.push("w.subdivision = ?");
    params.push(filters.subdivision);
  }
  if (filters.district_id && filters.district_id !== "All") {
    whereClauses.push("w.district_id = ?");
    params.push(Number(filters.district_id));
  }
  if (filters.state_id && filters.state_id !== "All") {
    whereClauses.push("w.state_id = ?");
    params.push(Number(filters.state_id));
  }

  const whereSql = whereClauses.join(" AND ");
  try {
    const rows = db.prepare(`
      SELECT 
        cr.compliance_id,
        cr.project_id,
        coalesce(p.project_name, w.title, 'Infrastructure Scheme Project') as project_name,
        coalesce(p.project_code, w.id) as project_code,
        cr.rule_name,
        cr.rule_category,
        cr.status,
        cr.deviation_notes,
        cr.severity,
        cr.checked_at
      FROM compliance_results cr
      LEFT JOIN projects p ON cr.project_id = p.project_id
      LEFT JOIN works w ON cr.project_id = w.id
      WHERE ${whereSql}
      ORDER BY CASE cr.status WHEN 'FAIL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END
    `).all(...params);
    return res.json(rows);
  } catch (e) {
    return res.json([]);
  }
});

// GET /api/v1/risks/models/runs
router.get('/models/runs', (req, res) => {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT 
        run_id,
        model_name,
        model_type,
        model_version,
        parameters,
        metrics,
        run_status,
        started_at,
        finished_at
      FROM model_runs
      ORDER BY run_id DESC
    `).all();

    const results = rows.map(r => {
      let params = r.parameters;
      let metrics = r.metrics;
      if (typeof params === 'string') {
        try { params = JSON.parse(params); } catch (e) {}
      }
      if (typeof metrics === 'string') {
        try { metrics = JSON.parse(metrics); } catch (e) {}
      }
      return {
        ...r,
        parameters: params,
        metrics
      };
    });
    return res.json(results);
  } catch (e) {
    return res.json([]);
  }
});

// GET /api/v1/risks/database/tables-summary
router.get('/database/tables-summary', (req, res) => {
  const db = getDb();
  const tablesOrder = [
    ["roles", "Master user access roles with hierarchical permissions"],
    ["permissions", "Granular functional permissions and action capabilities"],
    ["role_permissions", "Mapping matrix of roles to permissions"],
    ["states", "State-level administrative jurisdictions"],
    ["districts", "District administrative collectorate units"],
    ["constituencies", "Parliamentary constituencies and MP tenure details"],
    ["departments", "Nodal departments and infrastructure wings"],
    ["implementing_agencies", "Executing agencies, ULBs, and engineering departments"],
    ["users", "System operators, MPs, collectors, nodal officers, admins"],
    ["projects", "Complete master project catalog with financial and physical progress"],
    ["works", "Backward-compatible project view for existing services"],
    ["sanctions", "Administrative, financial, and technical sanctions"],
    ["contractors", "Registered vendors, Class A contractors, and EPC firms"],
    ["contractor_performance", "Contractor ratings, delay records, quality, and variance"],
    ["expenditures", "Disbursed financial outlays and billing vouchers"],
    ["payments", "Direct RTGS/NEFT payment transactions and statuses"],
    ["progress_updates", "Field engineering inspection logs and physical progress"],
    ["assets", "Geotagged physical community assets and maintenance logs"],
    ["documents", "DPRs, sanction letters, contractor bills, audit reports"],
    ["data_sources", "External integrations (MoSPI Core, PFMS, GeM, Bhuvan ISRO)"],
    ["data_ingestion_logs", "Automated sync batches and ETL records"],
    ["anomalies", "Detected irregularities across 4 problem statement pillars"],
    ["duplicate_matches", "TF-IDF and semantic similarity duplicate work pairs"],
    ["risk_results", "Multi-factor ML risk evaluations and sub-scores"],
    ["risk_assessments", "Constituency risk dossiers and recommendations"],
    ["compliance_results", "Statutory guidelines checklist and non-compliance flags"],
    ["model_runs", "Machine learning execution registry, hyperparameters, metrics"],
    ["alerts", "Real-time automated warnings and escalation triggers"],
    ["verification_cases", "Investigation cases assigned to field vigilance officers"],
    ["audit_logs", "Immutable tamper-evident user activity and change ledger"]
  ];

  const summary = [];
  for (const [tbl, desc] of tablesOrder) {
    try {
      const row = db.prepare(`SELECT count(1) as cnt FROM ${tbl}`).get();
      summary.push({
        table_name: tbl,
        description: desc,
        record_count: row?.cnt || 0,
        status: "ACTIVE"
      });
    } catch (e) {
      // Table might not exist yet
    }
  }

  return res.json({
    total_tables: summary.length,
    tables: summary
  });
});

module.exports = router;
