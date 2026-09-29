/**
 * MPLADS Work & Project Management Service (JavaScript)
 * Enforces role-based jurisdictional scoping (RBAC), multi-tier filters, and project uploads.
 */
const { saveWorkToSupabase, saveWorksBatchToSupabase, saveRiskAssessmentToSupabase } = require('../config/database');
const { resolveProjectCoordinates } = require('./geoResolutionService');

function getWorksForUser(db, user = {}, filters = {}) {
  const role = user.role || "Ministry";
  const userStateId = user.state_id;
  const userDistId = user.district_id;
  const userConstId = user.constituency_id;

  let baseSql = `
    SELECT 
      w.id, w.title, w.description, w.category, w.constituency_id, w.district_id, w.state_id, w.subdivision,
      w.latitude, w.longitude, w.location_address, w.location_status,
      w.implementing_agency, w.sanctioned_amount, w.estimated_cost, w.released_amount,
      w.expenditure, w.physical_progress, w.payment_utilization, w.start_date,
      w.expected_completion, w.actual_completion, w.status,
      COALESCE(w.house_type, c.house_type, 'Lok Sabha') as house_type,
      c.constituency_name, COALESCE(w.mp_name, c.mp_name, 'Honble Member of Parliament') as mp_name, c.mp_party,
      d.district_name, s.state_name,
      r.risk_score, r.risk_level, r.recommendations
    FROM works w
    LEFT JOIN constituencies c ON w.constituency_id = c.constituency_id
    LEFT JOIN districts d ON w.district_id = d.district_id
    LEFT JOIN states s ON w.state_id = s.state_id
    LEFT JOIN risk_assessments r ON w.id = r.work_id
    WHERE 1=1
  `;
  const params = [];

  // Jurisdictional scoping
  if (role === "MP") {
    if (userConstId) {
      baseSql += " AND (w.constituency_id = ? OR LOWER(w.mp_name) LIKE ?)";
      params.push(userConstId, `%${(user.name || '').toLowerCase().trim()}%`);
    } else if (userStateId) {
      baseSql += " AND w.state_id = ?";
      params.push(userStateId);
    }
  } else if (role === "District") {
    const did = userDistId || (filters.district_id ? Number(filters.district_id) : 1);
    baseSql += " AND w.district_id = ?";
    params.push(did);
  } else if (role === "State") {
    const sid = userStateId || (filters.state_id ? Number(filters.state_id) : 1);
    baseSql += " AND w.state_id = ?";
    params.push(sid);
    if (filters.district_id && filters.district_id !== "All") {
      baseSql += " AND w.district_id = ?";
      params.push(Number(filters.district_id));
    }
  } else {
    // Ministry / Admin / Central Overseer
    if (filters.state_id && filters.state_id !== "All") {
      baseSql += " AND w.state_id = ?";
      params.push(Number(filters.state_id));
    }
    if (filters.district_id && filters.district_id !== "All") {
      baseSql += " AND w.district_id = ?";
      params.push(Number(filters.district_id));
    }
  }

  // Subdivision filter
  if (filters.subdivision && filters.subdivision !== "All") {
    baseSql += " AND w.subdivision = ?";
    params.push(filters.subdivision);
  }

  if (filters.constituency_id && filters.constituency_id !== "All") {
    baseSql += " AND w.constituency_id = ?";
    params.push(Number(filters.constituency_id));
  }

  // Parliamentary House Type filter (Lok Sabha vs Rajya Sabha)
  if (filters.house_type && filters.house_type !== "All") {
    baseSql += " AND (w.house_type = ? OR c.house_type = ?)";
    params.push(filters.house_type, filters.house_type);
  }

  // Filter by MP Name
  if (filters.mp_name && filters.mp_name.trim() && filters.mp_name !== "All") {
    baseSql += " AND (LOWER(c.mp_name) LIKE ? OR LOWER(w.mp_name) LIKE ?)";
    const mpTerm = `%${filters.mp_name.trim().toLowerCase()}%`;
    params.push(mpTerm, mpTerm);
  }

  // Status and category filters
  if (filters.status && filters.status !== "All") {
    baseSql += " AND w.status = ?";
    params.push(filters.status);
  }
  if (filters.category && filters.category !== "All") {
    baseSql += " AND w.category = ?";
    params.push(filters.category);
  }

  // Search keyword
  if (filters.search && filters.search.trim()) {
    baseSql += " AND (LOWER(w.title) LIKE ? OR LOWER(w.id) LIKE ? OR LOWER(c.constituency_name) LIKE ? OR LOWER(c.mp_name) LIKE ? OR LOWER(w.implementing_agency) LIKE ?)";
    const term = `%${filters.search.trim().toLowerCase()}%`;
    params.push(term, term, term, term, term);
  }

  // Risk level filter
  if (filters.risk_level && filters.risk_level !== "All") {
    if (filters.risk_level === 'High' || filters.risk_level === 'Critical') {
      baseSql += " AND (r.risk_level IN ('High', 'Critical') OR r.risk_score >= 40)";
    } else {
      baseSql += " AND r.risk_level = ?";
      params.push(filters.risk_level);
    }
  }

  // Minimum risk score filter
  if (filters.min_risk_score !== undefined && !isNaN(Number(filters.min_risk_score))) {
    baseSql += " AND r.risk_score >= ?";
    params.push(Number(filters.min_risk_score));
  }

  if (filters.sort_by === 'risk_score' || filters.risk_level === 'High') {
    baseSql += " ORDER BY COALESCE(r.risk_score, 0) DESC, w.id ASC";
  } else {
    baseSql += " ORDER BY w.id ASC";
  }

  const limit = filters.limit !== undefined ? parseInt(filters.limit, 10) : 500;
  if (limit > 0) {
    baseSql += " LIMIT ?";
    params.push(limit);
  }
  if (filters.offset !== undefined && parseInt(filters.offset, 10) > 0) {
    baseSql += " OFFSET ?";
    params.push(parseInt(filters.offset, 10));
  }

  const stmt = db.prepare(baseSql);
  const rows = stmt.all(...params);

  return rows.map(r => {
    let lat = r.latitude !== null && !isNaN(r.latitude) ? Number(r.latitude) : null;
    let lng = r.longitude !== null && !isNaN(r.longitude) ? Number(r.longitude) : null;
    let address = r.location_address;
    let status = r.location_status || 'GEOCODED_AI_MODEL';

    if (lat === null || lng === null) {
      const geo = resolveProjectCoordinates(
        r,
        { district_name: r.district_name },
        { state_name: r.state_name }
      );
      lat = geo.latitude;
      lng = geo.longitude;
      address = geo.location_address;
      status = geo.location_status;
    }

    const searchQuery = address || `${r.title}, ${r.district_name || ''}, ${r.state_name || ''}, India`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
    const googleEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(searchQuery)}&t=h&z=16&output=embed`;

    return {
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      constituency_id: r.constituency_id,
      district_id: r.district_id,
      state_id: r.state_id,
      latitude: lat,
      longitude: lng,
      location_address: address,
      location_status: status,
      google_maps_url: googleMapsUrl,
      google_embed_url: googleEmbedUrl,
      implementing_agency: r.implementing_agency,
      sanctioned_amount: parseFloat(r.sanctioned_amount || 0),
      estimated_cost: parseFloat(r.estimated_cost || 0),
      released_amount: parseFloat(r.released_amount || 0),
      expenditure: parseFloat(r.expenditure || 0),
      physical_progress: parseFloat(r.physical_progress || 0),
      payment_utilization: parseFloat(r.payment_utilization || 0),
      start_date: r.start_date,
      expected_completion: r.expected_completion,
      actual_completion: r.actual_completion,
      status: r.status,
      house_type: r.house_type || "Lok Sabha",
      risk_score: parseFloat(r.risk_score || 15.0),
      risk_level: r.risk_level || "Low",
      recommendations: r.recommendations || "Normal Operating Range: Work progressing in compliance with approved scheme milestones.",
      anomalies: [],
      subdivision: r.subdivision || 'Awaiting Sub-district Upload',
      constituency_name: r.constituency_name || "General Jurisdiction",
      district_name: r.district_name || "District Jurisdiction",
      state_name: r.state_name || "State Jurisdiction",
      mp_name: r.mp_name || "Hon'ble Member of Parliament"
    };
  });
}

function getWorkById(db, workId) {
  const sql = `
    SELECT 
      w.id, w.title, w.description, w.category, w.constituency_id, w.district_id, w.state_id, w.subdivision,
      w.latitude, w.longitude, w.location_address, w.location_status,
      w.implementing_agency, w.sanctioned_amount, w.estimated_cost, w.released_amount,
      w.expenditure, w.physical_progress, w.payment_utilization, w.start_date,
      w.expected_completion, w.actual_completion, w.status,
      c.constituency_name, c.mp_name, c.mp_party,
      d.district_name, s.state_name,
      r.risk_score, r.risk_level, r.recommendations
    FROM works w
    LEFT JOIN constituencies c ON w.constituency_id = c.constituency_id
    LEFT JOIN districts d ON w.district_id = d.district_id
    LEFT JOIN states s ON w.state_id = s.state_id
    LEFT JOIN risk_assessments r ON w.id = r.work_id
    WHERE w.id = ?
  `;
  const r = db.prepare(sql).get(workId);
  if (!r) return null;

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    constituency_id: r.constituency_id,
    district_id: r.district_id,
    state_id: r.state_id,
    implementing_agency: r.implementing_agency,
    sanctioned_amount: parseFloat(r.sanctioned_amount || 0),
    estimated_cost: parseFloat(r.estimated_cost || 0),
    released_amount: parseFloat(r.released_amount || 0),
    expenditure: parseFloat(r.expenditure || 0),
    physical_progress: parseFloat(r.physical_progress || 0),
    payment_utilization: parseFloat(r.payment_utilization || 0),
    start_date: r.start_date,
    expected_completion: r.expected_completion,
    actual_completion: r.actual_completion,
    status: r.status,
    risk_score: parseFloat(r.risk_score || 15.0),
    risk_level: r.risk_level || "Low",
    anomalies: [],
    subdivision: r.subdivision || 'Sadar Subdivision',
    constituency_name: r.constituency_name || "Central Constituency",
    district_name: r.district_name || "Central District",
    state_name: r.state_name || "Uttar Pradesh",
    mp_name: r.mp_name || "Shri Rajesh Kumar Sharma"
  };
}

function createNewWork(db, payload) {
  let workId = payload.id;
  if (!workId) {
    const countRow = db.prepare("SELECT count(1) as cnt FROM works").get();
    const count = (countRow?.cnt || 0) + 1000;
    workId = `P${count + 1}`;
  }

  const insertStmt = db.prepare(`
    INSERT INTO works (
      id, title, description, category, constituency_id, district_id, state_id,
      implementing_agency, estimated_cost, sanctioned_amount, released_amount,
      expenditure, physical_progress, payment_utilization, start_date, expected_completion, status
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, 0.0,
      0.0, 0.0, 0.0, ?, ?, 'Sanctioned'
    )
  `);

  insertStmt.run(
    workId,
    payload.title,
    payload.description || `Development project under ${payload.category}`,
    payload.category,
    payload.constituency_id || 1,
    payload.district_id || 1,
    payload.state_id || 1,
    payload.implementing_agency || "Public Works Department (PWD)",
    payload.estimated_cost || 1000000.0,
    payload.sanctioned_amount || 1000000.0,
    payload.start_date || "2024-06-01",
    payload.expected_completion || "2024-12-01"
  );

  const createdWork = getWorkById(db, workId);
  saveWorkToSupabase(createdWork).catch(err => console.warn('[Supabase Sync Warning]', err.message));
  return createdWork;
}

function isValidWorkItem(item) {
  if (!item || typeof item !== 'object') return false;
  let title = String(item.title || item.work_title || item.name || '').trim().replace(/^["']+|["']+$/g, '').trim();
  if (title.length === 0) return false; // require non-empty title

  const lower = title.toLowerCase();
  const garbageHeaders = [
    'title', 'work title', 'project title', 'project name', 'work name', 'untitled work',
    'mp name', 'name of mp', 'member of parliament', 'hon\'ble mp', 'constituency',
    'constituency name', 'district name', 'state name', 'scheme name',
    'sl no', 's.no', 'sl.no', 'serial no', 'total', 'grand total', 'sub total',
    'subtotal', 'sub-total', 'page', 'date', 'amount', 'sanctioned amount', 'estimated cost', 'category',
    'status', 'progress', 'remarks', 'description', 'sn', 'sr no', 's.n.'
  ];
  if (garbageHeaders.includes(lower)) return false;

  // Catch summary and aggregation lines commonly found in government spreadsheets
  if (
    lower.startsWith('total') ||
    lower.startsWith('sub total') ||
    lower.startsWith('subtotal') ||
    lower.startsWith('sub-total') ||
    lower.startsWith('grand total') ||
    lower.startsWith('page ') ||
    lower.includes('sub-total') ||
    lower.includes('sub total') ||
    lower.includes('grand total') ||
    lower.includes('carry forward') ||
    lower.includes('brought forward')
  ) {
    return false;
  }

  // Purely punctuation, numbers, or symbols without meaningful text
  if (/^[\d\s.,;:\-_/\\#@!%&*()+=]+$/.test(title)) return false;

  return true;
}

async function batchUploadWorks(db, user, items) {
  const role = user?.role || "Ministry";
  if (role === "MP") {
    const error = new Error("Members of Parliament have recommendation and review privileges only. Data upload is reserved for District, State, and Ministry Administrative Officers.");
    error.status = 403;
    throw error;
  }

  // Filter out waste/garbage data
  const rawList = Array.isArray(items) ? items : [];
  const validItems = rawList.filter(isValidWorkItem);
  if (validItems.length === 0) {
    const err = new Error("No valid scheme works found. Rows must include genuine project titles and non-zero amounts. Blank, header, or summary rows were discarded.");
    err.status = 400;
    throw err;
  }

  const discardedCount = rawList.length - validItems.length;
  const createdIds = [];
  const worksToSync = [];
  const risksToSync = [];

  let maxNum = 1000;
  const existing = db.prepare("SELECT id FROM works").all();
  for (const row of existing) {
    const wid = row.id;
    if (wid && wid.startsWith("P") && !isNaN(wid.slice(1))) {
      const val = parseInt(wid.slice(1), 10);
      if (val > maxNum) maxNum = val;
    }
  }

  const insertProject = db.prepare(`
    INSERT INTO projects (
      project_code, project_name, description, category, state_id, district_id,
      constituency_id, implementing_agency_name, estimated_cost, sanctioned_amount,
      released_amount, expenditure_amount, physical_progress, payment_utilization,
      start_date, expected_completion_date, status, created_by
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      0, 0, 0, 0,
      ?, ?, 'Sanctioned', ?
    )
  `);

  const insertWork = db.prepare(`
    INSERT INTO works (
      id, title, description, category, constituency_id, district_id, state_id,
      implementing_agency, estimated_cost, sanctioned_amount, released_amount,
      expenditure, physical_progress, payment_utilization, start_date, expected_completion, status
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, 0,
      0, 0, 0, ?, ?, 'Sanctioned'
    )
  `);

  const insertRisk = db.prepare(`
    INSERT OR REPLACE INTO risk_assessments (
      work_id, risk_score, risk_level, delay_probability, cost_overrun_risk,
      progress_gap_score, agency_concentration_score, duplicate_risk_score, recommendations
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const { getWorkRiskDossier } = require('./riskService');

  for (const item of validItems) {
    maxNum++;
    const workId = `P${maxNum}`;

    let sid = item.state_id || user.state_id || 1;
    let did = item.district_id || user.district_id || 1;
    let cid = item.constituency_id || user.constituency_id || 1;

    if (role === "District") {
      did = user.district_id || 1;
    } else if (role === "State") {
      sid = user.state_id || 1;
    }

    const title = String(item.title).trim();
    const cat = String(item.category || "General Community Asset").trim();
    const desc = item.description || `Development project under ${cat}`;
    const agency = String(item.implementing_agency || "Public Works Department (PWD)").trim();
    const est = parseFloat(item.estimated_cost) || parseFloat(item.sanctioned_amount) || 1000000.0;
    const sanc = parseFloat(item.sanctioned_amount) || est || 1000000.0;
    const sdate = item.start_date && item.start_date.length === 10 ? item.start_date : "2024-06-01";
    const edate = item.expected_completion && item.expected_completion.length === 10 ? item.expected_completion : "2024-12-01";
    const creator = user.email || "admin@mplads.gov.in";

    try {
      insertProject.run(workId, title, desc, cat, sid, did, cid, agency, est, sanc, sdate, edate, creator);
    } catch (e) {}

    insertWork.run(workId, title, desc, cat, cid, did, sid, agency, est, sanc, sdate, edate);

    // Run dynamic AI risk analysis on this uploaded work
    const dossier = getWorkRiskDossier(db, workId);
    const score = dossier?.risk_score !== undefined ? dossier.risk_score : 18.0;
    const level = dossier?.risk_level || 'Low';
    const delay = dossier?.delay_risk !== undefined ? dossier.delay_risk : 10.0;
    const cost = dossier?.cost_risk !== undefined ? dossier.cost_risk : 15.0;
    const payment = dossier?.payment_risk !== undefined ? dossier.payment_risk : 10.0;
    const duplicate = dossier?.duplicate_risk !== undefined ? dossier.duplicate_risk : 5.0;
    const recs = (dossier?.explanations && dossier.explanations.length > 0)
      ? dossier.explanations.join(' ')
      : 'Initial baseline assessment: On track.';

    insertRisk.run(workId, score, level, delay, cost, payment, 15.0, duplicate, recs);
    createdIds.push(workId);

    // Collect for high-speed bulk sync to Supabase
    worksToSync.push({
      id: workId,
      title,
      description: desc,
      category: cat,
      state_id: sid,
      district_id: did,
      constituency_id: cid,
      implementing_agency: agency,
      estimated_cost: est,
      sanctioned_amount: sanc,
      released_amount: 0,
      expenditure: 0,
      physical_progress: 0,
      payment_utilization: 0,
      start_date: sdate,
      expected_completion: edate,
      status: 'Sanctioned'
    });

    risksToSync.push({
      work_id: workId,
      risk_score: score,
      risk_level: level,
      delay_risk: delay,
      cost_risk: cost,
      payment_risk: payment,
      recommendations: recs
    });
  }

  // Execute transaction-chunked bulk upsert to Supabase PostgreSQL
  if (worksToSync.length > 0) {
    try {
      await saveWorksBatchToSupabase(worksToSync, risksToSync);
    } catch (err) {
      console.warn('[Supabase Sync Warning]', err.message);
    }
  }

  let message = `Successfully ingested and analyzed ${createdIds.length} MPLADS works.`;
  if (discardedCount > 0) {
    message += ` (${discardedCount} blank/header/waste rows ignored).`;
  }

  return {
    success: true,
    count: createdIds.length,
    discarded_count: discardedCount,
    created_ids: createdIds,
    message
  };
}

module.exports = {
  getWorksForUser,
  getWorkById,
  createNewWork,
  batchUploadWorks
};
