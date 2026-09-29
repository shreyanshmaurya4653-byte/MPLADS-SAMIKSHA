require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

async function fixConstraints() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await pool.query(`
      ALTER TABLE public.alerts ALTER COLUMN message DROP NOT NULL;
    `);
    console.log('✔ Supabase alerts table message NOT NULL constraint dropped.');
  } catch (err) {
    console.error('Constraint fix error:', err.message);
  } finally {
    await pool.end();
  }
}

fixConstraints();
