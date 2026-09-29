/**
 * Master Seeder: Injects all 36 States & UTs, 787 Districts, and 543 Lok Sabha Constituencies
 * into BOTH SQLite (database/mplads.db) and Cloud Supabase PostgreSQL.
 */
const { Client } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();

const { states, districts, constituencies } = require('./data/indiaJurisdictionData');

const sqliteDbPath = path.resolve(__dirname, '../database/mplads.db');
const sqliteDb = new DatabaseSync(sqliteDbPath);

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedSqlite() {
  console.log('\n--- 1. Seeding SQLite Database ---');
  
  // Ensure columns in SQLite
  try {
    sqliteDb.exec("ALTER TABLE constituencies ADD COLUMN house_type TEXT DEFAULT 'Lok Sabha';");
  } catch (e) {
    // Already exists
  }
  try {
    sqliteDb.exec("ALTER TABLE constituencies ADD COLUMN constituency_number INTEGER;");
  } catch (e) {
    // Already exists
  }

  // 1. States
  console.log(`Seeding ${states.length} States into SQLite...`);
  const insertState = sqliteDb.prepare(`
    INSERT INTO states (state_id, id, state_name, name, state_code, code)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (state_id) DO UPDATE SET
      state_name = excluded.state_name,
      name = excluded.name,
      state_code = excluded.state_code,
      code = excluded.code;
  `);
  for (const s of states) {
    insertState.run(s.id, s.id, s.name, s.name, s.code, s.code);
  }

  // 2. Districts
  console.log(`Seeding ${districts.length} Districts into SQLite...`);
  const insertDist = sqliteDb.prepare(`
    INSERT INTO districts (district_id, id, state_id, district_name, name, district_code)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (district_id) DO UPDATE SET
      district_name = excluded.district_name,
      name = excluded.name,
      state_id = excluded.state_id,
      district_code = excluded.district_code;
  `);
  for (const d of districts) {
    insertDist.run(d.id, d.id, d.state_id, d.name, d.name, d.code);
  }

  // 3. Constituencies
  console.log(`Seeding ${constituencies.length} Constituencies into SQLite...`);
  const insertConst = sqliteDb.prepare(`
    INSERT INTO constituencies (constituency_id, id, state_id, district_id, constituency_name, name, constituency_number, mp_name, mp_party, house_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (constituency_id) DO UPDATE SET
      constituency_name = excluded.constituency_name,
      name = excluded.name,
      district_id = excluded.district_id,
      state_id = excluded.state_id,
      mp_name = excluded.mp_name,
      mp_party = excluded.mp_party,
      house_type = excluded.house_type,
      constituency_number = excluded.constituency_number;
  `);
  for (const c of constituencies) {
    insertConst.run(c.id, c.id, c.state_id, c.district_id, c.name, c.name, String(c.constituency_number), c.mp_name, c.mp_party, c.house_type);
  }

  console.log('✅ SQLite seeding complete.');
}

async function seedSupabase() {
  console.log('\n--- 2. Seeding Cloud Supabase PostgreSQL ---');
  await pgClient.connect();
  console.log('Connected to Supabase PostgreSQL...');

  // Ensure columns in Supabase
  await pgClient.query(`
    ALTER TABLE public.constituencies ADD COLUMN IF NOT EXISTS house_type VARCHAR(50) DEFAULT 'Lok Sabha';
    ALTER TABLE public.constituencies ADD COLUMN IF NOT EXISTS constituency_number INTEGER;
  `);

  const batchSize = 50;

  // 1. States in Supabase
  console.log(`Upserting ${states.length} States into Supabase...`);
  const stateValues = [];
  const stateParams = [];
  let sIdx = 1;
  for (const s of states) {
    stateValues.push(`($${sIdx++}, $${sIdx++}, $${sIdx++})`);
    stateParams.push(s.id, s.name, s.code);
  }
  await pgClient.query(`
    INSERT INTO states (state_id, state_name, state_code)
    VALUES ${stateValues.join(', ')}
    ON CONFLICT (state_id) DO UPDATE SET
      state_name = EXCLUDED.state_name,
      state_code = EXCLUDED.state_code;
  `, stateParams);

  // 2. Districts in Supabase (Batch insertion)
  console.log(`Upserting ${districts.length} Districts into Supabase...`);
  for (let i = 0; i < districts.length; i += batchSize) {
    const chunk = districts.slice(i, i + batchSize);
    const distValues = [];
    const distParams = [];
    let dIdx = 1;
    for (const d of chunk) {
      distValues.push(`($${dIdx++}, $${dIdx++}, $${dIdx++}, $${dIdx++})`);
      distParams.push(d.id, d.state_id, d.name, d.code);
    }
    await pgClient.query(`
      INSERT INTO districts (district_id, state_id, district_name, district_code)
      VALUES ${distValues.join(', ')}
      ON CONFLICT (district_id) DO UPDATE SET
        district_name = EXCLUDED.district_name,
        district_code = EXCLUDED.district_code,
        state_id = EXCLUDED.state_id;
    `, distParams);
  }

  // 3. Constituencies in Supabase (Batch insertion)
  console.log(`Upserting ${constituencies.length} Constituencies into Supabase...`);
  for (let i = 0; i < constituencies.length; i += batchSize) {
    const chunk = constituencies.slice(i, i + batchSize);
    const constValues = [];
    const constParams = [];
    let cIdx = 1;
    for (const c of chunk) {
      constValues.push(`($${cIdx++}, $${cIdx++}, $${cIdx++}, $${cIdx++}, $${cIdx++}, $${cIdx++}, $${cIdx++}, $${cIdx++})`);
      constParams.push(c.id, c.state_id, c.district_id, c.name, c.constituency_number, c.house_type, c.mp_name, c.mp_party);
    }
    await pgClient.query(`
      INSERT INTO constituencies (constituency_id, state_id, district_id, constituency_name, constituency_number, house_type, mp_name, mp_party)
      VALUES ${constValues.join(', ')}
      ON CONFLICT (constituency_id) DO UPDATE SET
        constituency_name = EXCLUDED.constituency_name,
        constituency_number = EXCLUDED.constituency_number,
        district_id = EXCLUDED.district_id,
        state_id = EXCLUDED.state_id,
        house_type = EXCLUDED.house_type,
        mp_name = EXCLUDED.mp_name,
        mp_party = EXCLUDED.mp_party;
    `, constParams);
  }

  // Set serial sequence counters
  await pgClient.query("SELECT setval(pg_get_serial_sequence('states', 'state_id'), (SELECT COALESCE(MAX(state_id), 1) FROM states));");
  await pgClient.query("SELECT setval(pg_get_serial_sequence('districts', 'district_id'), (SELECT COALESCE(MAX(district_id), 1) FROM districts));");
  await pgClient.query("SELECT setval(pg_get_serial_sequence('constituencies', 'constituency_id'), (SELECT COALESCE(MAX(constituency_id), 1) FROM constituencies));");

  console.log('✅ Supabase PostgreSQL seeding complete.');

  // Verification
  console.log('\n--- 3. Verifying Record Counts ---');
  const sRes = await pgClient.query('SELECT count(*) FROM states');
  const dRes = await pgClient.query('SELECT count(*) FROM districts');
  const cRes = await pgClient.query('SELECT count(*) FROM constituencies');
  console.log(`Supabase States: ${sRes.rows[0].count}`);
  console.log(`Supabase Districts: ${dRes.rows[0].count}`);
  console.log(`Supabase Constituencies: ${cRes.rows[0].count}`);

  await pgClient.end();
}

async function main() {
  await seedSqlite();
  await seedSupabase();
  console.log('\n🎉 ALL INDIA JURISDICTION SEEDING COMPLETED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Fatal error during seeding:', err);
  process.exit(1);
});
