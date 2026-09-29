require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });
const { getPgPool } = require('../backend/src/config/database');
const pool = getPgPool();

async function check() {
  const tables = ['contractors', 'projects', 'users', 'risk_results', 'permissions', 'role_permissions'];
  for (const t of tables) {
    const cols = await pool.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
      [t]
    );
    console.log(`\n--- ${t} ---`);
    console.log(cols.rows.map(r => `  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`).join('\n'));
  }
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
