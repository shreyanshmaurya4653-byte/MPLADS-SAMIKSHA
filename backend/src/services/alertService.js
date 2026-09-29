/**
 * MPLADS Alerts & Verification Service (JavaScript)
 * Real-time retrieval and lifecycle management of AI-flagged anomaly alerts.
 */

function getAlertsForUser(db, user = {}, filters = {}) {
  let sql = `
    SELECT 
      a.id, a.work_id, a.alert_type, a.severity, a.title, a.description, a.status, a.created_at,
      w.title as work_title, w.district_id, w.constituency_id, w.state_id,
      s.state_name, d.district_name
    FROM alerts a
    LEFT JOIN works w ON a.work_id = w.id
    LEFT JOIN states s ON w.state_id = s.state_id
    LEFT JOIN districts d ON w.district_id = d.district_id
    WHERE 1=1
  `;
  const params = [];

  const role = user.role;
  if (role === "MP") {
    if (user.constituency_id) {
      sql += " AND (w.constituency_id = ? OR LOWER(w.mp_name) LIKE ?)";
      params.push(user.constituency_id, `%${(user.name || '').toLowerCase().trim()}%`);
    } else if (user.state_id) {
      sql += " AND w.state_id = ?";
      params.push(user.state_id);
    }
  } else if (role === "District" && user.district_id && !filters.all_districts) {
    sql += " AND w.district_id = ?";
    params.push(user.district_id);
  } else if (role === "State" && user.state_id && !filters.all_states) {
    sql += " AND w.state_id = ?";
    params.push(user.state_id);
  }

  // Filter overrides from query
  if (filters.state_id && filters.state_id !== "All") {
    sql += " AND w.state_id = ?";
    params.push(Number(filters.state_id));
  }
  if (filters.district_id && filters.district_id !== "All") {
    sql += " AND w.district_id = ?";
    params.push(Number(filters.district_id));
  }
  if (filters.constituency_id && filters.constituency_id !== "All") {
    sql += " AND w.constituency_id = ?";
    params.push(Number(filters.constituency_id));
  }
  if (filters.subdivision && filters.subdivision !== "All") {
    sql += " AND w.subdivision = ?";
    params.push(filters.subdivision);
  }
  if (filters.severity && filters.severity !== "All") {
    sql += " AND a.severity = ?";
    params.push(filters.severity);
  }
  if (filters.alert_type && filters.alert_type !== "All") {
    sql += " AND a.alert_type = ?";
    params.push(filters.alert_type);
  }

  sql += " ORDER BY CASE a.severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END, a.id DESC LIMIT 50";

  const rows = db.prepare(sql).all(...params);
  return rows.map(r => ({
    id: r.id,
    work_id: r.work_id,
    work_title: r.work_title || "MPLADS Development Project",
    alert_type: r.alert_type,
    severity: r.severity,
    title: r.title,
    description: r.description,
    status: r.status,
    state_name: r.state_name || "General State",
    district_name: r.district_name || "Central District",
    created_at: r.created_at ? String(r.created_at).split(" ")[0] : "2024-08-15"
  }));
}

function updateAlertStatus(db, alertId, newStatus) {
  const alert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(alertId);
  if (!alert) return null;

  db.prepare("UPDATE alerts SET status = ? WHERE id = ?").run(newStatus, alertId);
  return db.prepare("SELECT * FROM alerts WHERE id = ?").get(alertId);
}

module.exports = {
  getAlertsForUser,
  updateAlertStatus
};
