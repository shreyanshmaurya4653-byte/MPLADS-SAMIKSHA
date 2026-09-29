const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// GET /api/v1/investigations
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { status, priority, search } = req.query;
  const whereClauses = ["1=1"];
  const params = [];

  if (status && status !== 'ALL') {
    whereClauses.push("vc.status = ?");
    params.push(status);
  }
  if (priority && priority !== 'ALL') {
    whereClauses.push("vc.priority = ?");
    params.push(priority);
  }
  if (search && search.trim()) {
    whereClauses.push("(vc.case_number LIKE ? OR vc.work_id LIKE ? OR w.title LIKE ? OR vc.assigned_officer LIKE ?)");
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  const whereSql = whereClauses.join(" AND ");

  try {
    const rows = db.prepare(`
      SELECT 
        vc.case_id,
        vc.case_number,
        vc.work_id,
        vc.alert_id,
        vc.assigned_officer,
        vc.assigned_to,
        vc.status,
        vc.priority,
        vc.findings,
        vc.officer_remarks,
        vc.action_taken,
        vc.evidence_checklist,
        vc.verified_at,
        vc.created_at,
        w.title as work_title,
        w.category,
        w.sanctioned_amount,
        w.expenditure,
        w.physical_progress,
        w.implementing_agency,
        r.risk_score,
        r.risk_level
      FROM verification_cases vc
      LEFT JOIN works w ON vc.work_id = w.id
      LEFT JOIN risk_assessments r ON vc.work_id = r.work_id
      WHERE ${whereSql}
      ORDER BY 
        CASE vc.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END,
        CASE vc.status WHEN 'OPEN' THEN 1 WHEN 'IN_REVIEW' THEN 2 WHEN 'FIELD_INSPECTION' THEN 3 ELSE 4 END,
        vc.case_id DESC
    `).all(...params);

    const formatted = rows.map(r => {
      let checklist = [];
      try {
        checklist = JSON.parse(r.evidence_checklist || '[]');
      } catch (e) {
        checklist = [];
      }
      return {
        ...r,
        evidence_checklist: checklist
      };
    });

    return res.json(formatted);
  } catch (err) {
    console.error('Error fetching investigations:', err);
    return res.status(500).json({ detail: "Failed to fetch investigation cases" });
  }
});

// GET /api/v1/investigations/:id
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const { id } = req.params;

  try {
    const r = db.prepare(`
      SELECT 
        vc.*,
        w.title as work_title,
        w.category,
        w.sanctioned_amount,
        w.expenditure,
        w.physical_progress,
        w.status as work_status,
        w.implementing_agency,
        w.district_id,
        w.state_id,
        r.risk_score,
        r.risk_level
      FROM verification_cases vc
      LEFT JOIN works w ON vc.work_id = w.id
      LEFT JOIN risk_assessments r ON vc.work_id = r.work_id
      WHERE vc.case_id = ? OR vc.case_number = ?
    `).get(id, id);

    if (!r) {
      return res.status(404).json({ detail: "Investigation case not found" });
    }

    let checklist = [];
    try { checklist = JSON.parse(r.evidence_checklist || '[]'); } catch (e) {}

    // Attach documents for this work
    const docs = db.prepare("SELECT * FROM documents WHERE work_id = ?").all(r.work_id);

    return res.json({
      ...r,
      evidence_checklist: checklist,
      documents: docs
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /api/v1/investigations
router.post('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { work_id, alert_id, assigned_officer, priority, findings, officer_remarks } = req.body;

  if (!work_id) {
    return res.status(400).json({ detail: "work_id is required to open an investigation" });
  }

  const countRow = db.prepare("SELECT count(1) as cnt FROM verification_cases").get();
  const nextNum = (countRow?.cnt || 0) + 1001;
  const caseNumber = `CASE #INV-${nextNum}`;

  const defaultChecklist = JSON.stringify([
    { item: "Sanction Letter & Administrative Approval", verified: false, date: null },
    { item: "Measurement Book (MB) Entry Copy", verified: false, date: null },
    { item: "Geotagged High-Resolution Field Photos", verified: false, date: null },
    { item: "RTGS Bank Payment Transaction Vouchers", verified: false, date: null },
    { item: "Utilization Certificate (Form 12-A)", verified: false, date: null }
  ]);

  try {
    const info = db.prepare(`
      INSERT INTO verification_cases (
        case_number, work_id, alert_id, assigned_officer, assigned_to,
        status, priority, findings, officer_remarks, action_taken, evidence_checklist
      ) VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, 'Case Initiated via AI Risk Alert', ?)
    `).run(
      caseNumber,
      work_id,
      alert_id || null,
      assigned_officer || "District Inspection Director",
      req.user?.name || "Officer",
      priority || "HIGH",
      findings || "Anomaly flagged by automated risk model requiring field verification.",
      officer_remarks || "Case opened for investigative audit.",
      defaultChecklist
    );

    // Record in audit log
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
      VALUES (?, 'INVESTIGATION_CREATED', 'CASE', ?, NULL, ?, ?)
    `).run(
      req.user?.name || "Official",
      caseNumber,
      `Work: ${work_id}, Priority: ${priority || 'HIGH'}`,
      req.ip || "127.0.0.1"
    );

    return res.status(201).json({
      case_id: info.lastInsertRowid,
      case_number: caseNumber,
      message: `Investigation ${caseNumber} created successfully.`
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/v1/investigations/:id
router.put('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { status, findings, officer_remarks, action_taken, assigned_officer, evidence_checklist } = req.body;

  const existing = db.prepare("SELECT * FROM verification_cases WHERE case_id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ detail: "Case not found" });
  }

  const newStatus = status || existing.status;
  const newFindings = findings !== undefined ? findings : existing.findings;
  const newRemarks = officer_remarks !== undefined ? officer_remarks : existing.officer_remarks;
  const newAction = action_taken !== undefined ? action_taken : existing.action_taken;
  const newOfficer = assigned_officer !== undefined ? assigned_officer : existing.assigned_officer;
  const newChecklist = evidence_checklist ? (typeof evidence_checklist === 'string' ? evidence_checklist : JSON.stringify(evidence_checklist)) : existing.evidence_checklist;

  try {
    db.prepare(`
      UPDATE verification_cases 
      SET status = ?, findings = ?, officer_remarks = ?, action_taken = ?, assigned_officer = ?, evidence_checklist = ?, verified_at = datetime('now')
      WHERE case_id = ?
    `).run(newStatus, newFindings, newRemarks, newAction, newOfficer, newChecklist, id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
      VALUES (?, 'STATUS_UPDATE', 'CASE', ?, ?, ?, ?)
    `).run(
      req.user?.name || "Official",
      existing.case_number,
      `Status: ${existing.status}`,
      `Status: ${newStatus}, Action: ${newAction}`,
      req.ip || "127.0.0.1"
    );

    return res.json({
      message: `Investigation ${existing.case_number} updated successfully.`,
      status: newStatus
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
