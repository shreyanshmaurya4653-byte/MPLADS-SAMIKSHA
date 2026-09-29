const { getDb } = require('../src/config/database');

const db = getDb();

// 1. Mark works with severe payment-progress mismatch (gap >= 25%) as High Risk
const resHigh = db.prepare(`
  UPDATE risk_assessments 
  SET 
    risk_score = 88.5,
    risk_level = 'High',
    progress_gap_score = 95.0,
    delay_probability = 85.0,
    recommendations = 'Critical Anomaly: 100% payment disbursed with lagging physical progress. Immediate technical & financial inspection mandated.'
  WHERE work_id IN (
    SELECT id FROM works 
    WHERE (payment_utilization - physical_progress) >= 25.0
  )
`).run();

console.log('Updated High Risk works in SQLite:', resHigh.changes);

// 2. Mark works with moderate gap (15% <= gap < 25%) as Medium Risk
const resMed = db.prepare(`
  UPDATE risk_assessments 
  SET 
    risk_score = 58.0,
    risk_level = 'Medium',
    progress_gap_score = 65.0,
    recommendations = 'Warning: Milestone progress lagging behind disbursement schedule. Regular review suggested.'
  WHERE work_id IN (
    SELECT id FROM works 
    WHERE (payment_utilization - physical_progress) >= 15.0 AND (payment_utilization - physical_progress) < 25.0
  )
`).run();

console.log('Updated Medium Risk works in SQLite:', resMed.changes);

// 3. Mark delayed status for works past completion date with incomplete progress
const resDelayed = db.prepare(`
  UPDATE works
  SET status = 'Delayed'
  WHERE status = 'Ongoing' 
    AND expected_completion < '2025-01-01'
    AND physical_progress < 100
`).run();

console.log('Updated Delayed status works:', resDelayed.changes);

// Verify distribution
const dist = db.prepare(`
  SELECT risk_level, count(*) as count, avg(risk_score) as avg_score 
  FROM risk_assessments 
  GROUP BY risk_level
`).all();
console.log('New Risk Distribution:', dist);
