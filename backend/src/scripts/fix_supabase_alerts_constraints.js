require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

async function fixSeverityCheck() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await pool.query(`
      ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_severity_check;
      ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_status_check;
    `);
    console.log('✔ Supabase alerts constraints dropped.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixSeverityCheck();
