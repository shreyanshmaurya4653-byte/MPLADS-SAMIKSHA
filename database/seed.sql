-- ==========================================================
-- MPLADS SEED DATA
-- ==========================================================

-- States
INSERT INTO states (id, name, code) VALUES
(1, 'Andhra Pradesh', 'AP'),
(2, 'Arunachal Pradesh', 'AR'),
(3, 'Assam', 'AS'),
(4, 'Bihar', 'BR'),
(5, 'Chhattisgarh', 'CG'),
(6, 'Goa', 'GA'),
(7, 'Gujarat', 'GJ'),
(8, 'Haryana', 'HR'),
(9, 'Himachal Pradesh', 'HP'),
(10, 'Jharkhand', 'JH'),
(11, 'Karnataka', 'KA'),
(12, 'Kerala', 'KL'),
(13, 'Madhya Pradesh', 'MP'),
(14, 'Maharashtra', 'MH'),
(15, 'Manipur', 'MN'),
(16, 'Meghalaya', 'ML'),
(17, 'Mizoram', 'MZ'),
(18, 'Nagaland', 'NL'),
(19, 'Odisha', 'OD'),
(20, 'Punjab', 'PB'),
(21, 'Rajasthan', 'RJ'),
(22, 'Sikkim', 'SK'),
(23, 'Tamil Nadu', 'TN'),
(24, 'Telangana', 'TS'),
(25, 'Tripura', 'TR'),
(26, 'Uttar Pradesh', 'UP'),
(27, 'Uttarakhand', 'UK'),
(28, 'West Bengal', 'WB'),
(29, 'Andaman and Nicobar Islands', 'AN'),
(30, 'Chandigarh', 'CH'),
(31, 'Dadra and Nagar Haveli and Daman and Diu', 'DH'),
(32, 'Delhi', 'DL'),
(33, 'Jammu and Kashmir', 'JK'),
(34, 'Ladakh', 'LA'),
(35, 'Lakshadweep', 'LD'),
(36, 'Puducherry', 'PY')
ON CONFLICT (id) DO NOTHING;

-- Districts
INSERT INTO districts (id, name, state_id) VALUES
(1, 'Central District', 1),
(2, 'Lucknow', 1),
(3, 'Kanpur', 1),
(4, 'Varanasi', 1),
(5, 'Agra', 1),
(6, 'Patna', 2),
(7, 'Jaipur', 3),
(8, 'Pune', 4)
ON CONFLICT (id) DO NOTHING;

-- Constituencies
INSERT INTO constituencies (id, name, district_id, state_id, mp_name, mp_party, house_type) VALUES
(1, 'Central Constituency', 1, 1, 'Shri Rajesh Kumar Sharma', 'BJP', 'Lok Sabha'),
(2, 'Lucknow North', 2, 1, 'Dr. Neha Verma', 'BJP', 'Lok Sabha'),
(3, 'Kanpur South', 3, 1, 'Shri Amit Shukla', 'INC', 'Lok Sabha'),
(4, 'Varanasi East', 4, 1, 'Smt. Ananya Krishnan', 'BJP', 'Lok Sabha')
ON CONFLICT (id) DO NOTHING;

-- Users (Pass: mp123, dist123, state123, min123 - bcrypt hashed)
-- bcrypt hash for 'mp123' / 'dist123' / 'state123' / 'min123'
INSERT INTO users (id, name, email, password_hash, role, state_id, district_id, constituency_id, avatar) VALUES
(1, 'Shri Rajesh Kumar Sharma', 'mp@mplads.gov.in', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'MP', 1, 1, 1, 'RK'),
(2, 'Smt. Priya Verma', 'district@mplads.gov.in', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'District', 1, 1, NULL, 'PV'),
(3, 'Dr. Suresh Singh', 'state@mplads.gov.in', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'State', 1, NULL, NULL, 'SS'),
(4, 'Shri Ananya Krishnan', 'ministry@mplads.gov.in', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ministry', NULL, NULL, NULL, 'AK')
ON CONFLICT (id) DO NOTHING;

-- Works
INSERT INTO works (id, title, description, category, constituency_id, district_id, state_id, implementing_agency, estimated_cost, sanctioned_amount, released_amount, expenditure, physical_progress, payment_utilization, start_date, expected_completion, actual_completion, status) VALUES
('P1001', 'Community Hall Construction', 'Construction of multipurpose community center with solar lighting', 'Community Infrastructure', 1, 1, 1, 'Public Works Department (PWD)', 2000000.00, 2000000.00, 2000000.00, 1800000.00, 55.00, 90.00, '2024-01-15', '2024-07-15', NULL, 'Delayed'),
('P1002', 'Rural Road Construction – Sector 4', 'Bituminous surfacing and drainage on 1.8km rural village artery', 'Roads & Connectivity', 1, 1, 1, 'Rural Engineering Dept', 1000000.00, 1000000.00, 1000000.00, 1000000.00, 100.00, 100.00, '2023-06-01', '2023-12-01', '2024-01-20', 'Completed'),
('P1003', 'Drinking Water Facility – Village Karchhana', 'Installation of high-capacity RO plant, overhead tank and distribution pipe', 'Water & Sanitation', 1, 1, 1, 'Jal Jeevan Mission Unit', 1500000.00, 1500000.00, 750000.00, 400000.00, 28.00, 53.33, '2024-03-10', '2024-09-10', NULL, 'Ongoing'),
('P1004', 'Street Light Installation – Ward 12', 'LED smart street pole infrastructure across residential colony', 'Urban Infrastructure', 1, 1, 1, 'Municipal Corporation Development Authority', 500000.00, 500000.00, 500000.00, 920000.00, 90.00, 184.00, '2024-02-01', '2024-05-01', NULL, 'Delayed'),
('P1005', 'Primary School Building Repair', 'Roofing, sanitation blocks and boundary wall strengthening', 'Education', 1, 1, 1, 'Basic Education Department', 800000.00, 800000.00, 800000.00, 795000.00, 98.00, 99.38, '2024-01-01', '2024-04-01', '2024-04-15', 'Completed'),
('P1006', 'Community Hall Construction – Sector B', 'Hall development with recreation amenities', 'Community Infrastructure', 2, 2, 1, 'Public Works Department (PWD)', 1950000.00, 2000000.00, 1900000.00, 1850000.00, 60.00, 92.50, '2024-01-20', '2024-07-20', NULL, 'Delayed'),
('P1007', 'Village Road Repair – Kanpur Rural', 'Interlocking tile road construction on interior village paths', 'Roads & Connectivity', 3, 3, 1, 'Rural Engineering Dept', 2500000.00, 2500000.00, 2500000.00, 2490000.00, 95.00, 99.60, '2023-09-01', '2024-03-01', '2024-03-28', 'Completed'),
('P1008', 'Medical Sub-Centre Renovation', 'Clinic refurbishment and emergency equipment procurement', 'Health', 4, 4, 1, 'District Health Society', 1200000.00, 1200000.00, 600000.00, 580000.00, 45.00, 48.33, '2024-04-01', '2024-10-01', NULL, 'Ongoing'),
('P1009', 'Drainage System – Ward 7', 'Storm water concrete culvert and drainage network construction', 'Water & Sanitation', 3, 3, 1, 'Municipal Corporation Kanpur', 700000.00, 700000.00, 700000.00, 1190000.00, 40.00, 170.00, '2024-02-15', '2024-06-15', NULL, 'Delayed')
ON CONFLICT (id) DO NOTHING;

-- Risk Assessments
INSERT INTO risk_assessments (work_id, risk_score, risk_level, cost_risk, delay_risk, payment_risk, duplicate_risk, compliance_risk, anomalies_json) VALUES
('P1001', 84.00, 'High', 78.00, 88.00, 92.00, 20.00, 65.00, '["COST_OVERRUN", "PROGRESS_PAYMENT_MISMATCH", "DELAY"]'),
('P1002', 18.00, 'Low', 10.00, 15.00, 12.00, 5.00, 10.00, '[]'),
('P1003', 42.00, 'Medium', 20.00, 55.00, 30.00, 10.00, 25.00, '["DELAY"]'),
('P1004', 91.00, 'High', 95.00, 75.00, 94.00, 15.00, 80.00, '["COST_OVERRUN", "EXPENDITURE_SPIKE"]'),
('P1005', 12.00, 'Low', 5.00, 10.00, 8.00, 5.00, 5.00, '[]'),
('P1006', 79.00, 'High', 60.00, 82.00, 85.00, 85.00, 55.00, '["PROGRESS_PAYMENT_MISMATCH", "POSSIBLE_DUPLICATE", "DELAY"]'),
('P1007', 20.00, 'Low', 12.00, 18.00, 15.00, 5.00, 10.00, '[]'),
('P1008', 30.00, 'Low', 15.00, 22.00, 20.00, 8.00, 15.00, '[]'),
('P1009', 88.00, 'High', 92.00, 86.00, 90.00, 25.00, 75.00, '["COST_OVERRUN", "EXPENDITURE_SPIKE", "DELAY"]')
ON CONFLICT (work_id) DO NOTHING;

-- Alerts
INSERT INTO alerts (id, work_id, alert_type, severity, title, description, status) VALUES
('A001', 'P1004', 'COST_OVERRUN', 'High', 'Critical Cost Overrun Detected', 'Expenditure (₹9.2L) exceeds sanctioned budget (₹5L) by 84% while physical progress remains at 90%.', 'Pending'),
('A002', 'P1009', 'EXPENDITURE_SPIKE', 'High', 'Severe Fund Spike on Incomplete Work', 'Disbursement of ₹11.9L against sanctioned ₹7L (70% deviation) with only 40% physical completion.', 'Under Review'),
('A003', 'P1001', 'PROGRESS_PAYMENT_MISMATCH', 'High', 'Payment-to-Physical Progress Misalignment', '90% of sanctioned funds disbursed while field progress stands stagnant at 55%.', 'Pending'),
('A004', 'P1006', 'POSSIBLE_DUPLICATE', 'High', 'Potential Duplicate Work Proposal', 'High lexical and geospatial similarity (85%) with project P1001 executed by the same agency.', 'Pending'),
('A005', 'P1003', 'DELAY', 'Medium', 'Milestone Delay Risk', 'Executing work has exceeded expected timeframe by 3 months with 28% completion.', 'Pending')
ON CONFLICT (id) DO NOTHING;

-- Verification Cases
INSERT INTO verification_cases (id, work_id, alert_id, assigned_officer, status, officer_remarks, action_taken) VALUES
('VC001', 'P1004', 'A001', 'District Monitoring Officer', 'Pending', NULL, NULL),
('VC002', 'P1009', 'A002', 'District Officer Kanpur', 'Under Review', 'Material purchase receipts verified. Awaiting audit report on foundation expansion.', 'Notice issued to executive engineer'),
('VC003', 'P1001', 'A003', 'District Monitoring Officer', 'Action Required', 'Site inspection confirms structure incomplete despite 90% disbursement.', 'Show-cause notice served to contractor'),
('VC004', 'P1006', 'A004', 'District Officer Lucknow', 'Pending', NULL, NULL),
('VC005', 'P1003', 'A005', 'District Monitoring Officer', 'No Issue Found', 'Delay attributed to heavy seasonal rainfall. Work has resumed under revised timeline.', 'Extension granted to Dec 2024')
ON CONFLICT (id) DO NOTHING;
