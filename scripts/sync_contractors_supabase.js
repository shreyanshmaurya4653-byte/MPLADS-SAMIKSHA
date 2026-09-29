require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });
const { getDb, getPgPool } = require('../backend/src/config/database');

async function syncContractors() {
  const db = getDb();
  const pool = getPgPool();
  if (!pool) {
    console.error('No Supabase pool');
    process.exit(1);
  }

  const contractors = db.prepare('SELECT contractor_id, contractor_name, contractor_type, total_works, total_expenditure, risk_score, status FROM contractors').all();
  console.log(`Found ${contractors.length} contractors in SQLite.`);

  const BATCH_SIZE = 1000;
  for (let i = 0; i < contractors.length; i += BATCH_SIZE) {
    const chunk = contractors.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    let p = 1;

    for (const c of chunk) {
      params.push(
        c.contractor_id,
        String(c.contractor_name || 'Vendor / Agency').substring(0, 290),
        String(c.contractor_type || 'Works Contractor').substring(0, 140),
        c.total_works || 0,
        c.total_expenditure || 0,
        c.risk_score || 15.0,
        String(c.status || 'Active').substring(0, 45)
      );
      values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
    }

    const sql = `
      INSERT INTO contractors (contractor_id, contractor_name, contractor_type, total_works, total_expenditure, risk_score, status)
      VALUES ${values.join(', ')}
      ON CONFLICT (contractor_id) DO UPDATE SET
        contractor_name = EXCLUDED.contractor_name,
        total_works = EXCLUDED.total_works,
        total_expenditure = EXCLUDED.total_expenditure,
        risk_score = EXCLUDED.risk_score;
    `;

    try {
      await pool.query(sql, params);
      console.log(`Synced ${i + chunk.length} / ${contractors.length} contractors to Supabase.`);
    } catch (e) {
      console.error(`Error syncing chunk ${i}:`, e.message);
    }
  }

  console.log('Contractor sync complete.');
  process.exit(0);
}

syncContractors().catch(e => {
  console.error(e);
  process.exit(1);
});
