-- ==========================================================
-- MPLADS AI MONITORING DATABASE SCHEMA (PostgreSQL / SQLite)
-- ==========================================================

-- States Master Table
CREATE TABLE IF NOT EXISTS states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10)
);

-- Districts Master Table
CREATE TABLE IF NOT EXISTS districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state_id INTEGER REFERENCES states(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subdivisions (Tehsils / Blocks of District)
CREATE TABLE IF NOT EXISTS subdivisions (
    subdivision_id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    subdivision_name VARCHAR(100) NOT NULL,
    subdivision_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS constituencies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    state_id INTEGER REFERENCES states(id) ON DELETE CASCADE,
    mp_name VARCHAR(150),
    mp_party VARCHAR(50),
    house_type VARCHAR(20) DEFAULT 'Lok Sabha'
);

-- Users & RBAC Profiles
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'MP', 'District', 'State', 'Ministry', 'Admin'
    state_id INTEGER REFERENCES states(id),
    district_id INTEGER REFERENCES districts(id),
    constituency_id INTEGER REFERENCES constituencies(id),
    avatar VARCHAR(10) DEFAULT 'US',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MPLADS Development Works Table
CREATE TABLE IF NOT EXISTS works (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'Roads', 'Water & Sanitation', 'Education', 'Health', etc.
    constituency_id INTEGER REFERENCES constituencies(id),
    district_id INTEGER REFERENCES districts(id),
    subdivision VARCHAR(100),
    state_id INTEGER REFERENCES states(id),
    implementing_agency VARCHAR(150) NOT NULL,
    estimated_cost NUMERIC(15, 2) NOT NULL,
    sanctioned_amount NUMERIC(15, 2) NOT NULL,
    released_amount NUMERIC(15, 2) DEFAULT 0,
    expenditure NUMERIC(15, 2) DEFAULT 0,
    physical_progress NUMERIC(5, 2) DEFAULT 0, -- 0.00 to 100.00
    payment_utilization NUMERIC(5, 2) DEFAULT 0,
    start_date DATE,
    expected_completion DATE,
    actual_completion DATE,
    status VARCHAR(50) DEFAULT 'Sanctioned', -- 'Sanctioned', 'Ongoing', 'Completed', 'Delayed', 'Suspended'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Milestone & Progress Updates Audit
CREATE TABLE IF NOT EXISTS progress_updates (
    id SERIAL PRIMARY KEY,
    work_id VARCHAR(50) REFERENCES works(id) ON DELETE CASCADE,
    progress_percentage NUMERIC(5, 2) NOT NULL,
    expected_progress NUMERIC(5, 2),
    inspection_date DATE NOT NULL,
    inspector_name VARCHAR(150),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial Payments & Disbursements
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    work_id VARCHAR(50) REFERENCES works(id) ON DELETE CASCADE,
    agency_name VARCHAR(150) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'RTGS',
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Disbursed'
);

-- Monthly Expenditure Logs
CREATE TABLE IF NOT EXISTS expenditures (
    id SERIAL PRIMARY KEY,
    work_id VARCHAR(50) REFERENCES works(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    month_name VARCHAR(20) NOT NULL, -- 'Jan', 'Feb', etc.
    expenditure_date DATE NOT NULL,
    description TEXT
);

-- AI Risk Assessments
CREATE TABLE IF NOT EXISTS risk_assessments (
    id SERIAL PRIMARY KEY,
    work_id VARCHAR(50) REFERENCES works(id) ON DELETE CASCADE UNIQUE,
    risk_score NUMERIC(5, 2) NOT NULL, -- 0.00 to 100.00
    risk_level VARCHAR(20) NOT NULL,   -- 'Low', 'Medium', 'High'
    cost_risk NUMERIC(5, 2) DEFAULT 0,
    delay_risk NUMERIC(5, 2) DEFAULT 0,
    payment_risk NUMERIC(5, 2) DEFAULT 0,
    duplicate_risk NUMERIC(5, 2) DEFAULT 0,
    compliance_risk NUMERIC(5, 2) DEFAULT 0,
    anomalies_json TEXT,              -- Serialized JSON array of flags
    model_version VARCHAR(50) DEFAULT 'v1.4-ensemble',
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated Risk Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(50) PRIMARY KEY,
    work_id VARCHAR(50) REFERENCES works(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL, -- 'COST_OVERRUN', 'EXPENDITURE_SPIKE', 'PROGRESS_PAYMENT_MISMATCH', 'POSSIBLE_DUPLICATE', 'DELAY'
    severity VARCHAR(20) NOT NULL,    -- 'Low', 'Medium', 'High'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Under Review', 'Action Required', 'Resolved', 'Dismissed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification Cases (Human-in-the-Loop Audit)
CREATE TABLE IF NOT EXISTS verification_cases (
    id VARCHAR(50) PRIMARY KEY,
    work_id VARCHAR(50) REFERENCES works(id) ON DELETE CASCADE,
    alert_id VARCHAR(50) REFERENCES alerts(id),
    assigned_officer VARCHAR(150),
    status VARCHAR(50) DEFAULT 'Pending',
    officer_remarks TEXT,
    action_taken TEXT,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_works_district ON works(district_id);
CREATE INDEX IF NOT EXISTS idx_works_constituency ON works(constituency_id);
CREATE INDEX IF NOT EXISTS idx_works_state ON works(state_id);
CREATE INDEX IF NOT EXISTS idx_works_status ON works(status);
CREATE INDEX IF NOT EXISTS idx_alerts_work ON alerts(work_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_risk_score ON risk_assessments(risk_score);
