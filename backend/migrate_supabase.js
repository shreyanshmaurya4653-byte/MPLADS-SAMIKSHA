const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Connecting to Supabase...');
  await client.connect();
  console.log('Connected!');

  const sqlPath = path.resolve(__dirname, '../database/supabase_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`Executing schema migration from ${sqlPath}...`);
  await client.query(sql);
  console.log('Schema migration executed successfully!');

  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
  console.log(`\n🎉 Success! Created ${res.rows.length} tables in Supabase public schema:`);
  console.log(res.rows.map(r => r.table_name));

  await client.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
