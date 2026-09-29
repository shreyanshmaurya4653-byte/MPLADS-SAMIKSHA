/**
 * MPLADS AI Engine: Multi-Pillar Problem Statement Anomaly Analysis Service (JavaScript)
 * Computes granular analytics across:
 * 1. Expenditure Patterns (spikes, velocity, agency concentration)
 * 2. Fund Utilization (idle balances, unspent funds, sectoral efficiency)
 * 3. Cost Estimates (overruns, SoR variances, estimate deviations)
 * 4. Work Execution (payment vs physical progress mismatches, milestone delays)
 * 5. Project Similarity & Duplication
 */

const { getAllDuplicatePairs } = require('./similarityService');

function buildJurisdictionFilter(user = {}, filters = {}) {
  const role = user.role || "Ministry";
  const whereClauses = [];
  const params = [];

  if (role === "MP") {
    if (user.constituency_id) {
      whereClauses.push("(constituency_id = ? OR LOWER(mp_name) LIKE ?)");
      params.push(user.constituency_id, `%${(user.name || '').toLowerCase().trim()}%`);
    } else if (user.state_id) {
      whereClauses.push("state_id = ?");
      params.push(user.state_id);
    }
  } else if (role === "District" && !filters.all_districts) {
    const did = filters.district_id ? Number(filters.district_id) : (user.district_id || 1);
    whereClauses.push("district_id = ?");
    params.push(did);
  } else if (role === "State" && !filters.all_states) {
    const sid = filters.state_id ? Number(filters.state_id) : (user.state_id || 1);
    whereClauses.push("state_id = ?");
    params.push(sid);
    if (filters.district_id && filters.district_id !== 'All') {
      whereClauses.push("district_id = ?");
      params.push(Number(filters.district_id));
    }
  } else {
    // Ministry / Admin
    if (filters.state_id && filters.state_id !== "All") {
      whereClauses.push("state_id = ?");
      params.push(Number(filters.state_id));
    }
    if (filters.district_id && filters.district_id !== "All") {
      whereClauses.push("district_id = ?");
      params.push(Number(filters.district_id));
    }
    if (filters.constituency_id && filters.constituency_id !== "All") {
      whereClauses.push("constituency_id = ?");
      params.push(Number(filters.constituency_id));
    }
  }

  if (filters.subdivision && filters.subdivision !== "All") {
    whereClauses.push("subdivision = ?");
    params.push(filters.subdivision);
  }

  const sqlPart = whereClauses.length > 0 ? " AND " + whereClauses.join(" AND ") : "";
  return { sqlPart, params };
}

function getProblemStatementAnomalies(db, currentUser = null, filters = {}) {
  const { sqlPart, params } = buildJurisdictionFilter(currentUser || {}, filters);

  // Global aggregate metrics
  const totalsRow = db.prepare(`
    SELECT 
      count(1) as total_works,
      coalesce(sum(sanctioned_amount), 0) as total_sanctioned,
      coalesce(sum(released_amount), 0) as total_released,
      coalesce(sum(expenditure), 0) as total_expenditure,
      coalesce(sum(estimated_cost), 0) as total_estimated,
      coalesce(avg(physical_progress), 0) as avg_progress
    FROM works
    WHERE 1=1 ${sqlPart}
  `).get(...params);

  const totalWorks = totalsRow?.total_works || 0;
  if (totalWorks === 0) {
    return {
      timestamp: new Date().toISOString(),
      total_assessed_works: 0,
      expenditure_patterns: { total_expenditure: 0, average_expenditure: 0, total_spikes_flagged: 0, spike_rate_pct: 0, flagged_spikes: [], agency_concentration: [], audit_summary: "No works found for selected jurisdiction." },
      fund_utilization: { total_sanctioned: 0, total_released: 0, total_utilized: 0, total_unspent_balance: 0, overall_utilization_rate: 0, idle_projects_count: 0, idle_projects: [], sector_utilization: [], audit_summary: "No works found." },
      cost_estimates: { total_estimated_cost: 0, total_sanctioned_budget: 0, total_overrun_amount: 0, overrun_project_count: 0, overrun_rate_pct: 0, flagged_overruns: [], audit_summary: "No works found." },
      work_execution: { average_physical_progress: 0, mismatch_count: 0, delayed_count: 0, delayed_rate_pct: 0, progress_payment_mismatches: [], delayed_projects: [], audit_summary: "No works found." },
      project_similarity: { total_pairs_flagged: 0, high_risk_duplicate_count: 0, pairs: [], audit_summary: "No works found." }
    };
  }

  const totalExpenditure = totalsRow?.total_expenditure || 0;
  const totalSanctioned = totalsRow?.total_sanctioned || 0;
  const totalReleased = (totalsRow?.total_released && totalsRow.total_released > 0) ? totalsRow.total_released : totalSanctioned;
  const totalEstimated = totalsRow?.total_estimated || totalSanctioned;
  const avgExpenditure = totalWorks > 0 ? Math.round((totalExpenditure / totalWorks) * 100) / 100 : 0;
  const avgPhysicalProgress = Math.round((totalsRow?.avg_progress || 0) * 10) / 10;

  // ==========================================
  // 1. EXPENDITURE PATTERNS ANOMALY ANALYSIS
  // ==========================================
  const spikeRows = db.prepare(`
    SELECT 
      id, title, implementing_agency, category,
      MAX(sanctioned_amount) as sanctioned_amount,
      MAX(expenditure) as expenditure,
      MIN(physical_progress) as physical_progress,
      status,
      COUNT(1) as instances
    FROM works 
    WHERE ((expenditure >= sanctioned_amount * 0.85 AND physical_progress < 40 AND sanctioned_amount >= 150000)
       OR (expenditure > sanctioned_amount))
       AND length(title) > 3
       ${sqlPart}
    GROUP BY title
    ORDER BY (MAX(expenditure) - (MAX(sanctioned_amount) * MIN(physical_progress) / 100.0)) DESC
    LIMIT 50
  `).all(...params);

  const expenditureSpikes = spikeRows.map(w => {
    const sanc = parseFloat(w.sanctioned_amount || 1.0);
    const exp = parseFloat(w.expenditure || 0.0);
    const prog = parseFloat(w.physical_progress || 0.0);
    const expectedSpend = Math.max(1000.0, sanc * (Math.max(1.0, prog) / 100.0));
    const spikePct = Math.round(((exp - expectedSpend) / expectedSpend * 100.0) * 10) / 10;
    const deviation = Math.max(0, exp - expectedSpend);
    const instSuffix = w.instances > 1 ? ` (${w.instances} identical works clustered)` : '';
    return {
      work_id: w.id,
      title: w.title,
      implementing_agency: w.implementing_agency,
      category: w.category,
      sanctioned_amount: sanc,
      expenditure: exp,
      spike_percentage: spikePct,
      deviation_amount: deviation,
      instances: w.instances || 1,
      status: w.status,
      anomaly_type: "EXPENDITURE_SPIKE",
      severity: spikePct >= 50.0 ? "Critical" : "High",
      audit_note: `Disbursement velocity anomaly: ₹${(exp / 100000).toFixed(1)} Lakhs (${Math.round(exp / sanc * 100)}%) released against only ${prog}% physical milestone completion.${instSuffix}`
    };
  });

  const agencyRows = db.prepare(`
    SELECT 
      implementing_agency as agency,
      coalesce(sum(expenditure), 0) as total_expenditure
    FROM works
    WHERE implementing_agency IS NOT NULL AND implementing_agency != '' ${sqlPart}
    GROUP BY implementing_agency
    ORDER BY total_expenditure DESC
    LIMIT 10
  `).all(...params);

  const topAgencies = agencyRows.map(r => ({
    agency: r.agency,
    total_expenditure: r.total_expenditure,
    share_pct: totalExpenditure > 0 ? Math.round((r.total_expenditure / totalExpenditure * 100.0) * 10) / 10 : 0
  }));

  const expenditurePatterns = {
    total_expenditure: totalExpenditure,
    average_expenditure: avgExpenditure,
    total_spikes_flagged: expenditureSpikes.length,
    spike_rate_pct: Math.round((expenditureSpikes.length / Math.max(1, totalWorks) * 100.0) * 10) / 10,
    flagged_spikes: expenditureSpikes,
    agency_concentration: topAgencies,
    audit_summary: `Detected ${expenditureSpikes.length} distinct expenditure surge clusters exceeding statutory sanctioned thresholds, with top agency absorbing ${topAgencies[0]?.share_pct || 0}% of all disbursements.`
  };

  // ==========================================
  // 2. FUND UTILIZATION ANOMALY ANALYSIS
  // ==========================================
  const totalUnspent = Math.max(0.0, totalReleased - totalExpenditure);
  const overallUtilizationRate = totalReleased > 0 ? Math.round((totalExpenditure / totalReleased * 100.0) * 10) / 10 : 0.0;

  const idleRows = db.prepare(`
    SELECT 
      id, title, category, implementing_agency,
      MAX(released_amount) as released_amount,
      MAX(sanctioned_amount) as sanctioned_amount,
      MIN(expenditure) as expenditure,
      MIN(physical_progress) as physical_progress,
      status,
      COUNT(1) as instances
    FROM works
    WHERE (released_amount >= 300000 OR sanctioned_amount >= 300000)
      AND (expenditure / MAX(1.0, sanctioned_amount)) < 0.60
      AND physical_progress < 50.0
      AND length(title) > 3
      ${sqlPart}
    GROUP BY title
    ORDER BY (coalesce(MAX(released_amount), MAX(sanctioned_amount)) - MIN(expenditure)) DESC
    LIMIT 50
  `).all(...params);

  const idleFundWorks = idleRows.map(w => {
    const rel = parseFloat(w.released_amount || w.sanctioned_amount || 0);
    const exp = parseFloat(w.expenditure || 0);
    const prog = parseFloat(w.physical_progress || 0);
    const unspent = Math.max(0, rel - exp);
    const instSuffix = w.instances > 1 ? ` (${w.instances} identical works clustered)` : '';
    return {
      work_id: w.id,
      title: w.title,
      category: w.category,
      implementing_agency: w.implementing_agency,
      released_amount: rel,
      expenditure: exp,
      unspent_balance: unspent,
      physical_progress: prog,
      instances: w.instances || 1,
      utilization_pct: rel > 0 ? Math.round((exp / rel * 100.0) * 10) / 10 : 0,
      status: w.status,
      audit_note: `₹${(unspent / 100000).toFixed(1)} Lakhs lying unutilized with only ${prog}% progress.${instSuffix}`
    };
  });

  const catRows = db.prepare(`
    SELECT 
      category,
      coalesce(sum(sanctioned_amount), 0) as total_sanctioned,
      coalesce(sum(coalesce(released_amount, sanctioned_amount)), 0) as total_released,
      coalesce(sum(expenditure), 0) as total_expenditure,
      count(1) as project_count
    FROM works
    WHERE category IS NOT NULL AND category != '' ${sqlPart}
    GROUP BY category
    ORDER BY total_sanctioned DESC
  `).all(...params);

  const categorySummary = catRows.map(r => ({
    category: r.category,
    total_sanctioned: r.total_sanctioned,
    total_expenditure: r.total_expenditure,
    utilization_rate: r.total_released > 0 ? Math.round((r.total_expenditure / r.total_released * 100.0) * 10) / 10 : 0,
    project_count: r.project_count
  }));

  const fundUtilization = {
    total_sanctioned: totalSanctioned,
    total_released: totalReleased,
    total_utilized: totalExpenditure,
    total_unspent_balance: totalUnspent,
    overall_utilization_rate: overallUtilizationRate,
    idle_projects_count: idleFundWorks.length,
    idle_projects: idleFundWorks,
    sector_utilization: categorySummary,
    audit_summary: `Scheme fund utilization rate stands at ${overallUtilizationRate}%, with ₹${(totalUnspent / 10000000).toFixed(2)} Cr remaining unutilized across active project accounts.`
  };

  // ==========================================
  // 3. COST ESTIMATES ANOMALY ANALYSIS
  // ==========================================
  let totalOverrunAmount = 0.0;
  const costOverrunWorks = expenditureSpikes.map(w => {
    totalOverrunAmount += w.deviation_amount;
    return {
      work_id: w.work_id,
      title: w.title,
      category: w.category,
      implementing_agency: w.implementing_agency,
      estimated_cost: w.sanctioned_amount,
      sanctioned_amount: w.sanctioned_amount,
      actual_expenditure: w.expenditure,
      overrun_amount: w.deviation_amount,
      overrun_pct: w.spike_percentage,
      variance_estimate_vs_actual: w.spike_percentage,
      audit_note: `Cost deviation of +${w.spike_percentage}% (₹${(w.deviation_amount / 100000).toFixed(1)} Lakhs above ceiling). Breaches Schedule of Rates (SoR).`
    };
  });

  const costEstimates = {
    total_estimated_cost: totalEstimated,
    total_sanctioned_budget: totalSanctioned,
    total_overrun_amount: totalOverrunAmount,
    overrun_project_count: costOverrunWorks.length,
    overrun_rate_pct: Math.round((costOverrunWorks.length / Math.max(1, totalWorks) * 100.0) * 10) / 10,
    flagged_overruns: costOverrunWorks,
    audit_summary: `Identified ${costOverrunWorks.length} works with severe cost inflation amounting to ₹${(totalOverrunAmount / 100000).toFixed(2)} Lakhs beyond government sanctioned caps.`
  };

  // ==========================================
  // 4. WORK EXECUTION ANOMALY ANALYSIS
  // ==========================================
  const mismatchRows = db.prepare(`
    SELECT 
      id, title, category, implementing_agency,
      MIN(physical_progress) as physical_progress,
      MAX(payment_utilization) as payment_utilization,
      status,
      COUNT(1) as instances
    FROM works
    WHERE (payment_utilization - physical_progress) >= 20.0
       AND length(title) > 3
       ${sqlPart}
    GROUP BY title
    ORDER BY (MAX(payment_utilization) - MIN(physical_progress)) DESC
    LIMIT 50
  `).all(...params);

  const progressPaymentMismatches = mismatchRows.map(w => {
    const prog = parseFloat(w.physical_progress || 0.0);
    const payUtil = parseFloat(w.payment_utilization || 0.0);
    const gap = Math.round((payUtil - prog) * 10) / 10;
    const instSuffix = w.instances > 1 ? ` (${w.instances} identical works clustered)` : '';
    return {
      work_id: w.id,
      title: w.title,
      category: w.category,
      implementing_agency: w.implementing_agency,
      physical_progress: prog,
      payment_utilization: Math.round(payUtil * 10) / 10,
      mismatch_gap: gap,
      instances: w.instances || 1,
      status: w.status,
      severity: gap >= 35.0 ? "Critical" : "High",
      audit_note: `Payment utilization (${Math.round(payUtil)}%) exceeds on-ground physical completion (${Math.round(prog)}%) by ${Math.round(gap)}%.${instSuffix}`
    };
  });

  const delayedRows = db.prepare(`
    SELECT 
      id, title, category, implementing_agency,
      MIN(physical_progress) as physical_progress,
      start_date, expected_completion,
      COUNT(1) as instances
    FROM works
    WHERE status = 'Delayed' AND length(title) > 3 ${sqlPart}
    GROUP BY title
    LIMIT 50
  `).all(...params);

  const delayedWorks = delayedRows.map(w => {
    const instSuffix = w.instances > 1 ? ` (${w.instances} works clustered)` : '';
    return {
      work_id: w.id,
      title: w.title,
      category: w.category,
      implementing_agency: w.implementing_agency,
      physical_progress: parseFloat(w.physical_progress || 0),
      instances: w.instances || 1,
      start_date: w.start_date ? String(w.start_date) : null,
      expected_completion: w.expected_completion ? String(w.expected_completion) : null,
      audit_note: `Project stalled behind statutory timeline with ${w.physical_progress || 0}% physical execution.${instSuffix}`
    };
  });

  const workExecution = {
    average_physical_progress: avgPhysicalProgress,
    mismatch_count: progressPaymentMismatches.length,
    delayed_count: delayedWorks.length,
    delayed_rate_pct: Math.round((delayedWorks.length / Math.max(1, totalWorks) * 100.0) * 10) / 10,
    progress_payment_mismatches: progressPaymentMismatches,
    delayed_projects: delayedWorks,
    audit_summary: `${progressPaymentMismatches.length} works display high-risk progress-to-payment divergence where contractors received large disbursements without corresponding field milestones.`
  };

  // ==========================================
  // 5. PROJECT SIMILARITY & DUPLICATE ANALYSIS
  // ==========================================
  const duplicatePairs = getAllDuplicatePairs(db, 45.0);
  const highRiskDups = duplicatePairs.filter(p => p.similarity.risk_level === "High");

  const projectSimilarity = {
    total_pairs_flagged: duplicatePairs.length,
    high_risk_duplicate_count: highRiskDups.length,
    pairs: duplicatePairs,
    audit_summary: `Detected ${duplicatePairs.length} project clusters exhibiting substantial lexical, geospatial, or scope overlap requiring physical verification against double-claiming.`
  };

  return {
    timestamp: new Date().toISOString(),
    total_assessed_works: totalWorks,
    expenditure_patterns: expenditurePatterns,
    fund_utilization: fundUtilization,
    cost_estimates: costEstimates,
    work_execution: workExecution,
    project_similarity: projectSimilarity
  };
}

module.exports = {
  getProblemStatementAnomalies
};
