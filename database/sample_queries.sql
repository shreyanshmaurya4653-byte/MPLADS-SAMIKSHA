-- ==========================================================
-- MPLADS ANALYTICAL AND AUDIT QUERIES
-- ==========================================================

-- 1. Identify Top 5 Works with Severe Cost Overrun (> 20% deviation)
SELECT 
    w.id,
    w.title,
    w.sanctioned_amount,
    w.expenditure,
    ROUND(((w.expenditure - w.sanctioned_amount) / w.sanctioned_amount) * 100, 2) AS overrun_percentage,
    r.risk_score,
    r.risk_level
FROM works w
JOIN risk_assessments r ON w.id = r.work_id
WHERE w.expenditure > w.sanctioned_amount
ORDER BY overrun_percentage DESC
LIMIT 5;

-- 2. Detect Payment-to-Progress Mismatches (Fund Disbursement > 80% with Physical Progress < 60%)
SELECT 
    w.id,
    w.title,
    w.implementing_agency,
    w.payment_utilization,
    w.physical_progress,
    (w.payment_utilization - w.physical_progress) AS progress_gap,
    w.status
FROM works w
WHERE w.payment_utilization >= 80.00 AND w.physical_progress <= 60.00
ORDER BY progress_gap DESC;

-- 3. Constituency-Level Fund Utilization Summary
SELECT 
    c.name AS constituency_name,
    c.mp_name,
    COUNT(w.id) AS total_works,
    SUM(w.sanctioned_amount) AS total_sanctioned,
    SUM(w.expenditure) AS total_spent,
    ROUND((SUM(w.expenditure) / SUM(w.sanctioned_amount)) * 100, 2) AS utilization_rate,
    COUNT(CASE WHEN r.risk_level = 'High' THEN 1 END) AS high_risk_count
FROM constituencies c
LEFT JOIN works w ON c.id = w.constituency_id
LEFT JOIN risk_assessments r ON w.id = r.work_id
GROUP BY c.id, c.name, c.mp_name;

-- 4. Open High-Priority Human Verification Cases
SELECT 
    vc.id AS case_id,
    w.id AS work_id,
    w.title,
    a.title AS alert_title,
    a.severity,
    vc.assigned_officer,
    vc.status
FROM verification_cases vc
JOIN works w ON vc.work_id = w.id
JOIN alerts a ON vc.alert_id = a.id
WHERE vc.status IN ('Pending', 'Under Review', 'Action Required')
ORDER BY vc.created_at DESC;
