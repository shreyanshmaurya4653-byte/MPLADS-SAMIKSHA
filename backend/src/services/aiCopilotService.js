/**
 * AI Copilot Service - Omni-capable Natural Language & Data Query Engine for MPLADS
 * Grounded in MoSPI 2023 Guidelines and Active Database:
 * 77,184 works, 787 districts, 36 states, 791 constituencies, 21,482 contractors, risk models & alerts.
 */

// Helper to format Indian currency
function formatCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return '₹0';
  const val = Number(num);
  if (Math.abs(val) >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(val) >= 100000) {
    return `₹${(val / 100000).toFixed(2)} Lakhs`;
  }
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

// 1. Specific Work ID Lookup
function handleWorkIdQuery(db, prompt, workIdStr) {
  const work = db.prepare(`
    SELECT w.*, s.name as state_name, d.name as district_name, c.name as constituency_name
    FROM works w
    LEFT JOIN states s ON w.state_id = s.state_id
    LEFT JOIN districts d ON w.district_id = d.district_id
    LEFT JOIN constituencies c ON w.constituency_id = c.constituency_id
    WHERE w.id LIKE ? OR w.id LIKE ?
    LIMIT 1
  `).get(`%${workIdStr}%`, `${workIdStr}%`);

  if (!work) {
    return {
      answer: `### 🔍 Work Identifier Search: ${workIdStr}\n\nNo work matching identifier **\`${workIdStr}\`** was located in the active 77,184 projects register.\n\n**Tip:** Ensure the full code format is used (e.g., \`WS/MP620/2024-2025/133166\`) or provide keywords from the project title.`,
      dataContext: { searchedId: workIdStr, found: false },
      suggestedQuestions: [
        "Show top 5 high-risk works nationally",
        "Search works in Uttar Pradesh",
        "What are the statutory guidelines for community halls?"
      ]
    };
  }

  // Fetch risk assessment
  const risk = db.prepare(`
    SELECT * FROM risk_assessments WHERE work_id = ?
  `).get(work.id);

  // Fetch alerts
  const alerts = db.prepare(`
    SELECT alert_type, severity, title, description FROM alerts WHERE work_id = ? LIMIT 3
  `).all(work.id);

  // Fetch expenditures
  const expenditures = db.prepare(`
    SELECT amount, expenditure_date, vendor_name, payment_status FROM expenditures WHERE work_id = ? LIMIT 3
  `).all(work.id);

  const sanctioned = formatCurrency(work.sanctioned_amount);
  const spent = formatCurrency(work.expenditure);
  const riskScore = risk ? risk.risk_score : 'Not assessed';
  const riskLevel = risk ? risk.risk_level : 'Normal';

  let alertText = '';
  if (alerts && alerts.length > 0) {
    alertText = `\n\n#### 🚩 Active System Alerts:\n` + alerts.map(a => `- **[${a.severity}] ${a.alert_type}:** ${a.description}`).join('\n');
  }

  let expText = '';
  if (expenditures && expenditures.length > 0) {
    expText = `\n\n#### 💳 Recent Disbursements:\n` + expenditures.map(e => `- **${formatCurrency(e.amount)}** (${e.payment_status || 'Disbursed'}) on ${e.expenditure_date || 'N/A'} to *${e.vendor_name || 'Implementing Agency'}*`).join('\n');
  }

  const answer = `### 📋 Work Dossier: ${work.id}\n\n` +
    `**Title:** ${work.title}\n\n` +
    `- **Status:** **${work.status}** (${work.physical_progress || 0}% physical progress)\n` +
    `- **Location:** ${work.district_name || 'District'}, ${work.state_name || 'State'} (Constituency: ${work.constituency_name || 'N/A'})\n` +
    `- **Recommending MP:** ${work.mp_name || 'Hon\'ble MP'} (${work.house_type || 'Lok Sabha'})\n` +
    `- **Implementing Agency:** \`${work.implementing_agency || 'District Authority'}\`\n` +
    `- **Financial Allocation:** Sanctioned: **${sanctioned}** | Disbursed Expenditure: **${spent}**\n` +
    `- **AI Risk Assessment:** **${riskScore}/100** [${riskLevel}]\n` +
    (risk ? `- **Delay Probability:** ${risk.delay_probability}% | **Progress Gap Score:** ${risk.progress_gap_score}%\n` : '') +
    (risk?.recommendations ? `\n> **Vigilance Guidance:** ${risk.recommendations}` : '') +
    alertText + expText;

  return {
    answer,
    dataContext: { work, risk, alerts, expenditures },
    suggestedQuestions: [
      `Show other works by MP ${work.mp_name || 'this MP'}`,
      `Show all high-risk works in ${work.district_name || 'this district'}`,
      `What is the rule for milestone-linked payments?`
    ]
  };
}

// 2. State Overview Query
function handleStateQuery(db, prompt, state) {
  const stats = db.prepare(`
    SELECT 
      COUNT(1) as total_works,
      COALESCE(SUM(sanctioned_amount), 0) as total_sanctioned,
      COALESCE(SUM(expenditure), 0) as total_spent,
      ROUND(AVG(physical_progress), 1) as avg_progress,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_count,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count,
      SUM(CASE WHEN status = 'Sanctioned' THEN 1 ELSE 0 END) as sanctioned_count
    FROM works
    WHERE state_id = ?
  `).get(state.state_id);

  const riskStats = db.prepare(`
    SELECT COUNT(1) as high_risk_count
    FROM risk_assessments r
    JOIN works w ON r.work_id = w.id
    WHERE w.state_id = ? AND r.risk_score >= 70
  `).get(state.state_id);

  // Top 3 districts by works
  const topDistricts = db.prepare(`
    SELECT d.name, COUNT(1) as count, SUM(w.sanctioned_amount) as total_sanctioned
    FROM works w
    JOIN districts d ON w.district_id = d.district_id
    WHERE w.state_id = ?
    GROUP BY d.district_id
    ORDER BY count DESC
    LIMIT 3
  `).all(state.state_id);

  // Top categories
  const categories = db.prepare(`
    SELECT category, COUNT(1) as count
    FROM works
    WHERE state_id = ?
    GROUP BY category
    ORDER BY count DESC
    LIMIT 3
  `).all(state.state_id);

  const totalWorks = stats.total_works || 0;
  const sanctionedCr = formatCurrency(stats.total_sanctioned);
  const spentCr = formatCurrency(stats.total_spent);
  const utilRate = stats.total_sanctioned > 0 
    ? ((stats.total_spent / stats.total_sanctioned) * 100).toFixed(1) 
    : '0';

  const answer = `### 🏛️ State Analytics: ${state.name} (${state.code})\n\n` +
    `Real-time MPLADS implementation footprint across **${state.name}**:\n\n` +
    `- **Total Monitored Works:** **${totalWorks.toLocaleString('en-IN')} projects**\n` +
    `- **Sanctioned Outlay:** **${sanctionedCr}**\n` +
    `- **Total Disbursed Expenditure:** **${spentCr}** (**${utilRate}% fund utilization**)\n` +
    `- **Average Physical Progress:** **${stats.avg_progress || 0}%**\n` +
    `- **Completion Status:** ${stats.completed_count.toLocaleString('en-IN')} Completed | ${stats.in_progress_count.toLocaleString('en-IN')} Ongoing | ${stats.sanctioned_count.toLocaleString('en-IN')} Sanctioned\n` +
    `- **AI High-Risk Queue:** **${(riskStats?.high_risk_count || 0).toLocaleString('en-IN')} works** flagged with Critical/High risk anomaly scores (≥ 70/100)\n\n` +
    `#### 📍 Top Implementing Districts:\n` +
    topDistricts.map(d => `- **${d.name}:** ${d.count.toLocaleString('en-IN')} works (${formatCurrency(d.total_sanctioned)})`).join('\n') +
    `\n\n#### 🏗️ Dominant Work Categories:\n` +
    categories.map(c => `- **${c.category}:** ${c.count.toLocaleString('en-IN')} works`).join('\n');

  return {
    answer,
    dataContext: { state, stats, riskStats, topDistricts, categories },
    suggestedQuestions: [
      `Show top high-risk works in ${state.name}`,
      `Show expenditure in ${topDistricts[0]?.name || 'top district'}`,
      `What are the SC/ST quota guidelines for ${state.name}?`
    ]
  };
}

// 3. District Overview Query
function handleDistrictQuery(db, prompt, district) {
  const stats = db.prepare(`
    SELECT 
      COUNT(1) as total_works,
      COALESCE(SUM(sanctioned_amount), 0) as total_sanctioned,
      COALESCE(SUM(expenditure), 0) as total_spent,
      ROUND(AVG(physical_progress), 1) as avg_progress,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_count,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count
    FROM works
    WHERE district_id = ?
  `).get(district.district_id);

  const state = db.prepare(`SELECT name FROM states WHERE state_id = ?`).get(district.state_id);

  const riskStats = db.prepare(`
    SELECT COUNT(1) as high_risk_count
    FROM risk_assessments r
    JOIN works w ON r.work_id = w.id
    WHERE w.district_id = ? AND r.risk_score >= 70
  `).get(district.district_id);

  const topMps = db.prepare(`
    SELECT mp_name, COUNT(1) as count, SUM(sanctioned_amount) as sanctioned
    FROM works
    WHERE district_id = ? AND mp_name IS NOT NULL
    GROUP BY mp_name
    ORDER BY count DESC
    LIMIT 3
  `).all(district.district_id);

  const sampleWorks = db.prepare(`
    SELECT id, title, category, sanctioned_amount, physical_progress, status
    FROM works
    WHERE district_id = ?
    ORDER BY sanctioned_amount DESC
    LIMIT 3
  `).all(district.district_id);

  const utilRate = stats.total_sanctioned > 0 
    ? ((stats.total_spent / stats.total_sanctioned) * 100).toFixed(1) 
    : '0';

  const answer = `### 📍 District Profile: ${district.name} (${state?.name || 'State'})\n\n` +
    `- **Total Projects Monitored:** **${stats.total_works.toLocaleString('en-IN')} works**\n` +
    `- **Sanctioned Allocation:** **${formatCurrency(stats.total_sanctioned)}**\n` +
    `- **Total Expenditure:** **${formatCurrency(stats.total_spent)}** (**${utilRate}% utilization**)\n` +
    `- **Average Progress:** **${stats.avg_progress || 0}%** (${stats.completed_count} completed, ${stats.in_progress_count} ongoing)\n` +
    `- **High Risk Outliers:** **${riskStats?.high_risk_count || 0} projects** flagged by AI surveillance\n\n` +
    `#### 👤 Key Recommending MPs:\n` +
    (topMps.length > 0 ? topMps.map(m => `- **${m.mp_name}:** ${m.count} works (${formatCurrency(m.sanctioned)})`).join('\n') : '- District works under Nodal Authority') +
    `\n\n#### 🏗️ High-Value Projects in ${district.name}:\n` +
    sampleWorks.map(w => `- **${w.title}** (${w.category}): ${formatCurrency(w.sanctioned_amount)} [${w.status} - ${w.physical_progress}%]`).join('\n');

  return {
    answer,
    dataContext: { district, state, stats, riskStats, topMps },
    suggestedQuestions: [
      `Show delayed works in ${district.name}`,
      `Show contractor performance for ${district.name}`,
      `What is the District Collector's role under MPLADS?`
    ]
  };
}

// 4. MP Portfolio Query
function handleMpQuery(db, prompt, mpNamePattern) {
  let mpData = null;
  if (mpNamePattern && mpNamePattern.trim().length > 1) {
    mpData = db.prepare(`
      SELECT 
        mp_name, house_type,
        COUNT(1) as total_works,
        COALESCE(SUM(sanctioned_amount), 0) as total_sanctioned,
        COALESCE(SUM(expenditure), 0) as total_spent,
        ROUND(AVG(physical_progress), 1) as avg_progress,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count
      FROM works
      WHERE mp_name LIKE ?
      GROUP BY mp_name
      ORDER BY total_works DESC
      LIMIT 1
    `).get(`%${mpNamePattern.trim()}%`);
  }

  if (!mpData) {
    // List top MPs
    const topMps = db.prepare(`
      SELECT mp_name, COUNT(1) as count, SUM(sanctioned_amount) as sanctioned
      FROM works
      WHERE mp_name IS NOT NULL AND mp_name != ''
      GROUP BY mp_name
      ORDER BY count DESC
      LIMIT 5
    `).all();

    return {
      answer: `### 👤 MP Search Portfolio\n\nNo records found specifically matching "${mpNamePattern}".\n\n#### 🏆 Top 5 Active MPs in Database:\n` +
        topMps.map(m => `- **${m.mp_name}:** ${m.count} works sanctioned (${formatCurrency(m.sanctioned)})`).join('\n'),
      dataContext: { topMps },
      suggestedQuestions: [
        `Show works recommended by ${topMps[0]?.mp_name}`,
        "What is the annual MPLADS entitlement per MP?",
        "What are the rules for Rajya Sabha MPs?"
      ]
    };
  }

  const sampleWorks = db.prepare(`
    SELECT id, title, category, sanctioned_amount, expenditure, physical_progress, status
    FROM works
    WHERE mp_name = ?
    ORDER BY sanctioned_amount DESC
    LIMIT 4
  `).all(mpData.mp_name);

  const riskCount = db.prepare(`
    SELECT COUNT(1) as high_risk_count
    FROM risk_assessments r
    JOIN works w ON r.work_id = w.id
    WHERE w.mp_name = ? AND r.risk_score >= 70
  `).get(mpData.mp_name);

  const utilRate = mpData.total_sanctioned > 0 
    ? ((mpData.total_spent / mpData.total_sanctioned) * 100).toFixed(1) 
    : '0';

  const answer = `### 👤 MP Portfolio: ${mpData.mp_name}\n\n` +
    `- **Parliamentary House:** **${mpData.house_type || 'Lok Sabha'}**\n` +
    `- **Total Works Recommended:** **${mpData.total_works} works**\n` +
    `- **Total Sanctioned Outlay:** **${formatCurrency(mpData.total_sanctioned)}**\n` +
    `- **Total Disbursed Expenditure:** **${formatCurrency(mpData.total_spent)}** (**${utilRate}% fund utilization**)\n` +
    `- **Physical Completion Rate:** **${mpData.avg_progress || 0}% avg progress** (${mpData.completed_count} completed, ${mpData.in_progress_count} ongoing)\n` +
    `- **High Risk Flags:** **${riskCount?.high_risk_count || 0} works** flagged for vigilance audit\n\n` +
    `#### 📌 Key Works Recommended by ${mpData.mp_name}:\n` +
    sampleWorks.map(w => `- **${w.title}** (${w.category}): ${formatCurrency(w.sanctioned_amount)} [${w.status} - ${w.physical_progress}%]`).join('\n');

  return {
    answer,
    dataContext: { mpData, sampleWorks, riskCount },
    suggestedQuestions: [
      `Show any high risk works recommended by ${mpData.mp_name}`,
      `What is the annual ₹5 Crore quota rule for MPs?`,
      `How are funds transferred through the SNA account?`
    ]
  };
}

// 5. Sector & Infrastructure Category Query
function handleSectorQuery(db, prompt, keyword, sectorLabel) {
  const stats = db.prepare(`
    SELECT 
      COUNT(1) as total_works,
      COALESCE(SUM(sanctioned_amount), 0) as total_sanctioned,
      COALESCE(SUM(expenditure), 0) as total_spent,
      ROUND(AVG(physical_progress), 1) as avg_progress,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_count
    FROM works
    WHERE title LIKE ? OR description LIKE ? OR category LIKE ?
  `).get(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);

  const sampleWorks = db.prepare(`
    SELECT w.id, w.title, s.name as state_name, d.name as district_name, w.sanctioned_amount, w.physical_progress, w.status
    FROM works w
    LEFT JOIN states s ON w.state_id = s.state_id
    LEFT JOIN districts d ON w.district_id = d.district_id
    WHERE w.title LIKE ? OR w.description LIKE ? OR w.category LIKE ?
    ORDER BY w.sanctioned_amount DESC
    LIMIT 4
  `).all(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);

  const utilRate = stats.total_sanctioned > 0 
    ? ((stats.total_spent / stats.total_sanctioned) * 100).toFixed(1) 
    : '0';

  const answer = `### 🏗️ Sector Analysis: ${sectorLabel}\n\n` +
    `Aggregated data across all MPLADS projects relating to **${sectorLabel}**:\n\n` +
    `- **Total Projects Identified:** **${stats.total_works.toLocaleString('en-IN')} works**\n` +
    `- **Sanctioned Investment:** **${formatCurrency(stats.total_sanctioned)}**\n` +
    `- **Disbursed Expenditure:** **${formatCurrency(stats.total_spent)}** (**${utilRate}% utilization**)\n` +
    `- **Completion Rate:** **${stats.completed_count.toLocaleString('en-IN')} completed** (${stats.avg_progress || 0}% average progress)\n\n` +
    `#### 🌟 Prominent ${sectorLabel} Works:\n` +
    sampleWorks.map(w => `- **${w.title}** (${w.district_name || 'District'}, ${w.state_name || 'State'}): ${formatCurrency(w.sanctioned_amount)} [${w.status} - ${w.physical_progress}%]`).join('\n') +
    `\n\n**MoSPI 2023 Guidelines Note:** ${sectorLabel} constitutes a core priority under Paragraph 3 of the Operational Guidelines for creating community-owned durable assets.`;

  return {
    answer,
    dataContext: { stats, sampleWorks, sectorLabel },
    suggestedQuestions: [
      `Show delayed works in ${sectorLabel}`,
      `Which state has the most ${sectorLabel} projects?`,
      `What are the permissible specifications for ${sectorLabel}?`
    ]
  };
}

// 6. Risk, Delay, Anomaly & Vigilance Query
function handleRiskAnomalyQuery(db, prompt) {
  const riskCounts = db.prepare(`
    SELECT 
      SUM(CASE WHEN risk_score >= 70 THEN 1 ELSE 0 END) as critical_count,
      SUM(CASE WHEN risk_score >= 40 AND risk_score < 70 THEN 1 ELSE 0 END) as medium_count,
      SUM(CASE WHEN risk_score < 40 THEN 1 ELSE 0 END) as low_count,
      COUNT(1) as total_assessed
    FROM risk_assessments
  `).get();

  const topRisks = db.prepare(`
    SELECT 
      w.id, w.title, w.category, w.sanctioned_amount, w.expenditure, w.physical_progress,
      r.risk_score, r.risk_level, r.delay_probability, r.progress_gap_score, r.recommendations,
      s.name as state_name, d.name as district_name
    FROM risk_assessments r
    JOIN works w ON r.work_id = w.id
    LEFT JOIN states s ON w.state_id = s.state_id
    LEFT JOIN districts d ON w.district_id = d.district_id
    ORDER BY r.risk_score DESC, w.sanctioned_amount DESC
    LIMIT 5
  `).all();

  const alertSummary = db.prepare(`
    SELECT alert_type, severity, COUNT(1) as count
    FROM alerts
    GROUP BY alert_type, severity
    ORDER BY count DESC
    LIMIT 4
  `).all();

  const answer = `### 🚨 AI Surveillance & Anomaly Intelligence\n\n` +
    `The system's real-time Isolation Forest & Rule Surveillance Engine has evaluated **${(riskCounts?.total_assessed || 0).toLocaleString('en-IN')} active works**:\n\n` +
    `- **🔴 Critical / High Risk (Score ≥ 70):** **${(riskCounts?.critical_count || 0).toLocaleString('en-IN')} works**\n` +
    `- **🟡 Moderate / Medium Risk (40 - 69):** **${(riskCounts?.medium_count || 0).toLocaleString('en-IN')} works**\n` +
    `- **🟢 Low Risk / Compliant (< 40):** **${(riskCounts?.low_count || 0).toLocaleString('en-IN')} works**\n\n` +
    `#### 🚩 Top Anomaly & High-Risk Works:\n` +
    topRisks.map(r => 
      `- **${r.title}** (${r.district_name || 'District'}, ${r.state_name || 'State'})\n` +
      `  • ID: \`${r.id}\` | **Risk Score: ${r.risk_score}/100 [${r.risk_level}]**\n` +
      `  • Progress: **${r.physical_progress}%** | Sanctioned: **${formatCurrency(r.sanctioned_amount)}** | Spent: **${formatCurrency(r.expenditure)}**\n` +
      `  • Delay Probability: **${r.delay_probability}%** | Progress Gap: **${r.progress_gap_score}%**\n` +
      `  • *Guidance:* ${r.recommendations}`
    ).join('\n') +
    `\n\n#### ⚠️ Dominant Risk Alert Vectors:\n` +
    alertSummary.map(a => `- **${a.alert_type}** [${a.severity}]: ${a.count.toLocaleString('en-IN')} trigger events`).join('\n') +
    `\n\n**Action Recommendation:** Deploy District Inspection Teams to verify physical ground reality prior to any further financial disbursals.`;

  return {
    answer,
    dataContext: { riskCounts, topRisks, alertSummary },
    suggestedQuestions: [
      `Show delayed works with > 50 Lakhs expenditure`,
      `How does the AI compute the Risk Score?`,
      `Show contractor concentration risks`
    ]
  };
}

// 7. National Financial Overview
function handleFinanceQuery(db, prompt) {
  const fin = db.prepare(`
    SELECT 
      COUNT(1) as total_works,
      COALESCE(SUM(sanctioned_amount), 0) as total_sanctioned,
      COALESCE(SUM(released_amount), 0) as total_released,
      COALESCE(SUM(expenditure), 0) as total_spent,
      ROUND(AVG(physical_progress), 1) as avg_progress,
      SUM(CASE WHEN expenditure = 0 AND sanctioned_amount > 0 THEN 1 ELSE 0 END) as zero_exp_count,
      SUM(CASE WHEN physical_progress = 100 THEN 1 ELSE 0 END) as fully_completed
    FROM works
  `).get();

  const totalSanctioned = fin.total_sanctioned || 0;
  const totalSpent = fin.total_spent || 0;
  const unspent = totalSanctioned - totalSpent;
  const utilRate = totalSanctioned > 0 ? ((totalSpent / totalSanctioned) * 100).toFixed(1) : 0;
  const avgCost = fin.total_works > 0 ? (totalSanctioned / fin.total_works) : 0;

  const answer = `### 💰 National Financial & Budget Analysis\n\n` +
    `Current fiscal execution status across the centralized MPLADS repository:\n\n` +
    `- **Total Monitored Works:** **${fin.total_works.toLocaleString('en-IN')} projects**\n` +
    `- **Cumulative Sanctioned Outlay:** **${formatCurrency(totalSanctioned)}**\n` +
    `- **Cumulative Disbursed Expenditure:** **${formatCurrency(totalSpent)}**\n` +
    `- **National Fund Utilization Rate:** **${utilRate}%**\n` +
    `- **Estimated Unspent / Committed Balance:** **${formatCurrency(unspent)}**\n` +
    `- **Average Project Outlay:** **${formatCurrency(avgCost)}** per work\n` +
    `- **Works with Zero Expenditure:** **${fin.zero_exp_count.toLocaleString('en-IN')} works** (Sanctioned but awaiting initial tranche)\n` +
    `- **Fully Executed (100% Progress):** **${fin.fully_completed.toLocaleString('en-IN')} works**\n\n` +
    `**Statutory Flow Mechanism:** Under MoSPI 2023 Guidelines, funds are non-lapsable throughout the MP's tenure and flow directly via Central PFMS into State Single Nodal Agency (SNA) accounts.`;

  return {
    answer,
    dataContext: { fin },
    suggestedQuestions: [
      "Which states have the lowest fund utilization?",
      "Show works where 100% payment released but progress < 50%",
      "Explain the SNA account and PFMS mechanism"
    ]
  };
}

// 8. Contractor & Implementing Agency Query
function handleContractorQuery(db, prompt, contractorQuery) {
  let contractors = [];
  if (contractorQuery && contractorQuery.length > 2) {
    contractors = db.prepare(`
      SELECT contractor_name, contractor_type, total_works, total_expenditure, risk_score, status
      FROM contractors
      WHERE contractor_name LIKE ?
      ORDER BY total_works DESC
      LIMIT 5
    `).all(`%${contractorQuery}%`);
  }

  if (contractors.length === 0) {
    contractors = db.prepare(`
      SELECT contractor_name, contractor_type, total_works, total_expenditure, risk_score, status
      FROM contractors
      ORDER BY total_works DESC
      LIMIT 5
    `).all();
  }

  const highRiskVendors = db.prepare(`
    SELECT contractor_name, total_works, total_expenditure, risk_score
    FROM contractors
    WHERE risk_score >= 50
    ORDER BY risk_score DESC
    LIMIT 3
  `).all();

  const answer = `### 🏢 Contractor & Agency Performance Intelligence\n\n` +
    `The database indexes **21,482 implementing agencies and contractors** executing MPLADS works:\n\n` +
    `#### 🏆 Top Implementing Contractors by Volume:\n` +
    contractors.map(c => 
      `- **${c.contractor_name}** (${c.contractor_type || 'Vendor'}): **${c.total_works} works** | Outlay: **${formatCurrency(c.total_expenditure)}** | Risk: **${c.risk_score}/100** [${c.status}]`
    ).join('\n') +
    `\n\n#### 🚩 High Risk / Vigilance Monitored Contractors:\n` +
    (highRiskVendors.length > 0 ? highRiskVendors.map(v => `- **${v.contractor_name}:** Risk **${v.risk_score}/100** across ${v.total_works} works (${formatCurrency(v.total_expenditure)})`).join('\n') : '- No critical contractors flagged.') +
    `\n\n**MoSPI Procurement Mandate:** MPs are strictly prohibited from nominating or selecting commercial contractors. All works must be tendered by the Nodal District Authority in accordance with the State Public Works Department (PWD) / CPWD open e-procurement guidelines.`;

  return {
    answer,
    dataContext: { contractors, highRiskVendors },
    suggestedQuestions: [
      "Which contractors have the highest delay rate?",
      "Can an MP choose their own contractor?",
      "Show all works awarded to KRIDL"
    ]
  };
}

// 9. Statutory MoSPI Guidelines 2023 Intelligence
function handleMospiGuidelinesQuery(db, prompt, subTopic) {
  let answer = "";
  let suggested = [];

  if (subTopic === 'sc_st') {
    answer = `### 📜 MoSPI Statutory Guideline: SC & ST Area Allocations\n\n` +
      `Under **Paragraph 2.5 of the MPLADS Operational Guidelines 2023**:\n\n` +
      `1. **Mandatory 15% Allocation for SC Areas:**\n` +
      `   - Every Member of Parliament must recommend works costing at least **15% of their annual MPLADS entitlement (₹75 Lakhs per year)** for areas predominantly inhabited by Scheduled Castes (SC).\n\n` +
      `2. **Mandatory 7.5% Allocation for ST Areas:**\n` +
      `   - Every MP must recommend works costing at least **7.5% of their annual MPLADS entitlement (₹37.5 Lakhs per year)** for areas predominantly inhabited by Scheduled Tribes (ST).\n\n` +
      `3. **Exemptions & Special Provisions:**\n` +
      `   - If a Parliamentary Constituency has an ST population below 7.5% or SC population below 15%, the MP may recommend works in areas with highest available concentration, or contribute to other SC/ST areas within the State upon certification by the District Authority.\n\n` +
      `4. **District Authority Duty:**\n` +
      `   - The District Collector must explicitly certify and track SC/ST earmarked funds on the centralized MPLADS portal before sanctioning general category works.`;

    suggested = [
      "What are the permissible works in SC/ST areas?",
      "What happens if an MP does not fulfill the 15% SC quota?",
      "Show SC/ST allocation tracking across states"
    ];
  } else if (subTopic === 'prohibited') {
    answer = `### 🚫 MoSPI Prohibited Works (Negative List)\n\n` +
      `Under **Annexure-II of the Revised MPLADS Guidelines 2023**, public funds **CANNOT** be sanctioned for:\n\n` +
      `- **❌ Private & Commercial Benefits:** Works benefiting private individuals, commercial corporations, or private institutions.\n` +
      `- **❌ Places of Worship:** Construction or repair of religious places, temples, mosques, churches, shrines, or ashrams.\n` +
      `- **❌ Memorials & Statues:** Construction of statues, monuments, memorial arches, or gates naming living individuals.\n` +
      `- **❌ Office Furniture & Equipment:** Consumables, routine office furniture, air conditioners, or vehicles for government offices.\n` +
      `- **❌ Land Acquisition:** Purchase of land or payment of compensation for land acquisition.\n` +
      `- **❌ Recurring Expenses:** Maintenance grants, salaries, recurring repairs, or recurring operational costs.\n` +
      `- **❌ Incomplete Multi-Phase Works:** Works without assured funding for complete execution or incomplete works where full utility is not created.\n\n` +
      `**Compliance Enforcement:** Any proposal violating the Negative List will trigger automated portal rejection and administrative inquiry.`;

    suggested = [
      "What works ARE permissible under MPLADS?",
      "Can MPLADS fund ambulances or school buses?",
      "What is the penalty for sanctioning a prohibited work?"
    ];
  } else if (subTopic === 'permissible') {
    answer = `### ✅ MoSPI Permissible Works (Positive List & Priorities)\n\n` +
      `Under **Paragraph 3 of the Revised MPLADS Guidelines 2023**, priority is given to durable public assets:\n\n` +
      `1. **🚰 Drinking Water & Sanitation:** Deep borewells, overhead community tanks, RO plants, piped water extensions, public toilets in schools/markets.\n` +
      `2. **🏫 Education:** Additional classrooms, laboratories, public libraries, smart classrooms, toilets in government/aided schools.\n` +
      `3. **🏥 Public Health:** Primary Health Center (PHC) infrastructure, community health sub-centers, ambulances to government hospitals.\n` +
      `4. **🛣️ Roads, Pathways & Bridges:** Rural link roads, culverts, foot-bridges, all-weather concrete pathways in underserved hamlets.\n` +
      `5. **⚡ Electricity & Renewable Energy:** Solar street lighting, community solar pumps, electrification in unelectrified habitations.\n` +
      `6. **🤝 Community Infrastructure:** Public community halls, crematorium sheds, burial ground boundary walls, public sports facilities.\n` +
      `7. **🚨 Disaster Mitigation:** Up to ₹1.00 Crore per annum for disaster relief/reconstruction in areas hit by severe natural calamities outside the MP's constituency.`;

    suggested = [
      "What works are prohibited under the Negative List?",
      "What is the maximum amount an MP can recommend per work?",
      "How are school buses sanctioned under MPLADS?"
    ];
  } else if (subTopic === 'rules') {
    answer = `### 🏛️ MPLADS Scheme Financial Architecture (2023 Revision)\n\n` +
      `- **Annual Entitlement:** **₹5.00 Crore per MP per annum**.\n` +
      `- **Disbursement Tranches:** Released by MoSPI in **two equal tranches of ₹2.50 Crore each**.\n` +
      `- **Single Nodal Agency (SNA) Model:**\n` +
      `  • Funds flow directly from Central Government to the State Single Nodal Agency account via the Public Financial Management System (PFMS).\n` +
      `  • End-to-end electronic payments with just-in-time releases to prevent idle parking of public funds.\n` +
      `- **Non-Lapsable Nature:** Funds are non-lapsable within the 5-year tenure of the MP.\n` +
      `- **Interest Accrual:** All interest accrued on unutilized balances in SNA bank accounts must be remitted back to the Consolidated Fund of India.\n` +
      `- **Role of Lok Sabha MP:** Recommends works located strictly within their elected constituency.\n` +
      `- **Role of Rajya Sabha MP:** Recommends works in one or more districts within their State of election.\n` +
      `- **Nominated MPs:** May recommend works in any district across the entire country.`;

    suggested = [
      "What is the timeline for the District Collector to sanction works?",
      "What are the SC/ST quota requirements?",
      "What happens to unspent funds after an MP's term expires?"
    ];
  } else {
    answer = `### 📜 MoSPI Statutory Governance & District Authority Role\n\n` +
      `Under the **MPLADS Operational Guidelines 2023**:\n\n` +
      `- **District Authority (District Magistrate / Collector / Deputy Commissioner):**\n` +
      `  • Serves as the statutory Nodal Authority responsible for overall implementation.\n` +
      `  • Must examine and sanction eligible works within **75 days** of receiving MP recommendations.\n` +
      `  • Must provide written justification to the MP if any recommendation is rejected.\n` +
      `- **Implementing Agency Selection:**\n` +
      `  • Must be a government department, public sector enterprise, or reputed local authority capable of executing the work.\n` +
      `- **Mandatory Field Inspections:**\n` +
      `  • District Authority must physically inspect at least **10% of all ongoing/completed works** annually.\n` +
      `- **Plaque & Attribution:**\n` +
      `  • All completed assets must prominently display a permanent plaque stating *"Constructed under the Member of Parliament Local Area Development Scheme (MPLADS)"* with MP's name and sanction year.`;

    suggested = [
      "What is the 75-day sanction rule?",
      "Show all permissible works under MPLADS",
      "Show prohibited works under the Negative List"
    ];
  }

  return {
    answer,
    dataContext: { topic: 'MoSPI Guidelines 2023', subTopic },
    suggestedQuestions: suggested
  };
}

// 10. AI Algorithm & Anomaly Detection Explanation
function handleAiAlgorithmExplanation() {
  return {
    answer: `### 🧠 MPLADS AI Surveillance Architecture\n\n` +
      `The system utilizes a dual-engine architecture combining **Machine Learning (Isolation Forest)** with **Statutory Rule Ensembles**:\n\n` +
      `1. **Risk Score (0 to 100):**\n` +
      `   - **Critical / High (≥ 70):** Immediate forensic audit and field inspection required.\n` +
      `   - **Medium (40 - 69):** Heightened milestone monitoring.\n` +
      `   - **Low (< 40):** Standard operational processing.\n\n` +
      `2. **Core Anomaly Vectors:**\n` +
      `   - **Progress Gap Score:** Discrepancy between financial disbursements (funds spent) and physical ground progress.\n` +
      `   - **Delay Probability:** Forecast of deadline slippage derived from historical contractor throughput and milestone velocity.\n` +
      `   - **Agency Concentration Score:** Flagging disproportionate work bundling where single contractors monopolize sanctions.\n` +
      `   - **Duplicate Detection:** Text & geospatial clustering flagging duplicate works recommended at the same coordinates.`,
    dataContext: { model: 'IsolationForest + RuleEnsemble', features: ['ProgressGap', 'DelayProb', 'AgencyConcentration', 'DuplicateRisk'] },
    suggestedQuestions: [
      "Show top 5 high-risk works right now",
      "Show works with high agency concentration",
      "Show stalled projects with > 50 Lakhs budget"
    ]
  };
}

// 11. General Database Keyword Search & Intelligent Fallback
function handleGeneralSearchFallback(db, prompt) {
  // Extract significant words (> 3 letters, non-stopword)
  const stopwords = new Set(['what', 'when', 'where', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'show', 'tell', 'give', 'list', 'about', 'some', 'many', 'much', 'with', 'from', 'into', 'have', 'does', 'please', 'help', 'there', 'their', 'could', 'would', 'should']);
  const tokens = prompt.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2 && !stopwords.has(t));

  for (const token of tokens) {
    if (token.length < 3) continue;
    const searchParam = `%${token}%`;
    const matchedWorks = db.prepare(`
      SELECT w.id, w.title, w.category, w.sanctioned_amount, w.expenditure, w.physical_progress, w.status,
             s.name as state_name, d.name as district_name
      FROM works w
      LEFT JOIN states s ON w.state_id = s.state_id
      LEFT JOIN districts d ON w.district_id = d.district_id
      WHERE w.title LIKE ? OR w.description LIKE ?
      ORDER BY w.sanctioned_amount DESC
      LIMIT 4
    `).all(searchParam, searchParam);

    if (matchedWorks.length > 0) {
      const answer = `### 🔍 Targeted Database Matches for "${token}"\n\n` +
        `Discovered **${matchedWorks.length} high-relevance records** matching your search criteria:\n\n` +
        matchedWorks.map(w => 
          `- **${w.title}**\n` +
          `  • ID: \`${w.id}\` | Location: **${w.district_name || 'District'}, ${w.state_name || 'State'}**\n` +
          `  • Category: ${w.category} | Status: **${w.status}** (${w.physical_progress}% progress)\n` +
          `  • Sanctioned: **${formatCurrency(w.sanctioned_amount)}** | Spent: **${formatCurrency(w.expenditure)}**`
        ).join('\n') +
        `\n\n**Next Step:** You can ask for a full audit dossier on any of the Work IDs listed above.`;

      return {
        answer,
        dataContext: { matchedWorks },
        suggestedQuestions: [
          `Show work details for ${matchedWorks[0]?.id}`,
          `Show all high risk works in ${matchedWorks[0]?.state_name || 'this state'}`,
          `Analyze expenditure trends for ${matchedWorks[0]?.category}`
        ]
      };
    }
  }

  // Omni-Intelligence Welcome & Capability Overview
  const stats = db.prepare(`
    SELECT 
      (SELECT count(1) FROM works) as works_count,
      (SELECT count(1) FROM states) as states_count,
      (SELECT count(1) FROM districts) as districts_count,
      (SELECT count(1) FROM risk_assessments WHERE risk_score >= 70) as critical_risks
  `).get();

  const answer = `### 🤖 NitiMitra — MPLADS-SAMIKSHA AI Copilot\n\n` +
    `I am **NitiMitra**, your natural language decision-support assistant for MPLADS-SAMIKSHA, directly linked to **${(stats?.works_count || 0).toLocaleString('en-IN')} monitored works** across **${stats?.districts_count || 0} districts** and **${stats?.states_count || 0} States/UTs**.\n\n` +
    `I can answer questions across every facet of the MPLADS program:\n\n` +
    `1. **🏛️ State & District Queries:** *"Show works in Uttar Pradesh"*, *"Status of Varanasi district"*\n` +
    `2. **👤 MP Portfolios:** *"Works recommended by Pralhad Joshi"*, *"Top MPs by expenditure"*\n` +
    `3. **🏗️ Infrastructure Sectors:** *"School projects"*, *"Drinking water works"*, *"Solar lights"*\n` +
    `4. **🔍 Work ID Dossiers:** *"Lookup WS/MP620/2024-2025/133166"*, *"Details of 209817"*\n` +
    `5. **🚨 AI Risk & Anomalies:** *"Top 5 high risk works"*, *"Stalled projects with high spend"*\n` +
    `6. **📜 MoSPI Guidelines 2023:** *"What is the SC/ST 15% quota?"*, *"What works are prohibited?"*, *"SNA fund rules"*`;

  return {
    answer,
    dataContext: { stats },
    suggestedQuestions: [
      "Top 5 high-risk works right now",
      "Show fund utilization across Uttar Pradesh",
      "What works are prohibited under the Negative List?",
      "Show drinking water projects with high progress"
    ]
  };
}

/**
 * Main query dispatcher
 */
function handleCopilotQuery(db, prompt, user) {
  if (!prompt || !prompt.trim()) {
    return {
      answer: "Please provide a query or select a suggested topic.",
      suggestedQuestions: ["Top 5 high-risk works right now", "Show works in Uttar Pradesh"]
    };
  }

  const cleanPrompt = prompt.trim();
  const lower = cleanPrompt.toLowerCase();

  // 1. Work ID Match (e.g. WS/MP..., WS/..., or numeric ID like 133166)
  const workIdRegex = /(WS\/[A-Za-z0-9_\-\/]+|\b\d{5,7}\b)/i;
  const workIdMatch = cleanPrompt.match(workIdRegex);
  if (workIdMatch && (lower.includes('ws/') || lower.includes('work') || lower.includes('project') || lower.includes('id') || lower.includes('lookup') || lower.includes('details') || lower.includes('dossier'))) {
    return handleWorkIdQuery(db, cleanPrompt, workIdMatch[1]);
  }

  // 2. MoSPI Guidelines Queries - Explicit word boundary checking
  if (/\b(sc|st|scheduled\s+caste|scheduled\s+tribe|tribal)\b/i.test(lower) && !lower.includes('negative') && !lower.includes('prohibit')) {
    return handleMospiGuidelinesQuery(db, lower, 'sc_st');
  }
  if (/\b(prohibit|prohibited|negative\s+list|not\s+allow|not\s+allowed|not\s+permit|barred|bar|cannot\s+be\s+sanctioned)\b/i.test(lower)) {
    return handleMospiGuidelinesQuery(db, lower, 'prohibited');
  }
  if (/\b(permiss|permissible|positive\s+list|eligible\s+work|allowed\s+work|priority\s+work|can\s+mp\s+recommend)\b/i.test(lower)) {
    return handleMospiGuidelinesQuery(db, lower, 'permissible');
  }
  if (/\b(5\s*cr|5\s*crore|annual\s+quota|entitlement|tranche|installment|sna|pfms)\b/i.test(lower)) {
    return handleMospiGuidelinesQuery(db, lower, 'rules');
  }
  if (/\b(collector|district\s+magistrate|deputy\s+commissioner|75\s*day|nodal\s+authority)\b/i.test(lower)) {
    return handleMospiGuidelinesQuery(db, lower, 'collector');
  }

  // 3. AI Algorithm / Detection Explanation
  if (lower.includes('algorithm') || lower.includes('how does ai') || lower.includes('isolation forest') || lower.includes('how risk score') || lower.includes('how is risk calculated')) {
    return handleAiAlgorithmExplanation();
  }

  // 4. MP Search - Check by name or explicit "recommended by" / "mp"
  const mpKeywords = cleanPrompt.replace(/[^a-zA-Z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !['works', 'recommended', 'recommend', 'what', 'show', 'list', 'about', 'from', 'tell', 'give', 'projects'].includes(w.toLowerCase()));
  if (mpKeywords.length > 0 && (lower.includes('mp') || lower.includes('parliament') || lower.includes('recommended') || lower.includes('joshi') || lower.includes('modi') || lower.includes('rahul') || lower.includes('sharma') || lower.includes('singh') || lower.includes('kumar') || lower.includes('pralhad'))) {
    for (const kw of mpKeywords) {
      const testMp = db.prepare(`
        SELECT mp_name FROM works 
        WHERE mp_name IS NOT NULL AND mp_name != '' AND mp_name LIKE ?
        LIMIT 1
      `).get(`%${kw}%`);

      if (testMp) {
        return handleMpQuery(db, cleanPrompt, testMp.mp_name);
      }
    }
  }

  if (lower.includes('top mp') || lower.includes('most works') || lower.includes('mp expenditure') || lower.includes('which mp')) {
    return handleMpQuery(db, cleanPrompt, '');
  }

  // 5. State Search
  const allStates = db.prepare(`SELECT state_id, name, code FROM states`).all();
  const stateAliases = {
    'up': 'Uttar Pradesh',
    'mp': 'Madhya Pradesh',
    'ap': 'Andhra Pradesh',
    'tn': 'Tamil Nadu',
    'wb': 'West Bengal',
    'rj': 'Rajasthan',
    'gj': 'Gujarat',
    'ka': 'Karnataka',
    'kl': 'Kerala',
    'mh': 'Maharashtra',
    'pb': 'Punjab',
    'hr': 'Haryana',
    'br': 'Bihar',
    'od': 'Odisha',
    'ts': 'Telangana',
    'jh': 'Jharkhand',
    'cg': 'Chhattisgarh',
    'uk': 'Uttarakhand',
    'dl': 'Delhi',
    'jk': 'Jammu and Kashmir'
  };

  let matchedState = null;
  for (const s of allStates) {
    const sNameLower = s.name.toLowerCase();
    const regex = new RegExp(`\\b${sNameLower}\\b`, 'i');
    if (regex.test(lower)) {
      matchedState = s;
      break;
    }
  }

  if (!matchedState) {
    for (const [alias, fullName] of Object.entries(stateAliases)) {
      const aliasRegex = new RegExp(`\\b${alias}\\b`, 'i');
      if (aliasRegex.test(lower) && (lower.includes('state') || lower.includes('works') || lower.includes('projects') || lower.includes('spend') || lower.includes('fund') || lower.includes('in '))) {
        matchedState = allStates.find(s => s.name.toLowerCase() === fullName.toLowerCase());
        if (matchedState) break;
      }
    }
  }

  if (matchedState) {
    return handleStateQuery(db, cleanPrompt, matchedState);
  }

  // 6. District Search
  const districtMatch = db.prepare(`
    SELECT district_id, name, state_id 
    FROM districts 
    WHERE ? LIKE '%' || LOWER(name) || '%' AND LENGTH(name) > 3
    ORDER BY LENGTH(name) DESC
    LIMIT 1
  `).get(lower);

  if (districtMatch && (lower.includes('district') || lower.includes('in ') || lower.includes('status') || lower.includes('expenditure') || lower.includes('works'))) {
    return handleDistrictQuery(db, cleanPrompt, districtMatch);
  }

  // 7. Sector & Topic Match
  const sectors = [
    { keys: ['school', 'education', 'classroom', 'college', 'library', 'student', 'shiksha'], label: 'Education & Schools', searchKey: 'school' },
    { keys: ['water', 'drinking water', 'borewell', 'tubewell', 'pipeline', 'tank', 'jal'], label: 'Drinking Water & Sanitation', searchKey: 'water' },
    { keys: ['road', 'bridge', 'pathway', 'culvert', 'cc road', 'highway', 'rasta'], label: 'Roads, Bridges & Connectivity', searchKey: 'road' },
    { keys: ['health', 'hospital', 'clinic', 'phc', 'ambulance', 'medical', 'dispensary'], label: 'Public Health & Healthcare', searchKey: 'health' },
    { keys: ['solar', 'light', 'electricity', 'lamp', 'energy', 'urja'], label: 'Solar & Renewable Electrification', searchKey: 'solar' },
    { keys: ['community', 'bhavan', 'hall', 'samudayik', 'kalyana', 'mandap'], label: 'Community Infrastructure & Halls', searchKey: 'community' },
    { keys: ['sanitation', 'toilet', 'swachh', 'drain', 'sewerage', 'swachhata'], label: 'Sanitation & Cleanliness', searchKey: 'toilet' },
    { keys: ['crematorium', 'burial', 'shmashan', 'kabristan'], label: 'Crematoriums & Burial Grounds', searchKey: 'crematorium' }
  ];

  for (const s of sectors) {
    if (s.keys.some(k => lower.includes(k))) {
      return handleSectorQuery(db, cleanPrompt, s.searchKey, s.label);
    }
  }

  // 8. Risk, Anomaly, Delay, Overrun & Fraud
  if (lower.includes('risk') || lower.includes('anomaly') || lower.includes('fraud') || lower.includes('delay') || lower.includes('stalled') || lower.includes('overrun') || lower.includes('behind schedule') || lower.includes('critical') || lower.includes('investigation') || lower.includes('vigilance')) {
    return handleRiskAnomalyQuery(db, cleanPrompt);
  }

  // 9. Financial, Budget & Expenditure
  if (lower.includes('fund') || lower.includes('finance') || lower.includes('budget') || lower.includes('expenditure') || lower.includes('money') || lower.includes('utilization') || lower.includes('unspent') || lower.includes('disburs') || lower.includes('sanction')) {
    return handleFinanceQuery(db, cleanPrompt);
  }

  // 10. Contractor & Implementing Agency
  if (lower.includes('contractor') || lower.includes('vendor') || lower.includes('agency') || lower.includes('implementing agency') || lower.includes('kridl') || lower.includes('pwd') || lower.includes('cpwd')) {
    let vendorName = '';
    if (lower.includes('kridl')) vendorName = 'KRIDL';
    return handleContractorQuery(db, cleanPrompt, vendorName);
  }

  // 11. General Search & Fallback
  return handleGeneralSearchFallback(db, cleanPrompt);
}

module.exports = {
  handleCopilotQuery,
  handleWorkIdQuery,
  handleStateQuery,
  handleDistrictQuery,
  handleMpQuery,
  handleSectorQuery,
  handleRiskAnomalyQuery,
  handleFinanceQuery,
  handleContractorQuery,
  handleMospiGuidelinesQuery
};
