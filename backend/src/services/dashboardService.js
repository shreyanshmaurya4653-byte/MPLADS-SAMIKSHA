/**
 * MPLADS Dashboard Analytics Service (JavaScript)
 * High-performance direct SQL aggregations supporting real-time jurisdictional filtering.
 */

const kpiCache = new Map();
const trendsCache = new Map();

function getCache(map, key, ttlMs = 30000) {
  const hit = map.get(key);
  if (hit && Date.now() - hit.timestamp < ttlMs) {
    return hit.data;
  }
  return null;
}

function setCache(map, key, data) {
  map.set(key, { data, timestamp: Date.now() });
  if (map.size > 200) {
    const oldest = map.keys().next().value;
    map.delete(oldest);
  }
}

function getDashboardKPIs(db, user = {}, filters = {}) {
  const cacheKey = JSON.stringify({ r: user.role, s: user.state_id, d: user.district_id, c: user.constituency_id, f: filters });
  const cached = getCache(kpiCache, cacheKey, 25000);
  if (cached) return cached;

  const role = user.role || "Ministry";
  const userStateId = user.state_id;
  const userDistId = user.district_id;
  const userConstId = user.constituency_id;

  // Build filtered WHERE clause
  let whereClauses = ["1=1"];
  const params = [];

  // Jurisdictional scoping
  if (role === "MP") {
    if (userConstId) {
      whereClauses.push("(w.constituency_id = ? OR LOWER(w.mp_name) LIKE ?)");
      params.push(userConstId, `%${(user.name || '').toLowerCase().trim()}%`);
    } else if (userStateId) {
      whereClauses.push("w.state_id = ?");
      params.push(userStateId);
    }
  } else if (role === "District") {
    const did = filters.district_id && filters.district_id !== "All" ? Number(filters.district_id) : (userDistId || 1);
    whereClauses.push("w.district_id = ?");
    params.push(did);
  } else if (role === "State") {
    const sid = filters.state_id && filters.state_id !== "All" ? Number(filters.state_id) : (userStateId || 1);
    whereClauses.push("w.state_id = ?");
    params.push(sid);
    if (filters.district_id && filters.district_id !== "All") {
      whereClauses.push("w.district_id = ?");
      params.push(Number(filters.district_id));
    }
  } else {
    // Ministry / Admin / Public
    if (filters.state_id && filters.state_id !== "All") {
      whereClauses.push("w.state_id = ?");
      params.push(Number(filters.state_id));
    }
    if (filters.district_id && filters.district_id !== "All") {
      whereClauses.push("w.district_id = ?");
      params.push(Number(filters.district_id));
    }
  }

  if (filters.subdivision && filters.subdivision !== "All") {
    whereClauses.push("w.subdivision = ?");
    params.push(filters.subdivision);
  }

  if (filters.constituency_id && filters.constituency_id !== "All") {
    whereClauses.push("w.constituency_id = ?");
    params.push(Number(filters.constituency_id));
  }

  if (filters.mp_name && filters.mp_name.trim() && filters.mp_name !== "All") {
    whereClauses.push("(LOWER(w.mp_name) LIKE ? OR LOWER(w.description) LIKE ?)");
    const mpTerm = `%${filters.mp_name.trim().toLowerCase()}%`;
    params.push(mpTerm, mpTerm);
  }

  if (filters.house_type && filters.house_type !== "All") {
    whereClauses.push("w.house_type = ?");
    params.push(filters.house_type);
  }

  if (filters.category && filters.category !== "All") {
    whereClauses.push("w.category = ?");
    params.push(filters.category);
  }

  if (filters.status && filters.status !== "All") {
    whereClauses.push("w.status = ?");
    params.push(filters.status);
  }

  const whereSql = whereClauses.join(" AND ");

  // Instantaneous SQL aggregation across works & risk_assessments
  const sql = `
    SELECT 
      COUNT(w.id) as total_works,
      COALESCE(SUM(CASE WHEN LOWER(w.status) LIKE '%complete%' OR LOWER(w.status) LIKE '%success%' THEN 1 ELSE 0 END), 0) as completed_works,
      COALESCE(SUM(CASE WHEN LOWER(w.status) LIKE '%progress%' OR LOWER(w.status) = 'ongoing' THEN 1 ELSE 0 END), 0) as ongoing_works,
      COALESCE(SUM(CASE WHEN LOWER(w.status) LIKE '%delay%' THEN 1 ELSE 0 END), 0) as delayed_works,
      COALESCE(SUM(CASE WHEN r.risk_level = 'High' OR r.risk_score >= 50 THEN 1 ELSE 0 END), 0) as high_risk_works,
      COALESCE(SUM(CASE WHEN r.risk_level = 'Critical' OR r.risk_score >= 65 THEN 1 ELSE 0 END), 0) as critical_risk_works,
      COALESCE(SUM(w.sanctioned_amount), 0) as total_sanctioned,
      COALESCE(SUM(w.expenditure), 0) as total_expenditure,
      COALESCE(SUM(w.released_amount), 0) as total_released
    FROM works w
    LEFT JOIN risk_assessments r ON w.id = r.work_id
    WHERE ${whereSql}
  `;

  const agg = db.prepare(sql).get(...params) || {};

  const totalWorks = Number(agg.total_works || 0);
  const completedWorks = Number(agg.completed_works || 0);
  const ongoingWorks = Number(agg.ongoing_works || 0);
  const delayedWorks = Number(agg.delayed_works || 0);
  const highRiskWorks = Number(agg.high_risk_works || 0);
  const criticalRiskWorks = Number(agg.critical_risk_works || 0);
  const totalSanctioned = Number(agg.total_sanctioned || 0);
  const totalExpenditure = Number(agg.total_expenditure || 0);
  const totalReleased = Number(agg.total_released || 0);

  const utilizationRate = totalSanctioned > 0
    ? Math.round((totalExpenditure / totalSanctioned * 100.0) * 10) / 10
    : (totalWorks > 0 && completedWorks === totalWorks ? 100.0 : 0.0);

  const unspentBalance = Math.max(0, totalSanctioned - totalExpenditure);

  // Parliamentary Entitlement Budget from constituencies table
  let activeMpsCount = 788;
  let entitlementAmount = 0;
  try {
    if (filters.house_type === 'Rajya Sabha' && (filters.district_id || filters.constituency_id)) {
      const rsMpsRow = db.prepare(
        "SELECT COUNT(DISTINCT w.mp_name) as rs_mp_count, COALESCE(SUM(w.sanctioned_amount), 0) as rs_sanctioned FROM works w WHERE " + whereSql
      ).get(...params);
      const rsMpCount = rsMpsRow?.rs_mp_count || 0;
      activeMpsCount = rsMpCount;

      const rsEntRow = db.prepare(
        "SELECT COALESCE(SUM(c.allocated_amount), 0) as total_ent FROM constituencies c WHERE c.house_type = 'Rajya Sabha' AND LOWER(c.mp_name) IN (SELECT DISTINCT LOWER(w.mp_name) FROM works w WHERE " + whereSql + ")"
      ).get(...params);

      if (rsEntRow?.total_ent && Number(rsEntRow.total_ent) > 0) {
        entitlementAmount = Number(rsEntRow.total_ent);
      } else if (rsMpCount > 0) {
        entitlementAmount = Math.max(rsMpCount * 50000000.0, Number(rsMpsRow?.rs_sanctioned || 0));
      }
    } else {
      let mpSql = "SELECT COUNT(DISTINCT constituency_id) as cnt, COALESCE(SUM(allocated_amount), 0) as total_ent FROM constituencies WHERE 1=1";
      const mpParams = [];
      if (role === "MP") {
        if (userConstId) {
          mpSql += " AND (constituency_id = ? OR LOWER(mp_name) LIKE ?)";
          mpParams.push(userConstId, `%${(user.name || '').toLowerCase().trim()}%`);
        } else if (userStateId) {
          mpSql += " AND state_id = ?";
          mpParams.push(userStateId);
        }
      } else {
        const did = (role === 'District') ? (filters.district_id || userDistId || 1) : filters.district_id;
        if (did && did !== "All") {
          mpSql += " AND district_id = ?";
          mpParams.push(Number(did));
        }
        if (filters.state_id && filters.state_id !== "All") {
          mpSql += " AND state_id = ?";
          mpParams.push(Number(filters.state_id));
        }
        if (filters.house_type && filters.house_type !== "All") {
          mpSql += " AND house_type = ?";
          mpParams.push(filters.house_type);
        }
        if (filters.constituency_id && filters.constituency_id !== "All") {
          mpSql += " AND constituency_id = ?";
          mpParams.push(Number(filters.constituency_id));
        }
        if (filters.mp_name && filters.mp_name.trim() && filters.mp_name !== "All") {
          mpSql += " AND (LOWER(mp_name) LIKE ? OR LOWER(constituency_name) LIKE ?)";
          const term = `%${filters.mp_name.trim().toLowerCase()}%`;
          mpParams.push(term, term);
        }
      }
      const r = db.prepare(mpSql).get(...mpParams);
      if (r) {
        if (r.cnt) activeMpsCount = r.cnt;
        if (r.total_ent && Number(r.total_ent) > 0) {
          entitlementAmount = Number(r.total_ent);
        }
      }
    }
  } catch (e) {}

  if (entitlementAmount === 0 && activeMpsCount > 0 && !(filters.house_type === 'Rajya Sabha' && totalWorks === 0)) {
    entitlementAmount = activeMpsCount * 50000000.0; // fallback ₹5 Cr per MP
  }

  const result = {
    total_works: totalWorks,
    completed_works: completedWorks,
    ongoing_works: ongoingWorks,
    delayed_works: delayedWorks,
    high_risk_works: highRiskWorks,
    critical_risk_works: criticalRiskWorks,
    total_sanctioned: totalSanctioned,
    total_expenditure: totalExpenditure,
    total_released: totalReleased,
    unspent_balance: unspentBalance,
    utilization_rate: utilizationRate,
    entitlement_amount: entitlementAmount,
    active_mps_count: activeMpsCount
  };
  setCache(kpiCache, cacheKey, result);
  return result;
}

function getFundUtilizationTrends(db, user = {}, filters = {}) {
  const cacheKey = JSON.stringify({ r: user.role, s: user.state_id, d: user.district_id, c: user.constituency_id, f: filters });
  const cached = getCache(trendsCache, cacheKey, 30000);
  if (cached) return cached;

  try {
    let baseSql = `
      SELECT 
        e.month_name as month,
        coalesce(sum(e.amount), 0) / 100000.0 as spent,
        coalesce(sum(w.sanctioned_amount), 0) / 100000.0 as sanctioned,
        coalesce(sum(w.released_amount), 0) / 100000.0 as released
      FROM expenditures e
      LEFT JOIN works w ON e.work_id = w.id
      WHERE 1=1
    `;
    const params = [];

    const role = user.role || "Ministry";
    if (role === "MP") {
      if (filters.constituency_id && filters.constituency_id !== "All") {
        baseSql += " AND w.constituency_id = ?";
        params.push(Number(filters.constituency_id));
      } else if (user.constituency_id) {
        baseSql += " AND (w.constituency_id = ? OR LOWER(w.mp_name) LIKE ?)";
        params.push(user.constituency_id, `%${(user.name || '').toLowerCase().trim()}%`);
      } else if (user.state_id) {
        baseSql += " AND w.state_id = ?";
        params.push(user.state_id);
      }
    } else if (role === "District") {
      const did = filters.district_id && filters.district_id !== "All" ? Number(filters.district_id) : (user.district_id || 1);
      baseSql += " AND w.district_id = ?";
      params.push(did);
    } else if (role === "State") {
      const sid = filters.state_id && filters.state_id !== "All" ? Number(filters.state_id) : (user.state_id || 1);
      baseSql += " AND w.state_id = ?";
      params.push(sid);
      if (filters.district_id && filters.district_id !== "All") {
        baseSql += " AND w.district_id = ?";
        params.push(Number(filters.district_id));
      }
    } else {
      if (filters.state_id && filters.state_id !== "All") {
        baseSql += " AND w.state_id = ?";
        params.push(Number(filters.state_id));
      }
      if (filters.district_id && filters.district_id !== "All") {
        baseSql += " AND w.district_id = ?";
        params.push(Number(filters.district_id));
      }
    }

    if (filters.subdivision && filters.subdivision !== "All") {
      baseSql += " AND w.subdivision = ?";
      params.push(filters.subdivision);
    }
    if (filters.house_type && filters.house_type !== "All") {
      baseSql += " AND w.house_type = ?";
      params.push(filters.house_type);
    }

    baseSql += `
      GROUP BY e.month_name 
      ORDER BY CASE e.month_name 
        WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3 WHEN 'Apr' THEN 4
        WHEN 'May' THEN 5 WHEN 'Jun' THEN 6 WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8
        WHEN 'Sep' THEN 9 WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
        ELSE 13 END ASC
    `;

    const rows = db.prepare(baseSql).all(...params);

    if (rows && rows.length > 0) {
      const res = rows.map(r => ({
        month: r.month,
        sanctioned: Math.round(r.sanctioned || r.spent * 1.15),
        released: Math.round(r.released || r.spent * 1.05),
        spent: Math.round(r.spent)
      }));
      setCache(trendsCache, cacheKey, res);
      return res;
    }

    // Direct fallback from works start_date
    let worksSql = `
      SELECT 
        case strftime('%m', start_date)
          when '01' then 'Jan' when '02' then 'Feb' when '03' then 'Mar'
          when '04' then 'Apr' when '05' then 'May' when '06' then 'Jun'
          when '07' then 'Jul' when '08' then 'Aug' when '09' then 'Sep'
          when '10' then 'Oct' when '11' then 'Nov' when '12' then 'Dec'
          else 'Q1' end as month,
        coalesce(sum(sanctioned_amount), 0) / 100000.0 as sanctioned,
        coalesce(sum(released_amount), 0) / 100000.0 as released,
        coalesce(sum(expenditure), 0) / 100000.0 as spent
      FROM works
      WHERE 1=1
    `;
    const wParams = [];
    if (role === "MP") {
      if (filters.constituency_id && filters.constituency_id !== "All") {
        worksSql += " AND constituency_id = ?";
        wParams.push(Number(filters.constituency_id));
      } else if (user.constituency_id) {
        worksSql += " AND (constituency_id = ? OR LOWER(mp_name) LIKE ?)";
        wParams.push(user.constituency_id, `%${(user.name || '').toLowerCase().trim()}%`);
      } else if (user.state_id) {
        worksSql += " AND state_id = ?";
        wParams.push(user.state_id);
      }
    } else if (role === "District") {
      const did = filters.district_id && filters.district_id !== "All" ? Number(filters.district_id) : (user.district_id || 1);
      worksSql += " AND district_id = ?";
      wParams.push(did);
    } else if (role === "State") {
      const sid = filters.state_id && filters.state_id !== "All" ? Number(filters.state_id) : (user.state_id || 1);
      worksSql += " AND state_id = ?";
      wParams.push(sid);
      if (filters.district_id && filters.district_id !== "All") {
        worksSql += " AND district_id = ?";
        wParams.push(Number(filters.district_id));
      }
    } else {
      if (filters.state_id && filters.state_id !== "All") {
        worksSql += " AND state_id = ?";
        wParams.push(Number(filters.state_id));
      }
      if (filters.district_id && filters.district_id !== "All") {
        worksSql += " AND district_id = ?";
        wParams.push(Number(filters.district_id));
      }
    }
    if (filters.subdivision && filters.subdivision !== "All") {
      worksSql += " AND subdivision = ?";
      wParams.push(filters.subdivision);
    }
    worksSql += " GROUP BY month ORDER BY month ASC";
    const wRows = db.prepare(worksSql).all(...wParams);

    return wRows.map(r => ({
      month: r.month,
      sanctioned: Math.round(r.sanctioned || 0),
      released: Math.round(r.released || r.sanctioned || 0),
      spent: Math.round(r.spent || 0)
    }));
  } catch (e) {
    return [];
  }
}

module.exports = {
  getDashboardKPIs,
  getFundUtilizationTrends
};
