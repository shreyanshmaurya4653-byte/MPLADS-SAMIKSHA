require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkCols() {
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'alerts' AND table_schema = 'public'
  `);
  console.log('Supabase alerts columns:', res.rows);
  
  const worksCols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'works' AND table_schema = 'public'
  `);
  console.log('Supabase works columns:', worksCols.rows);

  await pool.end();
}
checkCols();
