const { Client } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
require('dotenv').config();

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sqliteDb = new DatabaseSync(path.resolve(__dirname, '../database/mplads.db'));

async function seed() {
  await pgClient.connect();
  console.log('Connected to Supabase PostgreSQL for seeding...');

  // 1. Seed Roles
  console.log('Seeding roles...');
  await pgClient.query(`
    INSERT INTO roles (role_id, role_name, description) VALUES
    (1, 'Admin', 'MoSPI Central Ministry System Administrator'),
    (2, 'Ministry', 'Joint Secretary / MoSPI Central Administrative Oversight'),
    (3, 'State', 'Principal Secretary / State Nodal Planning Officer'),
    (4, 'District', 'District Magistrate & Collector / DRDA Authority'),
    (5, 'MP', 'Honble Member of Parliament (Lok Sabha / Rajya Sabha)')
    ON CONFLICT (role_name) DO NOTHING;
  `);

  // 2. Seed States from SQLite
  console.log('Seeding states...');
  const states = sqliteDb.prepare('SELECT * FROM states').all();
  for (const s of states) {
    await pgClient.query(`
      INSERT INTO states (state_id, state_name, state_code)
      VALUES ($1, $2, $3)
      ON CONFLICT (state_id) DO UPDATE SET state_name = EXCLUDED.state_name, state_code = EXCLUDED.state_code;
    `, [s.state_id || s.id, s.state_name || s.name, s.state_code || s.code || 'IN']);
  }
  await pgClient.query("SELECT setval(pg_get_serial_sequence('states', 'state_id'), (SELECT MAX(state_id) FROM states));");

  // 3. Seed Districts from SQLite
  console.log('Seeding districts...');
  const districts = sqliteDb.prepare('SELECT * FROM districts').all();
  for (const d of districts) {
    await pgClient.query(`
      INSERT INTO districts (district_id, state_id, district_name, district_code)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (district_id) DO UPDATE SET district_name = EXCLUDED.district_name;
    `, [d.district_id || d.id, d.state_id, d.district_name || d.name, d.district_code || d.code || 'DIST']);
  }
  await pgClient.query("SELECT setval(pg_get_serial_sequence('districts', 'district_id'), (SELECT MAX(district_id) FROM districts));");

  // 4. Seed Constituencies from SQLite
  console.log('Seeding constituencies...');
  const consts = sqliteDb.prepare('SELECT * FROM constituencies').all();
  for (const c of consts) {
    await pgClient.query(`
      INSERT INTO constituencies (constituency_id, state_id, district_id, constituency_name, constituency_number, house_type, mp_name, mp_party)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (constituency_id) DO UPDATE SET
        constituency_name = EXCLUDED.constituency_name,
        mp_name = EXCLUDED.mp_name,
        mp_party = EXCLUDED.mp_party;
    `, [
      c.constituency_id || c.id,
      c.state_id || 1,
      c.district_id || 1,
      c.constituency_name || c.name,
      c.constituency_number || 1,
      c.house_type || 'Lok Sabha',
      c.mp_name || 'Honble Member of Parliament',
      c.mp_party || 'Independent'
    ]);
  }
  await pgClient.query("SELECT setval(pg_get_serial_sequence('constituencies', 'constituency_id'), (SELECT MAX(constituency_id) FROM constituencies));");

  // 5. Seed Users
  console.log('Seeding users...');
  const users = [
    { username: 'mp', email: 'mp@mplads.gov.in', full_name: 'Shri Rajesh Kumar Sharma', role_id: 5, state_id: 1, district_id: 1, constituency_id: 1 },
    { username: 'district', email: 'district@mplads.gov.in', full_name: 'Smt. Priya Verma', role_id: 4, state_id: 1, district_id: 1, constituency_id: null },
    { username: 'state', email: 'state@mplads.gov.in', full_name: 'Dr. Suresh Singh', role_id: 3, state_id: 1, district_id: null, constituency_id: null },
    { username: 'ministry', email: 'ministry@mplads.gov.in', full_name: 'Shri Ananya Krishnan', role_id: 2, state_id: null, district_id: null, constituency_id: null }
  ];
  for (const u of users) {
    await pgClient.query(`
      INSERT INTO users (username, email, password_hash, full_name, role_id, state_id, district_id, constituency_id, is_active)
      VALUES ($1, $2, crypt('password', gen_salt('bf')), $3, $4, $5, $6, $7, true)
      ON CONFLICT (email) DO NOTHING;
    `, [u.username, u.email, u.full_name, u.role_id, u.state_id, u.district_id, u.constituency_id]);
  }

  // 6. Seed Implementing Agencies
  console.log('Seeding implementing agencies...');
  const agencies = [
    'Public Works Department (PWD)',
    'Rural Engineering Department (RED)',
    'Jal Nigam / Rural Water Authority',
    'District Urban Development Agency (DUDA)',
    'DRDA Planning Cell'
  ];
  for (let i = 0; i < agencies.length; i++) {
    await pgClient.query(`
      INSERT INTO implementing_agencies (agency_id, state_id, district_id, agency_name, agency_type)
      VALUES ($1, 1, 1, $2, 'GOVERNMENT')
      ON CONFLICT (agency_id) DO NOTHING;
    `, [i + 1, agencies[i]]);
  }

  // 7. Seed Sample Projects / Works from SQLite
  console.log('Seeding projects...');
  const projects = sqliteDb.prepare('SELECT * FROM works LIMIT 150').all();
  for (const p of projects) {
    await pgClient.query(`
      INSERT INTO projects (
        project_code, project_name, description, category, state_id, district_id, constituency_id,
        implementing_agency_name, estimated_cost, sanctioned_amount, released_amount, expenditure_amount,
        physical_progress, payment_utilization, start_date, expected_completion_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (project_code) DO NOTHING;
    `, [
      p.id,
      p.title || 'Civic Infrastructure Project',
      p.description || 'Community asset development project under MPLADS',
      p.category || 'Civic Amenities',
      p.state_id || 1,
      p.district_id || 1,
      p.constituency_id || 1,
      p.implementing_agency || 'Public Works Department (PWD)',
      p.estimated_cost || 1000000,
      p.sanctioned_amount || 1000000,
      p.released_amount || 0,
      p.expenditure || 0,
      p.physical_progress || 0,
      p.payment_utilization || 0,
      p.start_date || '2024-06-01',
      p.expected_completion || '2024-12-01',
      p.status || 'Sanctioned'
    ]);
  }

  console.log('✅ Supabase database successfully seeded with baseline governance master data!');
  await pgClient.end();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
