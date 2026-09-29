const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { getWorksForUser, getWorkById, createNewWork, batchUploadWorks } = require('../services/workService');
const { getWorkRiskDossier } = require('../services/riskService');
const { getWorkSimilarities } = require('../services/similarityService');
const { resolveProjectCoordinates, updateWorkLocation } = require('../services/geoResolutionService');

// GET /api/v1/works
router.get('', authMiddleware, (req, res) => {
  const db = getDb();
  const { status, category, search, state_id, district_id, subdivision, constituency_id, mp_name, house_type, limit, offset, risk_level, min_risk_score, sort_by } = req.query;

  try {
    const works = getWorksForUser(db, req.user, {
      status,
      category,
      search,
      state_id,
      district_id,
      subdivision,
      constituency_id,
      mp_name,
      house_type,
      risk_level,
      min_risk_score,
      sort_by,
      limit,
      offset
    });

    return res.json(works);
  } catch (err) {
    console.error('Error fetching works:', err);
    return res.status(500).json({ detail: err.message || "Failed to fetch works" });
  }
});

// GET /api/v1/works/:work_id (supports slashes in work IDs)
router.get('/{*work_id}', (req, res) => {
  const db = getDb();
  let rawId = req.params.work_id;
  const work_id = Array.isArray(rawId) ? rawId.join('/') : decodeURIComponent(rawId || '');

  const work = getWorkById(db, work_id);
  if (!work) {
    return res.status(404).json({ detail: "Work not found" });
  }

  // Expenditures timeline
  let expenditures = [];
  try {
    const expRows = db.prepare("SELECT * FROM expenditures WHERE work_id = ?").all(work_id);
    expenditures = expRows.map(e => ({
      month: e.month_name || "Month",
      amount: parseFloat(e.amount || 0),
      date: e.expenditure_date || "2024-06-01"
    }));
  } catch (e) {
    expenditures = [];
  }

  // Alerts for this work
  let alerts = [];
  try {
    const alertRows = db.prepare("SELECT * FROM alerts WHERE work_id = ?").all(work_id);
    alerts = alertRows.map(a => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      description: a.description,
      status: a.status,
      created_at: a.created_at ? String(a.created_at).split(" ")[0] : "2024-08-15"
    }));
  } catch (e) {
    alerts = [];
  }

  // AI risk dossier
  const riskDossier = getWorkRiskDossier(db, work_id);

  // Similar candidate works
  const similarCandidates = getWorkSimilarities(db, work_id).slice(0, 4);

  // Georeferencing & Coordinate Resolution
  const districtRecord = work.district_id ? db.prepare("SELECT * FROM districts WHERE district_id = ?").get(work.district_id) : null;
  const stateRecord = work.state_id ? db.prepare("SELECT * FROM states WHERE state_id = ?").get(work.state_id) : null;
  const geoLocation = resolveProjectCoordinates(work, districtRecord, stateRecord);

  return res.json({
    project: work,
    expenditures,
    alerts,
    risk_dossier: riskDossier,
    similar_candidates: similarCandidates,
    geo_location: geoLocation
  });
});

// PUT /api/v1/works/:work_id/location
router.put('/:work_id/location', authMiddleware, (req, res) => {
  const db = getDb();
  const { work_id } = req.params;
  const { latitude, longitude, location_address, officer_remarks } = req.body;

  try {
    const updated = updateWorkLocation(db, work_id, {
      latitude,
      longitude,
      location_address,
      officer_remarks,
      user_id: req.user?.id || 1
    });
    return res.json(updated);
  } catch (err) {
    console.error('Failed to update project location:', err);
    return res.status(400).json({ detail: err.message });
  }
});

// POST /api/v1/works
router.post('', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const newWork = createNewWork(db, req.body);
    return res.status(201).json(newWork);
  } catch (e) {
    return res.status(500).json({ detail: e.message });
  }
});

// POST /api/v1/works/upload (JSON batch fallback)
router.post('/upload', authMiddleware, async (req, res) => {
  const db = getDb();
  const rawItems = req.body?.works || [];

  try {
    const result = await batchUploadWorks(db, req.user, rawItems);
    return res.json(result);
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ detail: err.message });
    }
    return res.status(err.status || 500).json({ detail: err.message });
  }
});

// Configure Multer for streaming high-capacity file uploads (CSV, TSV, XLSX, XLS, JSON)
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9\._-]/g, '_')}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 } // 300MB
});

// POST /api/v1/works/upload-file
// High-Speed NumPy & Pandas Ingestion Endpoint
router.post('/upload-file', authMiddleware, upload.single('file'), async (req, res) => {
  // 1. Enforce strict MP role restriction
  if (req.user?.role === 'MP') {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(403).json({
      detail: "Members of Parliament have recommendation and review privileges only. Data upload is reserved for District, State, and Ministry Administrative Officers."
    });
  }

  if (!req.file) {
    return res.status(400).json({ detail: "No file was uploaded. Please attach a CSV, TSV, Excel (.xlsx/.xls), or JSON file." });
  }

  const uploadedFilePath = req.file.path;
  const stateId = req.body?.state_id || req.user?.state_id || 1;
  const districtId = req.body?.district_id || req.user?.district_id || 1;
  const constId = req.body?.constituency_id || req.user?.constituency_id || 1;
  const userRole = req.user?.role || "District";
  const creator = req.user?.email || "admin@mplads.gov.in";

  const scriptPath = path.resolve(__dirname, '../../../ai-engine/ingestion/fast_ingest.py');

  const args = [
    scriptPath,
    '--file', uploadedFilePath,
    '--state-id', String(stateId),
    '--district-id', String(districtId),
    '--constituency-id', String(constId),
    '--user-role', userRole,
    '--creator', creator,
    '--batch-size', '5000'
  ];

  console.log(`[Fast Ingest] Launching NumPy/Pandas engine for file: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);
  const pyProcess = spawn('python', args);

  let stdoutData = '';
  let stderrData = '';

  pyProcess.stdout.on('data', (chunk) => { stdoutData += chunk.toString(); });
  pyProcess.stderr.on('data', (chunk) => { stderrData += chunk.toString(); });

  pyProcess.on('close', (code) => {
    // Delete temporary uploaded file safely
    try {
      if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
    } catch (e) {}

    if (code !== 0) {
      console.error('[Fast Ingest Error]', stderrData || stdoutData);
      return res.status(500).json({
        detail: "Fast Ingestion Engine encountered an error while processing the data.",
        error: stderrData || stdoutData
      });
    }

    try {
      const parsed = JSON.parse(stdoutData.trim());
      console.log(`[Fast Ingest Complete] ${parsed.message || 'Data ingestion finished.'}`);
      return res.json(parsed);
    } catch (e) {
      return res.json({
        success: true,
        message: stdoutData.trim()
      });
    }
  });

  pyProcess.on('error', (err) => {
    try {
      if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
    } catch (e) {}
    console.error('[Fast Ingest Process Spawn Error]', err.message);
    return res.status(500).json({ detail: `Failed to launch Python ingestion engine: ${err.message}` });
  });
});

module.exports = router;

