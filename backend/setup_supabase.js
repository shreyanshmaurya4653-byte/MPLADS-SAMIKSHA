const { Client } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
require('dotenv').config();

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sqliteDb = new DatabaseSync(path.resolve(__dirname, '../database/mplads.db'));

async function main() {
  await pgClient.connect();
  console.log('Connected to Supabase PostgreSQL...');

  // 1. Add house_type to constituencies if missing and loosen varchar limits
  console.log('Ensuring columns & auxiliary tables...');
  await pgClient.query(`
    ALTER TABLE public.constituencies ADD COLUMN IF NOT EXISTS house_type VARCHAR(50) DEFAULT 'Lok Sabha';
    ALTER TABLE public.projects ALTER COLUMN project_name TYPE TEXT;
    ALTER TABLE public.projects ALTER COLUMN category TYPE TEXT;
    ALTER TABLE public.projects ALTER COLUMN implementing_agency_name TYPE TEXT;
  `);

  // 2. Create risk_assessments table in Supabase if missing
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS public.risk_assessments (
      assessment_id BIGSERIAL PRIMARY KEY,
      work_id VARCHAR(100) NOT NULL,
      risk_score NUMERIC(5,2) NOT NULL DEFAULT 15.0,
      risk_level VARCHAR(50) NOT NULL DEFAULT 'Low',
      delay_probability NUMERIC(5,2) DEFAULT 10.0,
      cost_overrun_risk NUMERIC(5,2) DEFAULT 15.0,
      progress_gap_score NUMERIC(5,2) DEFAULT 10.0,
      agency_concentration_score NUMERIC(5,2) DEFAULT 15.0,
      duplicate_risk_score NUMERIC(5,2) DEFAULT 5.0,
      recommendations TEXT DEFAULT 'Initial baseline assessment: On track.',
      evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_risk_assessments_work_id ON public.risk_assessments(work_id);
  `);

  // 3. Create works compatibility table
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS public.works (
      id VARCHAR(100) PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      constituency_id BIGINT,
      district_id BIGINT,
      state_id BIGINT,
      implementing_agency TEXT,
      estimated_cost NUMERIC(18,2) DEFAULT 0,
      sanctioned_amount NUMERIC(18,2) DEFAULT 0,
      released_amount NUMERIC(18,2) DEFAULT 0,
      expenditure NUMERIC(18,2) DEFAULT 0,
      physical_progress NUMERIC(5,2) DEFAULT 0,
      payment_utilization NUMERIC(5,2) DEFAULT 0,
      start_date DATE,
      expected_completion DATE,
      actual_completion DATE,
      status VARCHAR(50) DEFAULT 'Sanctioned',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE public.works ALTER COLUMN title TYPE TEXT;
    ALTER TABLE public.works ALTER COLUMN category TYPE TEXT;
    ALTER TABLE public.works ALTER COLUMN implementing_agency TYPE TEXT;
  `);

  // 4. Seed Roles
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

  // 5. Seed States from SQLite
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

  // 6. Seed Districts from SQLite
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

  // 7. Seed Constituencies from SQLite
  console.log('Seeding constituencies...');
  const consts = sqliteDb.prepare('SELECT * FROM constituencies').all();
  for (const c of consts) {
    await pgClient.query(`
      INSERT INTO constituencies (constituency_id, state_id, district_id, constituency_name, constituency_number, house_type, mp_name, mp_party)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (constituency_id) DO UPDATE SET
        constituency_name = EXCLUDED.constituency_name,
        mp_name = EXCLUDED.mp_name,
        mp_party = EXCLUDED.mp_party,
        house_type = EXCLUDED.house_type;
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

  // 8. Seed Works from SQLite
  console.log('Syncing active works into Supabase in fast batches...');
  const isValidDate = (str) => typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str);
  
  const works = sqliteDb.prepare('SELECT * FROM works LIMIT 500').all();
  const batchSize = 50;

  for (let i = 0; i < works.length; i += batchSize) {
    const chunk = works.slice(i, i + batchSize);
    
    // Works batch
    const worksValues = [];
    const worksParams = [];
    let pIdx = 1;
    for (const w of chunk) {
      const sdate = isValidDate(w.start_date) ? w.start_date : '2024-06-01';
      const edate = isValidDate(w.expected_completion) ? w.expected_completion : '2024-12-01';
      const stateId = (Number(w.state_id) >= 1 && Number(w.state_id) <= 5) ? Number(w.state_id) : 1;
      const districtId = (Number(w.district_id) >= 1 && Number(w.district_id) <= 8) ? Number(w.district_id) : 1;
      const constId = (Number(w.constituency_id) >= 1 && Number(w.constituency_id) <= 8) ? Number(w.constituency_id) : 1;
      const estCost = Math.max(0, Number(w.estimated_cost) || 1000000);
      const sancAmt = Math.max(0, Number(w.sanctioned_amount) || 1000000);
      const relAmt = Math.max(0, Number(w.released_amount) || 0);
      const expAmt = Math.max(0, Number(w.expenditure) || 0);
      const physProg = Math.min(100, Math.max(0, Number(w.physical_progress) || 0));
      const payUtil = Math.min(100, Math.max(0, Number(w.payment_utilization) || 0));

      worksValues.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
      worksParams.push(
        w.id,
        w.title || 'Civic Infrastructure Project',
        w.description || 'Community asset development project under MPLADS',
        w.category || 'Civic Amenities',
        constId,
        districtId,
        stateId,
        w.implementing_agency || 'Public Works Department (PWD)',
        estCost,
        sancAmt,
        relAmt,
        expAmt,
        physProg,
        payUtil,
        sdate,
        edate,
        w.status || 'Sanctioned'
      );
    }

    await pgClient.query(`
      INSERT INTO works (
        id, title, description, category, constituency_id, district_id, state_id,
        implementing_agency, estimated_cost, sanctioned_amount, released_amount,
        expenditure, physical_progress, payment_utilization, start_date, expected_completion, status
      ) VALUES ${worksValues.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        sanctioned_amount = EXCLUDED.sanctioned_amount,
        expenditure = EXCLUDED.expenditure,
        physical_progress = EXCLUDED.physical_progress,
        payment_utilization = EXCLUDED.payment_utilization;
    `, worksParams);

    // Projects batch
    const projValues = [];
    const projParams = [];
    let prIdx = 1;
    for (const w of chunk) {
      const sdate = isValidDate(w.start_date) ? w.start_date : '2024-06-01';
      const edate = isValidDate(w.expected_completion) ? w.expected_completion : '2024-12-01';
      const stateId = (Number(w.state_id) >= 1 && Number(w.state_id) <= 5) ? Number(w.state_id) : 1;
      const districtId = (Number(w.district_id) >= 1 && Number(w.district_id) <= 8) ? Number(w.district_id) : 1;
      const constId = (Number(w.constituency_id) >= 1 && Number(w.constituency_id) <= 8) ? Number(w.constituency_id) : 1;
      const estCost = Math.max(0, Number(w.estimated_cost) || 1000000);
      const sancAmt = Math.max(0, Number(w.sanctioned_amount) || 1000000);
      const relAmt = Math.max(0, Number(w.released_amount) || 0);
      const expAmt = Math.max(0, Number(w.expenditure) || 0);

      let projectStatus = 'SANCTIONED';
      const stUpper = (w.status || '').toUpperCase();
      if (stUpper.includes('PROGRESS') || stUpper.includes('ONGOING')) projectStatus = 'ONGOING';
      else if (stUpper.includes('COMPLET')) projectStatus = 'COMPLETED';
      else if (stUpper.includes('DELAY')) projectStatus = 'DELAYED';
      else if (stUpper.includes('CANCEL')) projectStatus = 'CANCELLED';
      else if (stUpper.includes('SUSPEND')) projectStatus = 'SUSPENDED';
      else if (stUpper.includes('PROPOS')) projectStatus = 'PROPOSED';
      else if (stUpper.includes('REVIEW')) projectStatus = 'UNDER_REVIEW';
      else if (stUpper.includes('SANCTION')) projectStatus = 'SANCTIONED';

      projValues.push(`($${prIdx++}, $${prIdx++}, $${prIdx++}, $${prIdx++}, $${prIdx++}, $${prIdx++}, $${prIdx++}, $${prIdx++}, $${prIdx++}, $${prIdx++}, $${prIdx++}, $${prIdx++}, $${prIdx++}, $${prIdx++}, $${prIdx++})`);
      projParams.push(
        w.id,
        w.title || 'Civic Infrastructure Project',
        w.description || 'Community asset development project under MPLADS',
        w.category || 'Civic Amenities',
        stateId,
        districtId,
        constId,
        w.implementing_agency || 'Public Works Department (PWD)',
        estCost,
        sancAmt,
        relAmt,
        expAmt,
        sdate,
        edate,
        projectStatus
      );
    }

    await pgClient.query(`
      INSERT INTO projects (
        project_code, project_name, description, category, state_id, district_id, constituency_id,
        implementing_agency_name, estimated_cost, sanctioned_amount, released_amount, expenditure_amount,
        start_date, expected_completion_date, status
      ) VALUES ${projValues.join(', ')}
      ON CONFLICT (project_code) DO UPDATE SET
        project_name = EXCLUDED.project_name,
        sanctioned_amount = EXCLUDED.sanctioned_amount,
        expenditure_amount = EXCLUDED.expenditure_amount,
        status = EXCLUDED.status;
    `, projParams);
  }

  // 9. Sync Risk Assessments
  console.log('Syncing risk assessments in fast batches...');
  await pgClient.query('TRUNCATE TABLE risk_assessments CASCADE;');
  const risks = sqliteDb.prepare('SELECT * FROM risk_assessments WHERE work_id IN (SELECT id FROM works LIMIT 500)').all();
  for (let i = 0; i < risks.length; i += batchSize) {
    const chunk = risks.slice(i, i + batchSize);
    const riskValues = [];
    const riskParams = [];
    let rIdx = 1;
    for (const r of chunk) {
      riskValues.push(`($${rIdx++}, $${rIdx++}, $${rIdx++}, $${rIdx++}, $${rIdx++}, $${rIdx++}, $${rIdx++}, $${rIdx++}, $${rIdx++})`);
      riskParams.push(
        r.work_id,
        r.risk_score || 15.0,
        r.risk_level || 'Low',
        r.delay_probability || 10.0,
        r.cost_overrun_risk || 15.0,
        r.progress_gap_score || 10.0,
        r.agency_concentration_score || 15.0,
        r.duplicate_risk_score || 5.0,
        r.recommendations || 'Initial baseline assessment: On track.'
      );
    }
    await pgClient.query(`
      INSERT INTO risk_assessments (
        work_id, risk_score, risk_level, delay_probability, cost_overrun_risk,
        progress_gap_score, agency_concentration_score, duplicate_risk_score, recommendations
      ) VALUES ${riskValues.join(', ')}
    `, riskParams);
  }

  console.log('\n======================================================');
  console.log('✅ Supabase PostgreSQL Database Setup & Seeding Complete!');
  console.log('======================================================');

  // Verify counts
  const tables = ['states', 'districts', 'constituencies', 'projects', 'works', 'risk_assessments'];
  for (const t of tables) {
    const res = await pgClient.query(`SELECT count(*) FROM ${t}`);
    console.log(`- ${t}: ${res.rows[0].count} records`);
  }

  await pgClient.end();
}

main().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
