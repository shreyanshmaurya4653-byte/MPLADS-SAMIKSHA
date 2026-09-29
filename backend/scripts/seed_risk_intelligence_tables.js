const { getDb } = require('../src/config/database');
const db = getDb();

console.log('Seeding contractor_performance, compliance_results, and model_runs...');

// 1. Model Runs
db.exec(`DELETE FROM model_runs`);
const insertModelRun = db.prepare(`
  INSERT INTO model_runs (model_name, model_type, model_version, parameters, metrics, run_status, started_at, finished_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-2 hours'), datetime('now', '-1 hours'))
`);

const models = [
  {
    name: 'MPLADS-Duplicate-Lexical-Detector',
    type: 'TF-IDF / N-gram & Jaccard Ensemble',
    version: 'v2.4.1',
    params: JSON.stringify({ min_threshold: 40.0, ngram_range: [1, 3], stopword_filtering: true, max_vocab: 50000 }),
    metrics: JSON.stringify({ precision: 0.942, recall: 0.918, f1_score: 0.93, evaluated_works: 235572, cluster_clusters: 671 })
  },
  {
    name: 'Disbursement-Velocity-Spike-Analyzer',
    type: 'Time-Series Anomaly / Isolation Forest',
    version: 'v3.1.0',
    params: JSON.stringify({ contamination_rate: 0.02, disbursement_velocity_threshold: 0.85, milestone_ratio: 0.40 }),
    metrics: JSON.stringify({ anomalies_detected: 1219, true_positive_rate: 0.965, execution_time_sec: 1.42 })
  },
  {
    name: 'Milestone-Payment-Mismatch-Predictor',
    type: 'Gradient Boosted Decision Tree (LightGBM)',
    version: 'v1.8.2',
    params: JSON.stringify({ learning_rate: 0.05, max_depth: 6, n_estimators: 120, variance_gap_threshold: 20.0 }),
    metrics: JSON.stringify({ auc_roc: 0.958, accuracy: 0.934, flagged_mismatches: 2615 })
  },
  {
    name: 'Contractor-Delinquency-Risk-Scorer',
    type: 'Multi-Criteria Rating Engine',
    version: 'v2.0.0',
    params: JSON.stringify({ delay_penalty_weight: 0.35, cost_variance_weight: 0.30, quality_score_weight: 0.35 }),
    metrics: JSON.stringify({ contractors_evaluated: 28940, high_risk_vendors: 48, mean_performance: 68.4 })
  },
  {
    name: 'Statutory-Guidelines-Audit-Engine',
    type: 'Rule-Based Deterministic Validator',
    version: 'v4.0.0',
    params: JSON.stringify({ rules_checked: 18, mospi_edition: "2023-Rev-2", sc_st_quota_check: true }),
    metrics: JSON.stringify({ pass_rate_pct: 88.6, warning_rate_pct: 8.2, fail_rate_pct: 3.2, total_audits: 235572 })
  },
  {
    name: 'Geospatial-Asset-Collocation-Engine',
    type: 'Haversine Density-Based Clustering',
    version: 'v1.5.0',
    params: JSON.stringify({ radius_meters: 50, coordinate_precision: 6, cluster_min_points: 2 }),
    metrics: JSON.stringify({ flagged_co_locations: 184, verified_geotags: 92.4 })
  }
];

for (const m of models) {
  insertModelRun.run(m.name, m.type, m.version, m.params, m.metrics, 'COMPLETED');
}
console.log('Seeded 6 model_runs.');

// 2. Contractor Performance
db.exec(`DELETE FROM contractor_performance`);
const insertPerf = db.prepare(`
  INSERT INTO contractor_performance (
    contractor_id, project_id, completion_status, delay_days,
    quality_score, performance_score, cost_variance_percentage,
    cancelled, compliance_issues, remarks, evaluation_date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now', '-' || ? || ' days'))
`);

// Grab top 60 contractors with valid names
const contractorsList = db.prepare(`
  SELECT contractor_id, contractor_name, total_works, total_expenditure
  FROM contractors 
  WHERE contractor_name != 'nan' AND length(contractor_name) > 3 AND contractor_name NOT GLOB '[0-9]*'
  ORDER BY total_expenditure DESC 
  LIMIT 60
`).all();

// Grab 60 sample projects
const projectsList = db.prepare(`
  SELECT id, title, sanctioned_amount, expenditure, physical_progress, status
  FROM works
  WHERE sanctioned_amount >= 500000
  ORDER BY id ASC
  LIMIT 60
`).all();

const statuses = ['Delayed', 'In Progress', 'Completed', 'Critical Lag', 'Under Review'];
const remarksList = [
  'Severe milestone lag; civil work behind schedule by >60 days.',
  'Material procurement delay cited; expenditure frontloaded.',
  'Satisfactory quality but billing exceeds physical progress by 18%.',
  'Notice issued under Rule 6.2 for unauthorized work subcontracting.',
  'Excellent structural compliance, on schedule and within sanctioned cost.',
  'Audit flag: Soil testing and structural certificates pending submission.',
  'Delayed due to monsoon halt; revised completion timeline filed with nodal officer.',
  'Contractor served showcause for milestone divergence.'
];

let perfCount = 0;
for (let i = 0; i < Math.min(contractorsList.length, projectsList.length); i++) {
  const c = contractorsList[i];
  const p = projectsList[i];
  const delay = (i % 5 === 0) ? Math.floor(Math.random() * 90) + 45 : Math.floor(Math.random() * 30);
  const perfScore = (i % 5 === 0) ? Math.floor(Math.random() * 30) + 35 : Math.floor(Math.random() * 40) + 60;
  const qualScore = Math.min(100, Math.floor(perfScore * 0.95 + Math.random() * 10));
  const costVar = (i % 4 === 0) ? Math.round((Math.random() * 25 + 5) * 10) / 10 : Math.round((Math.random() * 5) * 10) / 10;
  const compl = (i % 5 === 0) ? Math.floor(Math.random() * 3) + 1 : 0;
  const status = (perfScore < 50) ? 'Delayed' : (perfScore < 75 ? 'In Progress' : 'Completed');
  const remark = remarksList[i % remarksList.length];
  const daysAgo = (i * 3) % 90 + 5;

  insertPerf.run(
    c.contractor_id,
    p.id,
    status,
    delay,
    qualScore,
    perfScore,
    costVar,
    perfScore < 35 ? 1 : 0,
    compl,
    remark,
    daysAgo
  );
  perfCount++;
}
console.log(`Seeded ${perfCount} contractor_performance rows.`);

// 3. Compliance Results
db.exec(`DELETE FROM compliance_results`);
const insertComp = db.prepare(`
  INSERT INTO compliance_results (
    project_id, rule_name, rule_category, status, deviation_notes, severity, checked_at
  ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
`);

const rules = [
  { rule: 'Expenditure Ceiling Compliance (Para 3.4)', cat: 'Financial Limit', severity: 'HIGH' },
  { rule: 'Mandatory SC/ST Community Asset Quota (Para 2.5)', cat: 'Social Inclusivity', severity: 'CRITICAL' },
  { rule: 'ISRO Bhuvan Geotagging Requirement (Rule 5.1)', cat: 'Geospatial Verification', severity: 'MEDIUM' },
  { rule: 'Schedule of Rates (SoR) Cost Integrity (Para 4.2)', cat: 'Technical Sanction', severity: 'HIGH' },
  { rule: 'Milestone Progress vs Billing Proportionality (Rule 6.3)', cat: 'Disbursement Audit', severity: 'CRITICAL' },
  { rule: 'Duplicate Proposal Cross-Verification (Para 1.8)', cat: 'Scope Verification', severity: 'CRITICAL' },
  { rule: 'Asset Handover & Maintenance Undertaking (Rule 7.2)', cat: 'Asset Sustainability', severity: 'LOW' },
  { rule: 'Display of Mandatory Citizen Information Board (Rule 9.1)', cat: 'Transparency', severity: 'LOW' }
];

let compCount = 0;
const sampleWorks = db.prepare(`
  SELECT id, title, sanctioned_amount, expenditure, physical_progress, status
  FROM works
  WHERE (expenditure >= sanctioned_amount * 0.85 AND physical_progress < 40) OR status = 'Delayed'
  LIMIT 80
`).all();

sampleWorks.forEach((w, idx) => {
  const r = rules[idx % rules.length];
  let status = 'FAIL';
  let note = '';
  if (r.cat === 'Financial Limit') {
    status = 'FAIL';
    note = `Disbursement ₹${(w.expenditure/100000).toFixed(1)}L exceeds permissible milestone phase release without revised administrative approval.`;
  } else if (r.cat === 'Disbursement Audit') {
    status = 'FAIL';
    note = `Disbursement velocity exceeds physical milestone progress (${w.physical_progress}%) by statutory limit.`;
  } else if (r.cat === 'Geospatial Verification') {
    status = idx % 2 === 0 ? 'WARNING' : 'FAIL';
    note = 'Geotagging coordinates missing stage-2 construction verification photograph on portal.';
  } else if (r.cat === 'Social Inclusivity') {
    status = idx % 3 === 0 ? 'WARNING' : 'PASS';
    note = status === 'PASS' ? 'Compliant with SC/ST targeted infrastructure criteria.' : 'Demographic caste census proportion documentation pending.';
  } else {
    status = idx % 4 === 0 ? 'FAIL' : 'WARNING';
    note = 'Technical estimate variances observed against current PWD Schedule of Rates.';
  }

  insertComp.run(
    w.id,
    r.rule,
    r.cat,
    status,
    note,
    status === 'FAIL' ? r.severity : (status === 'WARNING' ? 'MEDIUM' : 'LOW'),
    (idx * 2) % 60 + 1
  );
  compCount++;
});

console.log(`Seeded ${compCount} compliance_results rows.`);
console.log('Seeding completed successfully!');
