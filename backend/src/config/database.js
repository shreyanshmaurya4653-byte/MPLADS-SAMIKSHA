const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');
require('dotenv').config();

// Locate the SQLite database file (local high-speed low-latency cache)
const dbPath = path.resolve(__dirname, '../../../database/mplads.db');

let dbInstance = null;
let pgPoolInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(dbPath);
    // Enable foreign keys, WAL, RAM cache and memory-mapped IO for ultra-fast queries
    try {
      dbInstance.exec('PRAGMA foreign_keys = ON;');
      dbInstance.exec('PRAGMA journal_mode = WAL;');
      dbInstance.exec('PRAGMA synchronous = NORMAL;');
      dbInstance.exec('PRAGMA cache_size = -64000;');
      dbInstance.exec('PRAGMA temp_store = MEMORY;');
      dbInstance.exec('PRAGMA mmap_size = 30000000000;');
    } catch (e) {
      // Ignore if already set
    }
  }
  return dbInstance;
}

function getPgPool() {
  if (!pgPoolInstance && process.env.DATABASE_URL) {
    pgPoolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000
    });

    pgPoolInstance.on('error', (err) => {
      console.error('[Supabase Pool Error]', err.message);
    });
  }
  return pgPoolInstance;
}

async function getSupabaseHealth() {
  const pool = getPgPool();
  if (!pool) {
    return { connected: false, message: 'DATABASE_URL not configured in environment' };
  }
  const start = Date.now();
  try {
    const res = await pool.query(`
      SELECT 
        (SELECT count(*) FROM states) as states_count,
        (SELECT count(*) FROM districts) as districts_count,
        (SELECT count(*) FROM constituencies) as constituencies_count,
        (SELECT count(*) FROM works) as works_count,
        (SELECT count(*) FROM projects) as projects_count,
        (SELECT count(*) FROM risk_assessments) as risks_count,
        current_database() as db_name,
        version() as pg_version
    `);
    const latency = Date.now() - start;
    return {
      connected: true,
      provider: 'Supabase PostgreSQL (AWS Tokyo pooler)',
      host: 'aws-0-ap-northeast-1.pooler.supabase.com',
      database: res.rows[0].db_name,
      latencyMs: latency,
      stats: {
        states: parseInt(res.rows[0].states_count, 10),
        districts: parseInt(res.rows[0].districts_count, 10),
        constituencies: parseInt(res.rows[0].constituencies_count, 10),
        works: parseInt(res.rows[0].works_count, 10),
        projects: parseInt(res.rows[0].projects_count, 10),
        risk_assessments: parseInt(res.rows[0].risks_count, 10)
      }
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message
    };
  }
}

async function saveWorkToSupabase(w) {
  const pool = getPgPool();
  if (!pool) return false;

  try {
    const isValidDate = (str) => typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str);
    const sdate = isValidDate(w.start_date) ? w.start_date : '2024-06-01';
    const edate = isValidDate(w.expected_completion) ? w.expected_completion : '2024-12-01';
    const stateId = (Number(w.state_id) >= 1 && Number(w.state_id) <= 36) ? Number(w.state_id) : 1;
    const districtId = (Number(w.district_id) >= 1 && Number(w.district_id) <= 787) ? Number(w.district_id) : 1;
    const constId = (Number(w.constituency_id) >= 1 && Number(w.constituency_id) <= 543) ? Number(w.constituency_id) : null;
    const estCost = Math.max(0, Number(w.estimated_cost) || 1000000);
    const sancAmt = Math.max(0, Number(w.sanctioned_amount) || 1000000);
    const relAmt = Math.max(0, Number(w.released_amount) || 0);
    const expAmt = Math.max(0, Number(w.expenditure) || 0);
    const physProg = Math.min(100, Math.max(0, Number(w.physical_progress) || 0));
    const payUtil = Math.min(100, Math.max(0, Number(w.payment_utilization) || 0));

    await pool.query(`
      INSERT INTO works (
        id, title, description, category, constituency_id, district_id, state_id,
        implementing_agency, estimated_cost, sanctioned_amount, released_amount,
        expenditure, physical_progress, payment_utilization, start_date, expected_completion, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        sanctioned_amount = EXCLUDED.sanctioned_amount,
        expenditure = EXCLUDED.expenditure,
        physical_progress = EXCLUDED.physical_progress,
        payment_utilization = EXCLUDED.payment_utilization;
    `, [
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
    ]);

    let projectStatus = 'SANCTIONED';
    const stUpper = (w.status || '').toUpperCase();
    if (stUpper.includes('PROGRESS') || stUpper.includes('ONGOING')) projectStatus = 'ONGOING';
    else if (stUpper.includes('COMPLET')) projectStatus = 'COMPLETED';
    else if (stUpper.includes('DELAY')) projectStatus = 'DELAYED';
    else if (stUpper.includes('CANCEL')) projectStatus = 'CANCELLED';
    else if (stUpper.includes('SUSPEND')) projectStatus = 'SUSPENDED';
    else if (stUpper.includes('PROPOS')) projectStatus = 'PROPOSED';
    else if (stUpper.includes('REVIEW')) projectStatus = 'UNDER_REVIEW';

    await pool.query(`
      INSERT INTO projects (
        project_code, project_name, description, category, state_id, district_id, constituency_id,
        implementing_agency_name, estimated_cost, sanctioned_amount, released_amount, expenditure_amount,
        start_date, expected_completion_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (project_code) DO UPDATE SET
        project_name = EXCLUDED.project_name,
        description = EXCLUDED.description,
        sanctioned_amount = EXCLUDED.sanctioned_amount,
        expenditure_amount = EXCLUDED.expenditure_amount,
        status = EXCLUDED.status;
    `, [
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
    ]);

    return true;
  } catch (err) {
    console.error(`[Supabase] Failed to write work ${w.id}:`, err.message);
    return false;
  }
}

async function saveRiskAssessmentToSupabase(r) {
  const pool = getPgPool();
  if (!pool) return false;

  try {
    await pool.query(`
      INSERT INTO risk_assessments (
        work_id, risk_score, risk_level, delay_probability, cost_overrun_risk,
        progress_gap_score, agency_concentration_score, duplicate_risk_score, recommendations
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      r.work_id,
      r.risk_score || 18.0,
      r.risk_level || 'Low',
      r.delay_risk || 10.0,
      r.cost_risk || 15.0,
      r.payment_risk || 10.0,
      15.0,
      5.0,
      r.recommendations || 'Initial baseline assessment: On track.'
    ]);
    return true;
  } catch (err) {
    console.warn(`[Supabase] Failed to save risk assessment for ${r.work_id}:`, err.message);
    return false;
  }
}

/**
 * High-performance batch upsert to Supabase PostgreSQL.
 * Inserts in transactions of 100 items per chunk to eliminate pool exhaustion and timeouts.
 */
async function saveWorksBatchToSupabase(worksList, riskList = []) {
  const pool = getPgPool();
  if (!pool || !worksList || worksList.length === 0) return { success: false, count: 0 };

  const BATCH_SIZE = 100;
  let totalSaved = 0;

  for (let i = 0; i < worksList.length; i += BATCH_SIZE) {
    const chunk = worksList.slice(i, i + BATCH_SIZE);
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      // 1. Bulk Upsert into works
      const worksValues = [];
      const worksParams = [];
      let pIdx = 1;

      for (const w of chunk) {
        const stateId = (Number(w.state_id) >= 1 && Number(w.state_id) <= 36) ? Number(w.state_id) : 1;
        const districtId = (Number(w.district_id) >= 1 && Number(w.district_id) <= 787) ? Number(w.district_id) : 1;
        const constId = (Number(w.constituency_id) >= 1 && Number(w.constituency_id) <= 543) ? Number(w.constituency_id) : null;
        
        const estCost = Math.max(0, Number(w.estimated_cost) || 1000000);
        const sancAmt = Math.max(0, Number(w.sanctioned_amount) || estCost || 1000000);
        const relAmt = Math.max(0, Number(w.released_amount) || 0);
        const expAmt = Math.max(0, Number(w.expenditure) || 0);
        const physProg = Math.min(100, Math.max(0, Number(w.physical_progress) || 0));
        const payUtil = Math.min(100, Math.max(0, Number(w.payment_utilization) || 0));
        
        const sdate = (typeof w.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.start_date)) ? w.start_date : '2024-06-01';
        const edate = (typeof w.expected_completion === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.expected_completion)) ? w.expected_completion : '2024-12-01';

        worksParams.push(
          w.id,
          String(w.title || 'Civic Infrastructure Project'),
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

        const placeholders = [];
        for (let k = 0; k < 17; k++) {
          placeholders.push(`$${pIdx++}`);
        }
        worksValues.push(`(${placeholders.join(', ')})`);
      }

      const worksSql = `
        INSERT INTO works (
          id, title, description, category, constituency_id, district_id, state_id,
          implementing_agency, estimated_cost, sanctioned_amount, released_amount,
          expenditure, physical_progress, payment_utilization, start_date, expected_completion, status
        ) VALUES ${worksValues.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          constituency_id = EXCLUDED.constituency_id,
          district_id = EXCLUDED.district_id,
          state_id = EXCLUDED.state_id,
          implementing_agency = EXCLUDED.implementing_agency,
          sanctioned_amount = EXCLUDED.sanctioned_amount,
          expenditure = EXCLUDED.expenditure,
          physical_progress = EXCLUDED.physical_progress,
          payment_utilization = EXCLUDED.payment_utilization;
      `;
      await client.query(worksSql, worksParams);

      // 2. Bulk Upsert into projects
      const projValues = [];
      const projParams = [];
      let prIdx = 1;

      for (const w of chunk) {
        const stateId = (Number(w.state_id) >= 1 && Number(w.state_id) <= 36) ? Number(w.state_id) : 1;
        const districtId = (Number(w.district_id) >= 1 && Number(w.district_id) <= 787) ? Number(w.district_id) : 1;
        const constId = (Number(w.constituency_id) >= 1 && Number(w.constituency_id) <= 543) ? Number(w.constituency_id) : null;
        const estCost = Math.max(0, Number(w.estimated_cost) || 1000000);
        const sancAmt = Math.max(0, Number(w.sanctioned_amount) || estCost || 1000000);
        const relAmt = Math.max(0, Number(w.released_amount) || 0);
        const expAmt = Math.max(0, Number(w.expenditure) || 0);
        const sdate = (typeof w.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.start_date)) ? w.start_date : '2024-06-01';
        const edate = (typeof w.expected_completion === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.expected_completion)) ? w.expected_completion : '2024-12-01';

        let projectStatus = 'SANCTIONED';
        const stUpper = (w.status || '').toUpperCase();
        if (stUpper.includes('PROGRESS') || stUpper.includes('ONGOING')) projectStatus = 'ONGOING';
        else if (stUpper.includes('COMPLET')) projectStatus = 'COMPLETED';
        else if (stUpper.includes('DELAY')) projectStatus = 'DELAYED';
        else if (stUpper.includes('CANCEL')) projectStatus = 'CANCELLED';

        projParams.push(
          w.id,
          String(w.title || 'Civic Infrastructure Project'),
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

        const placeholders = [];
        for (let k = 0; k < 15; k++) {
          placeholders.push(`$${prIdx++}`);
        }
        projValues.push(`(${placeholders.join(', ')})`);
      }

      const projSql = `
        INSERT INTO projects (
          project_code, project_name, description, category, state_id, district_id, constituency_id,
          implementing_agency_name, estimated_cost, sanctioned_amount, released_amount, expenditure_amount,
          start_date, expected_completion_date, status
        ) VALUES ${projValues.join(', ')}
        ON CONFLICT (project_code) DO UPDATE SET
          project_name = EXCLUDED.project_name,
          description = EXCLUDED.description,
          sanctioned_amount = EXCLUDED.sanctioned_amount,
          expenditure_amount = EXCLUDED.expenditure_amount,
          status = EXCLUDED.status;
      `;
      await client.query(projSql, projParams);

      // 3. Bulk Upsert into risk_assessments
      const chunkIds = new Set(chunk.map(c => c.id));
      const chunkRisks = (riskList || []).filter(r => chunkIds.has(r.work_id));

      if (chunkRisks.length > 0) {
        const workIdsToDelete = chunkRisks.map(r => r.work_id);
        await client.query(`DELETE FROM risk_assessments WHERE work_id = ANY($1::varchar[])`, [workIdsToDelete]);

        const riskValues = [];
        const riskParams = [];
        let rIdx = 1;

        for (const r of chunkRisks) {
          riskParams.push(
            r.work_id,
            r.risk_score || 18.0,
            r.risk_level || 'Low',
            r.delay_risk || 10.0,
            r.cost_risk || 15.0,
            r.payment_risk || 10.0,
            15.0,
            5.0,
            r.recommendations || 'Initial baseline assessment: On track.'
          );
          const placeholders = [];
          for (let k = 0; k < 9; k++) {
            placeholders.push(`$${rIdx++}`);
          }
          riskValues.push(`(${placeholders.join(', ')})`);
        }

        const riskSql = `
          INSERT INTO risk_assessments (
            work_id, risk_score, risk_level, delay_probability, cost_overrun_risk,
            progress_gap_score, agency_concentration_score, duplicate_risk_score, recommendations
          ) VALUES ${riskValues.join(', ')}
        `;
        await client.query(riskSql, riskParams);
      }

      await client.query('COMMIT');
      totalSaved += chunk.length;
    } catch (err) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.error(`[Supabase Batch Sync] Error in chunk starting at ${i}:`, err.message);
    } finally {
      if (client) client.release();
    }
  }

  return { success: true, count: totalSaved };
}

module.exports = {
  getDb,
  getPgPool,
  getSupabaseHealth,
  saveWorkToSupabase,
  saveWorksBatchToSupabase,
  saveRiskAssessmentToSupabase,
  dbPath
};
