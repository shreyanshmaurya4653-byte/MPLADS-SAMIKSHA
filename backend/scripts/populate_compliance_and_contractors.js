/**
 * Comprehensive Statutory Compliance & Contractor Vigilance Seeder
 * Evaluates real works across all 36 States/UTs and populates:
 * 1. compliance_results
 * 2. contractor_performance
 */
const { getDb } = require('../src/config/database');
const db = getDb();

console.log('--- Starting Comprehensive Compliance & Contractor Seeding ---');

// 1. Clear old sparse data
db.exec('DELETE FROM compliance_results');
db.exec('DELETE FROM contractor_performance');

// Insert statement for compliance_results
const insertComp = db.prepare(`
  INSERT INTO compliance_results (
    project_id, rule_name, rule_category, status, deviation_notes, severity, checked_at
  ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
`);

// Insert statement for contractor_performance
const insertPerf = db.prepare(`
  INSERT INTO contractor_performance (
    contractor_id, project_id, completion_status, delay_days,
    quality_score, performance_score, cost_variance_percentage,
    cancelled, compliance_issues, remarks, evaluation_date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now', '-' || ? || ' days'))
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

const states = db.prepare('SELECT state_id, state_name FROM states ORDER BY state_id ASC').all();
const allContractors = db.prepare(`
  SELECT contractor_id, contractor_name, total_works, total_expenditure
  FROM contractors
  WHERE contractor_name IS NOT NULL AND length(contractor_name) > 3 AND contractor_name != 'nan'
  ORDER BY total_expenditure DESC
  LIMIT 1500
`).all();

let totalComp = 0;
let totalPerf = 0;
let contractorIdx = 0;

db.exec('BEGIN TRANSACTION');

for (const state of states) {
  // Grab up to 25 representative works for each state
  const works = db.prepare(`
    SELECT id, title, category, sanctioned_amount, expenditure, physical_progress, status, latitude, longitude, district_id
    FROM works
    WHERE state_id = ?
    ORDER BY id ASC
    LIMIT 25
  `).all(state.state_id);

  if (!works || works.length === 0) continue;

  works.forEach((w, idx) => {
    const r = rules[idx % rules.length];
    let status = 'PASS';
    let note = '';
    const sanc = w.sanctioned_amount || 1000000;
    const exp = w.expenditure || 0;
    const prog = w.physical_progress || 0;

    if (r.cat === 'Financial Limit') {
      if (exp > sanc * 1.05) {
        status = 'FAIL';
        note = `Disbursement ₹${(exp / 100000).toFixed(1)}L exceeds sanctioned limit of ₹${(sanc / 100000).toFixed(1)}L without revised approval.`;
      } else if (exp > sanc * 0.90) {
        status = 'WARNING';
        note = `Disbursement at ${Math.round((exp / sanc) * 100)}% of ceiling; vigilance clearance required before final release.`;
      } else {
        status = 'PASS';
        note = `Expenditure within sanctioned administrative allocation (₹${(sanc / 100000).toFixed(1)}L).`;
      }
    } else if (r.cat === 'Disbursement Audit') {
      if (exp > sanc * 0.70 && prog < 40) {
        status = 'FAIL';
        note = `Disbursement velocity (${Math.round((exp / sanc) * 100)}%) severely disconnects from verified site progress (${prog}%).`;
      } else if (exp > sanc * 0.50 && prog < 50) {
        status = 'WARNING';
        note = `Physical progress lag (${prog}%) observed against interim release tranche.`;
      } else {
        status = 'PASS';
        note = `Billing release proportionate to verified milestone physical progress (${prog}%).`;
      }
    } else if (r.cat === 'Geospatial Verification') {
      if (w.latitude && w.longitude) {
        status = 'PASS';
        note = `ISRO Bhuvan geotagging verified at coordinates [${w.latitude.toFixed(4)}, ${w.longitude.toFixed(4)}].`;
      } else if (w.status === 'Completed') {
        status = 'FAIL';
        note = 'Mandatory completion stage-2 geotagged photograph missing on central portal.';
      } else {
        status = 'WARNING';
        note = 'Preliminary survey geotagged; stage-1 construction geotag pending submission.';
      }
    } else if (r.cat === 'Social Inclusivity') {
      if (idx % 3 === 0) {
        status = 'PASS';
        note = 'Mandatory SC/ST demographic asset allocation requirement fulfilled (Para 2.5).';
      } else if (idx % 3 === 1) {
        status = 'WARNING';
        note = 'Local demographic beneficiary certification pending from Block Development Officer.';
      } else {
        status = 'PASS';
        note = 'Asset constructed in designated habitation priority zone.';
      }
    } else {
      if (idx % 4 === 0) {
        status = 'FAIL';
        note = 'Rate estimate discrepancy observed against current State PWD Schedule of Rates.';
      } else if (idx % 4 === 1) {
        status = 'WARNING';
        note = 'Third-party technical verification certificate pending sign-off.';
      } else {
        status = 'PASS';
        note = 'Fully compliant with MoSPI MPLADS Guidelines 2023.';
      }
    }

    insertComp.run(
      w.id,
      r.rule,
      r.cat,
      status,
      note,
      status === 'FAIL' ? r.severity : (status === 'WARNING' ? 'MEDIUM' : 'LOW'),
      (idx * 3) % 45 + 1
    );
    totalComp++;

    // Pair with a contractor for contractor_performance
    if (contractorIdx < allContractors.length && idx < 12) {
      const c = allContractors[contractorIdx % allContractors.length];
      contractorIdx++;

      const isProblematic = (idx % 5 === 0);
      const delay = isProblematic ? Math.floor(Math.random() * 75) + 30 : Math.floor(Math.random() * 20);
      const perfScore = isProblematic ? Math.floor(Math.random() * 25) + 35 : Math.floor(Math.random() * 35) + 65;
      const qualScore = Math.min(100, Math.floor(perfScore * 0.9 + Math.random() * 10));
      const costVar = isProblematic ? Math.round((Math.random() * 20 + 5) * 10) / 10 : Math.round((Math.random() * 4) * 10) / 10;
      const status = (perfScore < 50) ? 'Delayed' : (perfScore < 75 ? 'In Progress' : 'Completed');
      
      const remarks = isProblematic
        ? 'Notice issued under Rule 6.2 for unauthorized milestone delays and variance.'
        : 'Satisfactory construction velocity; quality audit reports verified by district technical cell.';

      insertPerf.run(
        c.contractor_id,
        w.id,
        status,
        delay,
        qualScore,
        perfScore,
        costVar,
        perfScore < 40 ? 1 : 0,
        isProblematic ? 1 : 0,
        remarks,
        (idx * 4) % 60 + 2
      );
      totalPerf++;
    }
  });
}

db.exec('COMMIT');

console.log(`✅ Successfully seeded ${totalComp} compliance_results across all ${states.length} states.`);
console.log(`✅ Successfully seeded ${totalPerf} contractor_performance records.`);
console.log('--- Seeding Completed Successfully ---');
