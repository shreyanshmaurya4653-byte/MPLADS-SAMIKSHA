const { Client } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
  console.log('Public Tables in Supabase (' + res.rows.length + '):');
  console.log(res.rows.map(r => r.table_name));
  await client.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
