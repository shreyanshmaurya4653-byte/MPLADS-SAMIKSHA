/**
 * Script to clean out all dummy works, projects, and assessments
 * from both SQLite (database/mplads.db) and Supabase PostgreSQL.
 * Keeps States (36), Districts (787), Constituencies (543), Roles, and Users intact.
 */
const { Client } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();

const sqliteDbPath = path.resolve(__dirname, '../database/mplads.db');
const sqliteDb = new DatabaseSync(sqliteDbPath);

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearSqlite() {
  console.log('\n--- 1. Clearing Dummy Data from SQLite ---');
  const tablesToClear = [
    'risk_assessments',
    'risk_results',
    'expenditures',
    'payments',
    'progress_updates',
    'alerts',
    'anomalies',
    'duplicate_matches',
    'compliance_results',
    'verification_cases',
    'contractor_performance',
    'contractors',
    'sanctions',
    'assets',
    'documents',
    'model_runs',
    'data_ingestion_logs',
    'data_sources',
    'audit_logs',
    'works',
    'projects'
  ];

  for (const tbl of tablesToClear) {
    try {
      sqliteDb.exec(`DELETE FROM ${tbl};`);
      console.log(`- Cleared ${tbl}`);
    } catch (e) {
      console.log(`- Table ${tbl} not present or skipped: ${e.message}`);
    }
  }
  console.log('✅ SQLite dummy data cleared.');
}

async function clearSupabase() {
  console.log('\n--- 2. Clearing Dummy Data from Supabase PostgreSQL ---');
  await pgClient.connect();
  console.log('Connected to Supabase PostgreSQL...');

  const tables = [
    'risk_assessments',
    'risk_results',
    'expenditures',
    'payments',
    'progress_updates',
    'alerts',
    'anomalies',
    'duplicate_matches',
    'compliance_results',
    'verification_cases',
    'contractor_performance',
    'contractors',
    'sanctions',
    'assets',
    'documents',
    'model_runs',
    'data_ingestion_logs',
    'data_sources',
    'audit_logs',
    'works',
    'projects'
  ];

  for (const tbl of tables) {
    try {
      await pgClient.query(`TRUNCATE TABLE public.${tbl} CASCADE;`);
      console.log(`- Truncated ${tbl}`);
    } catch (e) {
      console.log(`- Notice on ${tbl}: ${e.message}`);
    }
  }

  // Reset projects project_id sequence if exists
  try {
    await pgClient.query("SELECT setval(pg_get_serial_sequence('projects', 'project_id'), 1, false);");
  } catch (e) {}

  console.log('✅ Supabase PostgreSQL dummy data cleared.');

  // Verify counts
  const resWorks = await pgClient.query('SELECT count(*) FROM works');
  const resProjects = await pgClient.query('SELECT count(*) FROM projects');
  const resStates = await pgClient.query('SELECT count(*) FROM states');
  const resDistricts = await pgClient.query('SELECT count(*) FROM districts');
  const resConsts = await pgClient.query('SELECT count(*) FROM constituencies');

  console.log('\n--- 3. Post-Clear Verification ---');
  console.log(`Works: ${resWorks.rows[0].count}`);
  console.log(`Projects: ${resProjects.rows[0].count}`);
  console.log(`States (Master intact): ${resStates.rows[0].count}`);
  console.log(`Districts (Master intact): ${resDistricts.rows[0].count}`);
  console.log(`Constituencies (Master intact): ${resConsts.rows[0].count}`);

  await pgClient.end();
}

async function main() {
  await clearSqlite();
  await clearSupabase();
  console.log('\n🎉 Database reset complete: Ready for clean real user uploads!');
}

main().catch(err => {
  console.error('Failed to clear dummy data:', err);
  process.exit(1);
});
