require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Supabase tables in public schema:');
    for (const row of res.rows) {
      try {
        const c = await pool.query(`SELECT count(1) as cnt FROM "${row.table_name}"`);
        console.log(`  ${row.table_name}: ${c.rows[0].cnt} rows`);
      } catch (err) {
        console.log(`  ${row.table_name}: error ${err.message}`);
      }
    }
  } catch (e) {
    console.error('Supabase query error:', e.message);
  } finally {
    await pool.end();
  }
}

check();
