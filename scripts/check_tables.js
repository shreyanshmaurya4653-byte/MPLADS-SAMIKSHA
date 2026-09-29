require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });
const { getDb, getPgPool } = require('../backend/src/config/database');

async function main() {
  const db = getDb();
  console.log('=== SQLITE TABLES ===');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  for (const t of tables) {
    try {
      const row = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get();
      console.log(t.name.padEnd(30), row.c);
    } catch (e) {
      console.log(t.name.padEnd(30), 'Error:', e.message);
    }
  }

  const pool = getPgPool();
  if (pool) {
    console.log('\n=== SUPABASE PG TABLES ===');
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    for (const r of res.rows) {
      try {
        const countRes = await pool.query(`SELECT count(*) as c FROM "${r.table_name}"`);
        console.log(r.table_name.padEnd(30), countRes.rows[0].c);
      } catch (e) {
        console.log(r.table_name.padEnd(30), 'Error:', e.message);
      }
    }
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
