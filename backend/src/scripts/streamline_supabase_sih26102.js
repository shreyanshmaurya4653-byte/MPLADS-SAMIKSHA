/**
 * Streamline Supabase Database schema strictly for SIH26102 problem statement:
 * - Drop legacy empty scaffold tables
 * - Ensure core operational tables: states, districts, constituencies, works, projects, risk_assessments, alerts, roles, users, permissions, role_permissions
 * - Ensure house_type ('Lok Sabha' / 'Rajya Sabha') and mp_name exist on works & constituencies
 * - Populate Rajya Sabha members (245 seats) alongside Lok Sabha members (543 seats)
 */
const { Client } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const sqliteDbPath = path.resolve(__dirname, '../../../database/mplads.db');
const sqliteDb = new DatabaseSync(sqliteDbPath);

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Rajya Sabha allocation by State according to Fourth Schedule of Constitution of India
const RS_STATE_SEATS = [
  { state: 'Andhra Pradesh', seats: 11 },
  { state: 'Arunachal Pradesh', seats: 1 },
  { state: 'Assam', seats: 7 },
  { state: 'Bihar', seats: 16 },
  { state: 'Chhattisgarh', seats: 5 },
  { state: 'Goa', seats: 1 },
  { state: 'Gujarat', seats: 11 },
  { state: 'Haryana', seats: 5 },
  { state: 'Himachal Pradesh', seats: 3 },
  { state: 'Jharkhand', seats: 6 },
  { state: 'Karnataka', seats: 12 },
  { state: 'Kerala', seats: 9 },
  { state: 'Madhya Pradesh', seats: 11 },
  { state: 'Maharashtra', seats: 19 },
  { state: 'Manipur', seats: 1 },
  { state: 'Meghalaya', seats: 1 },
  { state: 'Mizoram', seats: 1 },
  { state: 'Nagaland', seats: 1 },
  { state: 'Odisha', seats: 10 },
  { state: 'Punjab', seats: 7 },
  { state: 'Rajasthan', seats: 10 },
  { state: 'Sikkim', seats: 1 },
  { state: 'Tamil Nadu', seats: 18 },
  { state: 'Telangana', seats: 7 },
  { state: 'Tripura', seats: 1 },
  { state: 'Uttar Pradesh', seats: 31 },
  { state: 'Uttarakhand', seats: 3 },
  { state: 'West Bengal', seats: 16 },
  { state: 'Delhi', seats: 3 },
  { state: 'Jammu and Kashmir', seats: 4 },
  { state: 'Puducherry', seats: 1 },
  { state: 'Nominated', seats: 12 }
];

// Sample prominent Rajya Sabha MPs across states
const RS_SAMPLE_MPS = [
  { name: 'Dr. S. Jaishankar', state: 'Gujarat', party: 'BJP' },
  { name: 'Shri Jagat Prakash Nadda', state: 'Gujarat', party: 'BJP' },
  { name: 'Shri Mallikarjun Kharge', state: 'Karnataka', party: 'INC' },
  { name: 'Smt. Nirmala Sitharaman', state: 'Karnataka', party: 'BJP' },
  { name: 'Shri Piyush Goyal', state: 'Maharashtra', party: 'BJP' },
  { name: 'Shri Sharad Pawar', state: 'Maharashtra', party: 'NCP-SP' },
  { name: 'Dr. Manmohan Singh', state: 'Rajasthan', party: 'INC' },
  { name: 'Shri Derek O\'Brien', state: 'West Bengal', party: 'AITC' },
  { name: 'Shri Raghav Chadha', state: 'Punjab', party: 'AAP' },
  { name: 'Shri Sanjay Singh', state: 'Delhi', party: 'AAP' },
  { name: 'Smt. Jaya Bachchan', state: 'Uttar Pradesh', party: 'SP' },
  { name: 'Dr. Sudhanshu Trivedi', state: 'Uttar Pradesh', party: 'BJP' },
  { name: 'Shri Tiruchi Siva', state: 'Tamil Nadu', party: 'DMK' },
  { name: 'Shri John Brittas', state: 'Kerala', party: 'CPI(M)' },
  { name: 'Shri Harivansh Narayan Singh', state: 'Bihar', party: 'JD(U)' },
  { name: 'Dr. Sasmit Patra', state: 'Odisha', party: 'BJD' },
  { name: 'Dr. K. Laxman', state: 'Uttar Pradesh', party: 'BJP' },
  { name: 'Shri Pramod Tiwari', state: 'Rajasthan', party: 'INC' },
  { name: 'Smt. Sudha Murty', state: 'Nominated', party: 'Nominated' },
  { name: 'Shri Ranjan Gogoi', state: 'Nominated', party: 'Nominated' },
  { name: 'Shri Mahesh Jethmalani', state: 'Nominated', party: 'Nominated' },
  { name: 'Smt. P. T. Usha', state: 'Nominated', party: 'Nominated' }
];

async function main() {
  console.log('=== Step 1: Streamlining Supabase for SIH26102 ===');
  await pgClient.connect();

  const legacyTables = [
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
    'duplicate_matches',
    'anomalies',
    'payments',
    'progress_updates',
    'departments',
    'implementing_agencies',
    'expenditures'
  ];

  for (const tbl of legacyTables) {
    try {
      await pgClient.query(`DROP TABLE IF EXISTS public.${tbl} CASCADE;`);
      console.log(`- Dropped legacy table: ${tbl}`);
    } catch (e) {
      console.log(`- Notice on ${tbl}: ${e.message}`);
    }
  }

  // Ensure works has necessary SIH26102 columns
  console.log('\n--- Verifying works & projects schema in Supabase ---');
  await pgClient.query(`
    ALTER TABLE public.works 
    ADD COLUMN IF NOT EXISTS house_type VARCHAR(50) DEFAULT 'Lok Sabha',
    ADD COLUMN IF NOT EXISTS mp_name VARCHAR(255);
  `);

  await pgClient.query(`
    ALTER TABLE public.constituencies 
    ADD COLUMN IF NOT EXISTS house_type VARCHAR(50) DEFAULT 'Lok Sabha';
  `);

  // Update existing 543 constituencies to ensure house_type = 'Lok Sabha'
  await pgClient.query(`UPDATE public.constituencies SET house_type = 'Lok Sabha' WHERE house_type IS NULL OR house_type = '';`);

  // Ensure SQLite also has the columns
  try {
    sqliteDb.exec(`ALTER TABLE works ADD COLUMN house_type TEXT DEFAULT 'Lok Sabha';`);
  } catch (e) {}
  try {
    sqliteDb.exec(`ALTER TABLE works ADD COLUMN mp_name TEXT;`);
  } catch (e) {}
  try {
    sqliteDb.exec(`ALTER TABLE constituencies ADD COLUMN house_type TEXT DEFAULT 'Lok Sabha';`);
  } catch (e) {}

  console.log('\n--- Step 2: Populating Rajya Sabha Master Representation ---');
  // Check how many RS members exist
  const rsCountRes = await pgClient.query(`SELECT count(*) FROM public.constituencies WHERE house_type = 'Rajya Sabha'`);
  let rsCount = parseInt(rsCountRes.rows[0].count, 10);
  console.log(`Current Rajya Sabha records in Supabase: ${rsCount}`);

  if (rsCount !== 245) {
    console.log('Resetting Rajya Sabha records to exact 245 constitutional seats...');
    await pgClient.query(`DELETE FROM public.constituencies WHERE house_type = 'Rajya Sabha'`);
    try {
      sqliteDb.exec(`DELETE FROM constituencies WHERE house_type = 'Rajya Sabha'`);
    } catch (e) {}
    
    // Get max constituency_id
    const maxCidRes = await pgClient.query(`SELECT COALESCE(MAX(constituency_id), 543) as max_id FROM public.constituencies`);
    let currentId = parseInt(maxCidRes.rows[0].max_id, 10);

    // Fetch state map
    const statesRes = await pgClient.query(`SELECT state_id, state_name FROM public.states`);
    const stateMap = {};
    for (const r of statesRes.rows) {
      stateMap[r.state_name.toLowerCase().trim()] = r.state_id;
    }

    let rsRecords = [];
    let sampleIdx = 0;

    for (const item of RS_STATE_SEATS) {
      const sName = item.state;
      const sId = stateMap[sName.toLowerCase().trim()] || 1; // Default to 1 if Nominated

      for (let seat = 1; seat <= item.seats; seat++) {
        currentId++;
        let mpName = `Hon'ble MP (Rajya Sabha, ${sName} Seat ${seat})`;
        let party = 'Independent / Multi-Party';

        // Check if we have sample named MP for this state
        const namedMp = RS_SAMPLE_MPS.find(m => m.state.toLowerCase() === sName.toLowerCase() && !rsRecords.some(r => r.mp_name === m.name));
        if (namedMp) {
          mpName = namedMp.name;
          party = namedMp.party;
        }

        const cName = `${sName} (Rajya Sabha Seat ${seat})`;
        const cNum = `RS-${sName.slice(0, 3).toUpperCase()}-${seat}`;

        rsRecords.push({
          constituency_id: currentId,
          state_id: sId,
          district_id: null,
          constituency_name: cName,
          constituency_number: cNum,
          mp_name: mpName,
          mp_party: party,
          house_type: 'Rajya Sabha'
        });
      }
    }

    console.log(`Generated ${rsRecords.length} Rajya Sabha members. Inserting into Supabase in batch...`);
    // Insert into SQLite first
    const insertSqlite = sqliteDb.prepare(`
      INSERT INTO constituencies (
        constituency_id, state_id, district_id, constituency_name, constituency_number, mp_name, mp_party, house_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(constituency_id) DO UPDATE SET
        house_type = excluded.house_type,
        mp_name = excluded.mp_name,
        mp_party = excluded.mp_party;
    `);

    for (const rec of rsRecords) {
      try {
        insertSqlite.run(
          rec.constituency_id,
          rec.state_id,
          rec.district_id,
          rec.constituency_name,
          rec.constituency_number,
          rec.mp_name,
          rec.mp_party,
          rec.house_type
        );
      } catch (e) {}
    }

    // Insert into Supabase in chunks of 50 using multi-row SQL
    const chunkSize = 50;
    for (let i = 0; i < rsRecords.length; i += chunkSize) {
      const chunk = rsRecords.slice(i, i + chunkSize);
      const valPlaceholders = [];
      const params = [];
      let pIdx = 1;

      for (const rec of chunk) {
        valPlaceholders.push(`($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4}, $${pIdx + 5}, $${pIdx + 6}, $${pIdx + 7})`);
        params.push(rec.constituency_id, rec.state_id, rec.district_id, rec.constituency_name, rec.constituency_number, rec.mp_name, rec.mp_party, rec.house_type);
        pIdx += 8;
      }

      const sql = `
        INSERT INTO public.constituencies (
          constituency_id, state_id, district_id, constituency_name, constituency_number, mp_name, mp_party, house_type
        ) VALUES ${valPlaceholders.join(', ')}
        ON CONFLICT (constituency_id) DO UPDATE SET
          house_type = EXCLUDED.house_type,
          mp_name = EXCLUDED.mp_name,
          mp_party = EXCLUDED.mp_party;
      `;
      await pgClient.query(sql, params);
      console.log(`- Inserted chunk ${i + 1} to ${Math.min(i + chunkSize, rsRecords.length)}`);
    }
    console.log(`✅ Successfully added ${rsRecords.length} Rajya Sabha members!`);
  }

  // Final verification
  console.log('\n--- Final Verification ---');
  const lsRes = await pgClient.query(`SELECT count(*) FROM public.constituencies WHERE house_type = 'Lok Sabha'`);
  const rsRes = await pgClient.query(`SELECT count(*) FROM public.constituencies WHERE house_type = 'Rajya Sabha'`);
  const tablesRes = await pgClient.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`);

  console.log(`Lok Sabha Members (Constituencies): ${lsRes.rows[0].count}`);
  console.log(`Rajya Sabha Members (State Quotas): ${rsRes.rows[0].count}`);
  console.log('Public Tables remaining in Supabase:', tablesRes.rows.map(r => r.table_name));

  await pgClient.end();
  console.log('\n🚀 SIH26102 Streamlined Schema & Parliamentary Houses Setup Complete!');
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
