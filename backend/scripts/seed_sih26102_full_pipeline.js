const { getDb } = require('../src/config/database');
const db = getDb();

console.log('=== Seeding SIH 26102 Investigation, Evidence, Payments & Audit Trail ===');

// 1. Ensure Columns
try { db.exec("ALTER TABLE verification_cases ADD COLUMN priority VARCHAR(20) DEFAULT 'HIGH'"); } catch(e){}
try { db.exec("ALTER TABLE verification_cases ADD COLUMN evidence_checklist TEXT"); } catch(e){}
try { db.exec("ALTER TABLE verification_cases ADD COLUMN case_number VARCHAR(50)"); } catch(e){}
try { db.exec("ALTER TABLE documents ADD COLUMN work_id VARCHAR(50)"); } catch(e){}
try { db.exec("ALTER TABLE documents ADD COLUMN image_hash VARCHAR(64)"); } catch(e){}
try { db.exec("ALTER TABLE documents ADD COLUMN gps_coords VARCHAR(100)"); } catch(e){}
try { db.exec("ALTER TABLE documents ADD COLUMN ocr_summary TEXT"); } catch(e){}
try { db.exec("ALTER TABLE payments ADD COLUMN physical_progress_at_payment NUMERIC(5,2)"); } catch(e){}
try { db.exec("ALTER TABLE payments ADD COLUMN is_flagged BOOLEAN DEFAULT 0"); } catch(e){}
try { db.exec("ALTER TABLE payments ADD COLUMN flag_reason TEXT"); } catch(e){}

// 2. Fetch top 30 High Risk / Flagged works from database
const flaggedWorks = db.prepare(`
  SELECT w.id, w.title, w.sanctioned_amount, w.expenditure, w.physical_progress, w.status,
         w.state_id, w.district_id, w.constituency_id, w.implementing_agency,
         r.risk_score, r.risk_level
  FROM works w
  LEFT JOIN risk_assessments r ON w.id = r.work_id
  WHERE (r.risk_score >= 70 OR (w.expenditure >= w.sanctioned_amount * 0.85 AND w.physical_progress < 40))
  LIMIT 30
`).all();

console.log(`Found ${flaggedWorks.length} high-risk benchmark works for case creation.`);

// 3. Seed Investigation Cases
db.exec("DELETE FROM verification_cases");
const insertCase = db.prepare(`
  INSERT INTO verification_cases (
    case_number, work_id, alert_id, assigned_officer, assigned_to,
    status, priority, findings, officer_remarks, action_taken,
    evidence_checklist, verified_at, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'), datetime('now', '-' || ? || ' days'))
`);

const officers = [
  "Shri Rajeshwar Singh (Chief Vigilance Officer)",
  "Smt. Ananya Roy (District Inspection Director)",
  "Er. Vikram Rathore (Superintending Engineer)",
  "Shri D.K. Venkataraman (State Technical Auditor)",
  "Dr. Sunita Deshmukh (Finance Vigilance Officer)"
];

const statuses = [
  "IN_REVIEW", "FIELD_INSPECTION", "SHOWCAUSE_ISSUED", "RECOVERY_INITIATED", "RESOLVED", "OPEN"
];

const caseFindings = [
  "Disbursement velocity exceeds physical milestone completion by 48%. Physical foundation incomplete while 85% fund drawn.",
  "Possible duplicate scope detected with existing State PWD road asset within 350 meters radius.",
  "Contractor billed for Grade-A cement and steel, but field inspection core samples show non-compliant materials.",
  "Unutilized fund idle for 14 months after release without mandatory technical sanction revision.",
  "Payment released without verified geo-tagged photograph on ISRO Bhuvan portal (Rule 5.1 breach).",
  "Severe timeline delay of 180 days with only 25% physical progress. Contractor issued show-cause notice under Rule 6.2."
];

let caseCount = 0;
flaggedWorks.slice(0, 20).forEach((w, idx) => {
  const caseNum = `CASE #INV-${1000 + idx + 1}`;
  const officer = officers[idx % officers.length];
  const st = statuses[idx % statuses.length];
  const finding = caseFindings[idx % caseFindings.length];
  const priority = (w.risk_score >= 80 || idx % 2 === 0) ? "CRITICAL" : "HIGH";
  const daysAgo = (idx * 3) + 2;

  const checklist = JSON.stringify([
    { item: "Sanction Letter & Administrative Approval", verified: true, date: "2024-05-10" },
    { item: "Measurement Book (MB) Entry Copy", verified: idx % 2 === 0, date: idx % 2 === 0 ? "2024-07-12" : null },
    { item: "Geotagged High-Resolution Field Photos", verified: st !== "OPEN", date: "2024-08-01" },
    { item: "RTGS Bank Payment Transaction Vouchers", verified: true, date: "2024-06-20" },
    { item: "Utilization Certificate (Form 12-A)", verified: st === "RESOLVED", date: st === "RESOLVED" ? "2024-09-01" : null }
  ]);

  insertCase.run(
    caseNum,
    w.id,
    idx + 101,
    officer,
    officer.split(" ")[1] || "Officer",
    st,
    priority,
    finding,
    `Field team dispatched under order Vigilance/2026/0${idx+1}. Case prioritized for biometric verification.`,
    st === "SHOWCAUSE_ISSUED" ? "Notice served under MPLADS Guidelines Para 6.2" : (st === "RECOVERY_INITIATED" ? "Recovery notice issued to executing agency" : "Under field engineering audit"),
    checklist,
    daysAgo,
    daysAgo + 5
  );
  caseCount++;
});
console.log(`Seeded ${caseCount} verification_cases.`);

// 4. Seed Documents & Evidence
db.exec("DELETE FROM documents");
const insertDoc = db.prepare(`
  INSERT INTO documents (
    work_id, project_id, document_type, document_title, file_url,
    file_size_bytes, mime_type, verification_status, image_hash, gps_coords, ocr_summary, uploaded_by, uploaded_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
`);

const docTypes = [
  { type: "SANCTION_ORDER", title: "Administrative & Financial Sanction Order", mime: "application/pdf" },
  { type: "SITE_PHOTO_GEO", title: "ISRO Bhuvan Geotagged Milestone Photo", mime: "image/jpeg" },
  { type: "UTILIZATION_CERT", title: "Provisional Utilization Certificate (Form 12-A)", mime: "application/pdf" },
  { type: "MEASUREMENT_BOOK", title: "Executive Engineer MB Inspection Record", mime: "application/pdf" },
  { type: "PAYMENT_BILL", title: "Contractor Stage-2 Billing Voucher", mime: "application/pdf" }
];

let docCount = 0;
flaggedWorks.slice(0, 15).forEach((w, idx) => {
  docTypes.forEach((dt, dIdx) => {
    const isSuspicious = (idx % 3 === 0 && dt.type === "SITE_PHOTO_GEO");
    const hash = `SHA256-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const lat = (25.4358 + (idx * 0.05)).toFixed(6);
    const lng = (81.8463 + (idx * 0.05)).toFixed(6);
    const daysAgo = (idx * 2) + dIdx + 1;

    insertDoc.run(
      w.id,
      parseInt(w.id.replace(/\D/g, '') || idx + 100),
      dt.type,
      `${dt.title} - ${w.id}`,
      `/evidence/${w.id}_${dt.type.toLowerCase()}.pdf`,
      Math.floor(Math.random() * 800000) + 150000,
      dt.mime,
      isSuspicious ? "FLAGGED" : "VERIFIED",
      hash,
      `${lat}° N, ${lng}° E`,
      `OCR Text Extracted: Work ID ${w.id}, Sanctioned ₹${(w.sanctioned_amount/100000).toFixed(1)}L, Verified by District Vigilance Officer.`,
      officers[idx % officers.length],
      daysAgo
    );
    docCount++;
  });
});
console.log(`Seeded ${docCount} documents.`);

// 5. Seed Payments with Milestone Analysis
db.exec("DELETE FROM payments");
const insertPayment = db.prepare(`
  INSERT INTO payments (
    work_id, project_id, contractor_id, agency_name, payment_reference,
    reference_number, payment_date, amount, payment_type, payment_mode,
    payment_status, status, physical_progress_at_payment, is_flagged, flag_reason,
    approved_by, entered_by, remarks, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, date('now', '-' || ? || ' days'), ?, ?, ?, 'COMPLETED', 'Success', ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
`);

let payCount = 0;
flaggedWorks.slice(0, 20).forEach((w, idx) => {
  const totalSanc = parseFloat(w.sanctioned_amount || 2000000);
  const stages = [
    { name: "Mobilization Advance", pct: 0.20, progressAt: 5, flagged: false },
    { name: "Plinth & Foundation Stage", pct: 0.35, progressAt: 20, flagged: false },
    { name: "Superstructure Phase Release", pct: 0.30, progressAt: 25, flagged: true, reason: "Payment exceeds physical milestone completion by 45%" }
  ];

  stages.forEach((stg, sIdx) => {
    const amt = Math.round(totalSanc * stg.pct);
    const daysAgo = 100 - (sIdx * 30);
    const ref = `PFMS/2026/RTGS-${100000 + idx * 10 + sIdx}`;

    insertPayment.run(
      w.id,
      parseInt(w.id.replace(/\D/g, '') || idx + 100),
      (idx % 10) + 11,
      w.implementing_agency || "Public Works Department",
      ref,
      ref,
      daysAgo,
      amt,
      stg.name,
      "Direct Benefit RTGS / PFMS",
      stg.progressAt,
      stg.flagged ? 1 : 0,
      stg.flagged ? stg.reason : null,
      "District Magistrate / Nodal Officer",
      "Treasury Accounts Officer",
      `Milestone release for ${w.id}`,
      daysAgo
    );
    payCount++;
  });
});
console.log(`Seeded ${payCount} payments.`);

// 6. Seed Audit Logs
db.exec("DELETE FROM audit_logs");
const insertAudit = db.prepare(`
  INSERT INTO audit_logs (
    user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' hours'))
`);

const auditActions = [
  { action: "OFFICER_LOGIN", type: "AUTH", id: "USR-001", old: null, nw: "Role: District Authority, Jurisdiction: Bareilly" },
  { action: "ANOMALY_FLAGGED", type: "AI_RISK", id: "W306547", old: "Score: 32", nw: "Score: 88.5 (Disbursement velocity mismatch)" },
  { action: "INVESTIGATION_CREATED", type: "CASE", id: "CASE #INV-1001", old: null, nw: "Status: ASSIGNED to CVO Rajeshwar Singh" },
  { action: "EVIDENCE_UPLOADED", type: "DOCUMENT", id: "DOC-2041", old: null, nw: "Geotagged site photograph with GPS 28.3670° N" },
  { action: "STATUS_UPDATE", type: "CASE", id: "CASE #INV-1001", old: "Status: ASSIGNED", nw: "Status: FIELD_INSPECTION" },
  { action: "NOTICE_ISSUED", type: "ENFORCEMENT", id: "CASE #INV-1002", old: null, nw: "Show-cause notice served under MPLADS Para 6.2" },
  { action: "REPORT_DOWNLOADED", type: "REPORT", id: "REP-2026-09", old: null, nw: "District Vigilance Risk Dossier (PDF)" },
  { action: "RECOVERY_INITIATED", type: "FINANCE", id: "W254417", old: "Outstanding: ₹3.48L", nw: "Demand draft recovery initiated" }
];

let logCount = 0;
for (let i = 0; i < 30; i++) {
  const item = auditActions[i % auditActions.length];
  const user = officers[i % officers.length].split(" ")[1] || "Admin";
  insertAudit.run(
    user,
    item.action,
    item.type,
    item.id,
    item.old,
    item.nw,
    `10.244.18.${10 + i}`,
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MPLADS-Secure-Portal/2.0",
    i * 3 + 1
  );
  logCount++;
}
console.log(`Seeded ${logCount} audit_logs.`);
console.log('=== All SIH 26102 Tables Seeded Successfully ===');
