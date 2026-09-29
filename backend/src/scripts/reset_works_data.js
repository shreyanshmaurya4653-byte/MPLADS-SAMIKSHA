require('dotenv').config({ path: './backend/.env' });
const { getDb } = require('../config/database');
const { Pool } = require('pg');

async function resetWorksData() {
  console.log('--- Resetting previous single-state works data ---');
  
  // 1. SQLite
  const db = getDb();
  db.exec(`
    DELETE FROM works;
    DELETE FROM projects;
    DELETE FROM risk_assessments;
    DELETE FROM expenditures;
    DELETE FROM contractors;
    DELETE FROM alerts;
  `);
  console.log('✔ SQLite tables cleared.');

  // 2. Supabase
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
      await pool.query(`
        TRUNCATE TABLE public.works CASCADE;
        TRUNCATE TABLE public.projects CASCADE;
        TRUNCATE TABLE public.risk_assessments CASCADE;
        TRUNCATE TABLE public.expenditures CASCADE;
        TRUNCATE TABLE public.contractors CASCADE;
        TRUNCATE TABLE public.alerts CASCADE;
      `);
      console.log('✔ Supabase tables truncated.');
    } catch (e) {
      console.error('Supabase truncate error:', e.message);
    } finally {
      await pool.end();
    }
  }
  console.log('--- Reset Complete ---');
}

resetWorksData();
