require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });
const { getDb, getPgPool } = require('../backend/src/config/database');

async function syncPerms() {
  const db = getDb();
  const pool = getPgPool();

  const perms = db.prepare('SELECT * FROM permissions').all();
  for (const p of perms) {
    try {
      await pool.query(
        'INSERT INTO permissions (permission_id, permission_name, description, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
        [p.permission_id, p.permission_name, p.description]
      );
    } catch (e) {
      console.warn('Perm insert error:', e.message);
    }
  }

  const rperms = db.prepare('SELECT * FROM role_permissions').all();
  for (const rp of rperms) {
    try {
      await pool.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [rp.role_id, rp.permission_id]
      );
    } catch (e) {
      console.warn('Role-Perm insert error:', e.message);
    }
  }

  const pCount = await pool.query('SELECT count(*) FROM permissions');
  const rpCount = await pool.query('SELECT count(*) FROM role_permissions');
  console.log(`Supabase Permissions: ${pCount.rows[0].count}, Role Permissions: ${rpCount.rows[0].count}`);
  process.exit(0);
}

syncPerms().catch(e => {
  console.error(e);
  process.exit(1);
});
