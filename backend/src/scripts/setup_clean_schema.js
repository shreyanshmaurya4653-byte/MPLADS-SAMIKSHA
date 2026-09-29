require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');
const { getDb } = require('../config/database');

async function setupCleanSchema() {
  console.log('=== Setting up Clean Database Architecture in SQLite & Supabase ===');

  // 1. SQLite Setup
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenditures (
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

    CREATE TABLE IF NOT EXISTS contractors (
      contractor_id INTEGER PRIMARY KEY AUTOINCREMENT,
      contractor_name VARCHAR(300) UNIQUE,
      contractor_type VARCHAR(150) DEFAULT 'Works Contractor',
      total_works INTEGER DEFAULT 0,
      total_expenditure NUMERIC(18,2) DEFAULT 0,
      risk_score REAL DEFAULT 15.0,
      status VARCHAR(50) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alerts (
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
    CREATE INDEX IF NOT EXISTS idx_works_state ON works(state_id);
    CREATE INDEX IF NOT EXISTS idx_works_district ON works(district_id);
    CREATE INDEX IF NOT EXISTS idx_works_constituency ON works(constituency_id);
  `);
  console.log('✔ SQLite tables verified.');

  // 2. Supabase PostgreSQL Setup
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
      await pool.query(`
        -- Add work_id to alerts if missing
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerts' AND column_name = 'work_id') THEN
            ALTER TABLE public.alerts ADD COLUMN work_id VARCHAR(50);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerts' AND column_name = 'description') THEN
            ALTER TABLE public.alerts ADD COLUMN description TEXT;
          END IF;
        END $$;

        -- Create expenditures table if not exists
        CREATE TABLE IF NOT EXISTS public.expenditures (
          expenditure_id SERIAL PRIMARY KEY,
          work_id VARCHAR(50),
          amount NUMERIC(18,2) DEFAULT 0,
          expenditure_date DATE,
          month_name VARCHAR(20),
          vendor_name VARCHAR(255),
          payment_status VARCHAR(50) DEFAULT 'Disbursed',
          ida TEXT,
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create contractors table if not exists
        CREATE TABLE IF NOT EXISTS public.contractors (
          contractor_id SERIAL PRIMARY KEY,
          contractor_name VARCHAR(300) UNIQUE,
          contractor_type VARCHAR(150) DEFAULT 'Works Contractor',
          total_works INTEGER DEFAULT 0,
          total_expenditure NUMERIC(18,2) DEFAULT 0,
          risk_score REAL DEFAULT 15.0,
          status VARCHAR(50) DEFAULT 'Active',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_pg_exp_work ON public.expenditures(work_id);
        CREATE INDEX IF NOT EXISTS idx_pg_alerts_work ON public.alerts(work_id);
        CREATE INDEX IF NOT EXISTS idx_pg_works_state ON public.works(state_id);
        CREATE INDEX IF NOT EXISTS idx_pg_works_district ON public.works(district_id);
        CREATE INDEX IF NOT EXISTS idx_pg_works_constituency ON public.works(constituency_id);
      `);
      console.log('✔ Supabase tables and indexes verified.');
    } catch (e) {
      console.error('Supabase schema setup error:', e.message);
    } finally {
      await pool.end();
    }
  }
  console.log('=== Schema Setup Complete ===');
}

setupCleanSchema();
