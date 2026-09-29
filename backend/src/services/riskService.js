/**
 * MPLADS Risk Intelligence Service (JavaScript)
 * Computes portfolio-level risk distributions and project-specific risk dossiers.
 */

const { getWorksForUser, getWorkById } = require('./workService');
const { getWorkSimilarities } = require('./similarityService');

function getRiskOverview(db, user = {}, filters = {}) {
  const role = user.role || "Ministry";
  const whereClauses = ["1=1"];
  const params = [];

  if (role === "MP") {
    if (user.constituency_id) {
      whereClauses.push("(w.constituency_id = ? OR LOWER(w.mp_name) LIKE ?)");
      params.push(user.constituency_id, `%${(user.name || '').toLowerCase().trim()}%`);
    } else if (user.state_id) {
      whereClauses.push("w.state_id = ?");
      params.push(user.state_id);
    }
  } else if (role === "District" && !filters.all_districts) {
    const did = filters.district_id ? Number(filters.district_id) : (user.district_id || 1);
    whereClauses.push("w.district_id = ?");
    params.push(did);
  } else if (role === "State" && !filters.all_states) {
    const sid = filters.state_id ? Number(filters.state_id) : (user.state_id || 1);
    whereClauses.push("w.state_id = ?");
    params.push(sid);
    if (filters.district_id && filters.district_id !== 'All') {
      whereClauses.push("w.district_id = ?");
      params.push(Number(filters.district_id));
    }
  } else {
    // Ministry / Admin / Central Overseer
    if (filters.state_id && filters.state_id !== "All") {
      whereClauses.push("w.state_id = ?");
      params.push(Number(filters.state_id));
    }
    if (filters.district_id && filters.district_id !== "All") {
      whereClauses.push("w.district_id = ?");
      params.push(Number(filters.district_id));
    }
    if (filters.constituency_id && filters.constituency_id !== "All") {
      whereClauses.push("w.constituency_id = ?");
      params.push(Number(filters.constituency_id));
    }
  }

  if (filters.house_type && filters.house_type !== "All") {
    whereClauses.push("w.house_type = ?");
    params.push(filters.house_type);
  }

  const whereSql = whereClauses.join(" AND ");
  const sql = `
    SELECT 
      COUNT(w.id) as total,
      COALESCE(SUM(CASE WHEN r.risk_level IN ('High', 'Critical') OR r.risk_score >= 60 THEN 1 ELSE 0 END), 0) as high,
      COALESCE(SUM(CASE WHEN r.risk_level = 'Medium' OR (r.risk_score >= 20 AND r.risk_score < 60) THEN 1 ELSE 0 END), 0) as med,
      COALESCE(SUM(CASE WHEN (r.risk_level = 'Low' OR r.risk_score < 20) AND r.risk_level NOT IN ('Medium', 'High', 'Critical') THEN 1 ELSE 0 END), 0) as low,
      COALESCE(AVG(COALESCE(r.risk_score, 18.0)), 0.0) as avg_score
    FROM works w
    LEFT JOIN risk_assessments r ON w.id = r.work_id
    WHERE ${whereSql}
  `;

  try {
    const row = db.prepare(sql).get(...params);
    const total = Number(row?.total || 0);
    const high = Number(row?.high || 0);
    const med = Number(row?.med || 0);
    const low = Number(row?.low || 0);
    const avgScore = Math.round(Number(row?.avg_score || 0) * 10) / 10;

    return {
      total_assessed: total,
      high_risk_count: high,
      medium_risk_count: med,
      low_risk_count: low,
      average_score: avgScore,
      distribution: [
        { name: "High Risk", value: high, color: "#ef4444" },
        { name: "Medium Risk", value: med, color: "#f59e0b" },
        { name: "Low Risk", value: low, color: "#10b981" }
      ]
    };
  } catch (e) {
    const works = getWorksForUser(db, user);
    const total = works.length;
    let high = 0, med = 0, low = 0, scoreSum = 0;
    for (const w of works) {
      if (w.risk_level === 'High') high++;
      else if (w.risk_level === 'Medium') med++;
      else low++;
      scoreSum += (w.risk_score || 0);
    }
    const avgScore = total > 0 ? Math.round((scoreSum / total) * 10) / 10 : 0.0;
    return {
      total_assessed: total,
      high_risk_count: high,
      medium_risk_count: med,
      low_risk_count: low,
      average_score: avgScore,
      distribution: [
        { name: "High Risk", value: high, color: "#ef4444" },
        { name: "Medium Risk", value: med, color: "#f59e0b" },
        { name: "Low Risk", value: low, color: "#10b981" }
      ]
    };
  }
}

function getWorkRiskDossier(db, workId) {
  const work = getWorkById(db, workId);
  if (!work) return {};

  const sanctioned = parseFloat(work.sanctioned_amount || 1.0);
  const estimated = parseFloat(work.estimated_cost || sanctioned || 1.0);
  const expenditure = parseFloat(work.expenditure || 0.0);
  const physicalProgress = parseFloat(work.physical_progress || 0.0);
  const paymentUtil = parseFloat(work.payment_utilization || (expenditure / Math.max(1.0, sanctioned) * 100.0));

  // 1. Cost & Financial Risk
  let costRisk = 15.0;
  const anomalies = [];
  const explanations = [];

  if (expenditure > sanctioned) {
    const overrunPct = Math.round(((expenditure - sanctioned) / sanctioned * 100.0) * 10) / 10;
    costRisk = Math.min(100.0, 70.0 + overrunPct);
    anomalies.push("COST_OVERRUN");
    explanations.push(`Expenditure (₹${(expenditure / 100000).toFixed(1)}L) exceeds sanctioned ceiling (₹${(sanctioned / 100000).toFixed(1)}L) by +${overrunPct}%.`);
  } else if (expenditure > 0 && sanctioned > 0) {
    costRisk = Math.min(60.0, (expenditure / sanctioned) * 50.0);
  }

  // 2. Delay Risk
  let delayRisk = 20.0;
  if (work.status === "Delayed") {
    delayRisk = 85.0;
    anomalies.push("MILESTONE_DELAY");
    explanations.push("Project execution has breached statutory completion milestone dates.");
  } else if (physicalProgress < 30.0 && paymentUtil > 50.0) {
    delayRisk = 65.0;
  }

  // 3. Payment vs Physical Gap
  const gap = paymentUtil - physicalProgress;
  let paymentRisk = 15.0;
  if (gap >= 25.0) {
    paymentRisk = 80.0;
    anomalies.push("PAYMENT_PHYSICAL_MISMATCH");
    explanations.push(`Payment disbursement (${paymentUtil.toFixed(0)}%) significantly outpaces on-ground physical completion (${physicalProgress.toFixed(0)}%) by ${gap.toFixed(0)}%.`);
  } else if (gap >= 15.0) {
    paymentRisk = 50.0;
  }

  // 4. Duplicate Risk
  const similarities = getWorkSimilarities(db, workId);
  let duplicateRisk = 10.0;
  if (similarities.length > 0 && similarities[0].similarity.composite_similarity >= 60.0) {
    duplicateRisk = similarities[0].similarity.composite_similarity;
    anomalies.push("POSSIBLE_DUPLICATE");
    explanations.push(`High textual and scope overlap (${duplicateRisk}%) identified with project ${similarities[0].candidate.id}.`);
  }

  // 5. Compliance Risk
  let complianceRisk = 15.0;
  if (anomalies.length > 0) {
    complianceRisk = Math.min(80.0, anomalies.length * 25.0);
  }

  // Composite Risk Score
  const compositeScore = Math.round(
    (costRisk * 0.35) +
    (delayRisk * 0.25) +
    (paymentRisk * 0.20) +
    (duplicateRisk * 0.10) +
    (complianceRisk * 0.10)
  );

  let riskTier = "Low";
  if (compositeScore >= 70) riskTier = "High";
  else if (compositeScore >= 40) riskTier = "Medium";

  if (explanations.length === 0) {
    explanations.push("Parameters within normal administrative tolerance. Monitoring ongoing.");
  }

  return {
    work_id: work.id,
    risk_score: compositeScore,
    risk_level: riskTier,
    cost_risk: Math.round(costRisk * 10) / 10,
    delay_risk: Math.round(delayRisk * 10) / 10,
    payment_risk: Math.round(paymentRisk * 10) / 10,
    duplicate_risk: Math.round(duplicateRisk * 10) / 10,
    compliance_risk: Math.round(complianceRisk * 10) / 10,
    anomalies,
    explanations
  };
}

module.exports = {
  getRiskOverview,
  getWorkRiskDossier
};
