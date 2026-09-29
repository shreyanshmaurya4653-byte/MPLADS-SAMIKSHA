require('dotenv').config({ path: './backend/.env' });
const { getDb } = require('../config/database');

const db = getDb();
db.exec(`
  DROP TABLE IF EXISTS contractors;
  CREATE TABLE contractors (
    contractor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    contractor_name VARCHAR(300) UNIQUE,
    contractor_type VARCHAR(150) DEFAULT 'Works Contractor',
    total_works INTEGER DEFAULT 0,
    total_expenditure NUMERIC(18,2) DEFAULT 0,
    risk_score REAL DEFAULT 15.0,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  DROP TABLE IF EXISTS expenditures;
  CREATE TABLE expenditures (
    expenditure_id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id VARCHAR(50),
    amount NUMERIC(18,2) DEFAULT 0,
    expenditure_date DATE,
    month_name VARCHAR(20),
    vendor_name VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'Disbursed',
    ida TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  DROP TABLE IF EXISTS alerts;
  CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER,
    work_id VARCHAR(50),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    title VARCHAR(250) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_exp_work ON expenditures(work_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_work ON alerts(work_id);
`);

console.log('✔ SQLite tables contractors, expenditures, alerts refreshed with correct schemas.');
