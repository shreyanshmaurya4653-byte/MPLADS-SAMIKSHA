const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// GET /api/v1/evidence/work/:work_id
router.get('/work/:work_id', authMiddleware, (req, res) => {
  const db = getDb();
  const { work_id } = req.params;

  try {
    const docs = db.prepare(`
      SELECT 
        d.document_id,
        d.work_id,
        d.project_id,
        d.document_type,
        d.document_title,
        d.file_url,
        d.file_size_bytes,
        d.mime_type,
        d.verification_status,
        d.image_hash,
        d.gps_coords,
        d.ocr_summary,
        d.uploaded_by,
        d.uploaded_at
      FROM documents d
      WHERE d.work_id = ?
      ORDER BY d.document_id ASC
    `).all(work_id);

    return res.json(docs);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/v1/evidence/all
router.get('/all', authMiddleware, (req, res) => {
  const db = getDb();
  const { type, status } = req.query;
  const whereClauses = ["1=1"];
  const params = [];

  if (type && type !== 'ALL') {
    whereClauses.push("d.document_type = ?");
    params.push(type);
  }
  if (status && status !== 'ALL') {
    whereClauses.push("d.verification_status = ?");
    params.push(status);
  }

  const whereSql = whereClauses.join(" AND ");

  try {
    const docs = db.prepare(`
      SELECT 
        d.*,
        w.title as work_title,
        w.category,
        w.implementing_agency
      FROM documents d
      LEFT JOIN works w ON d.work_id = w.id
      WHERE ${whereSql}
      ORDER BY d.document_id DESC
      LIMIT 100
    `).all(...params);

    return res.json(docs);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /api/v1/evidence/verify/:id
router.post('/verify/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { verification_status, remarks } = req.body;

  try {
    db.prepare(`
      UPDATE documents 
      SET verification_status = ?, ocr_summary = coalesce(?, ocr_summary)
      WHERE document_id = ?
    `).run(verification_status || 'VERIFIED', remarks || null, id);

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
      VALUES (?, 'EVIDENCE_VERIFIED', 'DOCUMENT', ?, NULL, ?, ?)
    `).run(
      req.user?.name || "Official",
      String(id),
      `Status: ${verification_status}`,
      req.ip || "127.0.0.1"
    );

    return res.json({ message: "Evidence verification status updated successfully." });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
