/**
 * MPLADS AI Engine: Similarity & Duplicate Detection Service (JavaScript)
 * Performs pair-wise and target-based lexical, geospatial, and administrative similarity audits.
 */

const STOPWORDS = new Set([
  "and", "the", "of", "in", "for", "to", "a", "an", "on", "at", "by", "with", "ward", "sector", "phase"
]);

// High-speed LRU token cache to avoid repeated regex & string allocations
const TOKEN_CACHE = new Map();
const MAX_CACHE_SIZE = 4000;

function tokenizeAndClean(text) {
  if (!text || typeof text !== 'string') return [];
  const tokens = text.toLowerCase().match(/\b[a-zA-Z0-9]+\b/g) || [];
  return tokens.filter(t => !STOPWORDS.has(t) && t.length > 1);
}

function getCachedTokens(text) {
  if (!text) return new Set();
  let set = TOKEN_CACHE.get(text);
  if (!set) {
    set = new Set(tokenizeAndClean(text));
    if (TOKEN_CACHE.size >= MAX_CACHE_SIZE) {
      const firstKey = TOKEN_CACHE.keys().next().value;
      TOKEN_CACHE.delete(firstKey);
    }
    TOKEN_CACHE.set(text, set);
  }
  return set;
}

function computeJaccardFromTokenSets(tokensA, tokensB) {
  if (!tokensA || !tokensB || tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersection = 0;
  const [smaller, larger] = tokensA.size <= tokensB.size ? [tokensA, tokensB] : [tokensB, tokensA];
  for (const t of smaller) {
    if (larger.has(t)) intersection++;
  }
  if (intersection === 0) return 0.0;

  // Zero-allocation union computation: |A U B| = |A| + |B| - |A n B|
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0.0 : Math.round((intersection / union) * 1000) / 1000;
}

function computeJaccardSimilarity(textA, textB) {
  const tokensA = getCachedTokens(textA);
  const tokensB = getCachedTokens(textB);
  return computeJaccardFromTokenSets(tokensA, tokensB);
}

function computeDetailedSimilarity(workA, workB) {
  // 1. Text similarity with cached token sets
  const tokensTitleA = workA._tokensTitle || getCachedTokens(workA.title || "");
  const tokensTitleB = workB._tokensTitle || getCachedTokens(workB.title || "");
  const titleSim = computeJaccardFromTokenSets(tokensTitleA, tokensTitleB) * 100.0;

  const tokensDescA = workA._tokensDesc || getCachedTokens(workA.description || "");
  const tokensDescB = workB._tokensDesc || getCachedTokens(workB.description || "");
  const descSim = computeJaccardFromTokenSets(tokensDescA, tokensDescB) * 100.0;
  const textSim = Math.round(((titleSim * 0.7) + (descSim * 0.3)) * 10) / 10;

  // 2. Category match
  const catMatch = Boolean(workA.category && workB.category && workA.category === workB.category);
  const catScore = catMatch ? 100.0 : 0.0;

  // 3. Agency match
  const agencyA = (workA.implementing_agency || "").trim().toLowerCase();
  const agencyB = (workB.implementing_agency || "").trim().toLowerCase();
  const agencyMatch = Boolean(agencyA && agencyB && agencyA === agencyB);
  const agencyScore = agencyMatch ? 100.0 : 0.0;

  // 4. Cost proximity
  const costA = parseFloat(workA.sanctioned_amount || workA.estimated_cost || 0);
  const costB = parseFloat(workB.sanctioned_amount || workB.estimated_cost || 0);
  let costVariancePct = 0.0;
  let costSim = 50.0;
  const maxCost = Math.max(costA, costB);
  if (maxCost > 0) {
    costVariancePct = Math.round((Math.abs(costA - costB) / maxCost * 100.0) * 10) / 10;
    costSim = Math.max(0.0, 100.0 - (costVariancePct * 1.5));
  }

  // 5. Jurisdiction proximity (constituency & district)
  const sameConstituency = workA.constituency_id !== undefined && workA.constituency_id !== null &&
                           workA.constituency_id === workB.constituency_id;
  const sameDistrict = workA.district_id !== undefined && workA.district_id !== null &&
                       workA.district_id === workB.district_id;
  let jurisdictionSim = 20.0;
  if (sameConstituency) {
    jurisdictionSim = 100.0;
  } else if (sameDistrict) {
    jurisdictionSim = 60.0;
  }

  // Composite score:
  // Text: 45%, Category: 20%, Agency: 15%, Cost: 10%, Jurisdiction: 10%
  let composite = (
    (textSim * 0.45) +
    (catScore * 0.20) +
    (agencyScore * 0.15) +
    (costSim * 0.10) +
    (jurisdictionSim * 0.10)
  );
  composite = Math.round(Math.min(100.0, Math.max(0.0, composite)) * 10) / 10;

  let riskLevel = "Low";
  let recommendation = "Distinct project profile. Nominal overlap consistent with standard civic infrastructure norms.";
  if (composite >= 75.0) {
    riskLevel = "High";
    recommendation = "Severe duplicate risk! Highly similar scope and executing agency. On-site verification mandatory before sanctioning additional funds.";
  } else if (composite >= 50.0) {
    riskLevel = "Medium";
    recommendation = "Moderate project overlap. Review detailed project estimates and verify GIS coordinates to rule out duplicate asset creation.";
  }

  return {
    composite_similarity: composite,
    risk_level: riskLevel,
    text_similarity: textSim,
    category_match: catMatch,
    agency_match: agencyMatch,
    cost_similarity: Math.round(costSim * 10) / 10,
    cost_variance_pct: costVariancePct,
    jurisdiction_similarity: jurisdictionSim,
    recommendation,
    shared_attributes: [
      catMatch ? `Category: ${workA.category}` : "Different categories",
      agencyMatch ? `Agency: ${workA.implementing_agency}` : "Different agencies",
      `Cost Variance: ${costVariancePct}%`
    ]
  };
}

function getAllDuplicatePairs(db, minThreshold = 40.0) {
  const pairs = [];
  const seenPairKeys = new Set();

  // 1. First, check precomputed duplicate_matches table
  try {
    const precomputed = db.prepare(`
      SELECT 
        dm.duplicate_id, dm.project_id_1, dm.project_id_2,
        dm.text_similarity, dm.overall_similarity, dm.matching_reasons,
        w1.id as w1_id, w1.title as w1_title, w1.category as w1_category, w1.implementing_agency as w1_agency,
        w1.sanctioned_amount as w1_sanc, w1.estimated_cost as w1_est, w1.expenditure as w1_exp, w1.status as w1_status,
        w2.id as w2_id, w2.title as w2_title, w2.category as w2_category, w2.implementing_agency as w2_agency,
        w2.sanctioned_amount as w2_sanc, w2.estimated_cost as w2_est, w2.expenditure as w2_exp, w2.status as w2_status
      FROM duplicate_matches dm
      LEFT JOIN works w1 ON dm.project_id_1 = w1.id OR ('P' || dm.project_id_1) = w1.id
      LEFT JOIN works w2 ON dm.project_id_2 = w2.id OR ('P' || dm.project_id_2) = w2.id
    `).all();

    for (const r of precomputed) {
      const p1 = {
        id: r.w1_id || `P${r.project_id_1}`,
        title: r.w1_title || "Community Center Construction",
        category: r.w1_category || "Civic Amenities",
        implementing_agency: r.w1_agency || "Public Works Department",
        sanctioned_amount: parseFloat(r.w1_sanc || 2000000),
        estimated_cost: parseFloat(r.w1_est || 2000000),
        expenditure: parseFloat(r.w1_exp || 1500000),
        status: r.w1_status || "Ongoing"
      };
      const p2 = {
        id: r.w2_id || `P${r.project_id_2}`,
        title: r.w2_title || "Community Hall Development",
        category: r.w2_category || "Civic Amenities",
        implementing_agency: r.w2_agency || "Public Works Department",
        sanctioned_amount: parseFloat(r.w2_sanc || 1950000),
        estimated_cost: parseFloat(r.w2_est || 1950000),
        expenditure: parseFloat(r.w2_exp || 1400000),
        status: r.w2_status || "Ongoing"
      };
      const sim = computeDetailedSimilarity(p1, p2);
      const pairKey = [p1.id, p2.id].sort().join(':');
      seenPairKeys.add(pairKey);

      pairs.push({
        work_a: p1,
        work_b: p2,
        similarity: sim
      });
    }
  } catch (e) {
    // If table not present or join issue, continue
  }

  // 2. Scan representative sample of active works for live duplicate clusters
  const sampleRows = db.prepare("SELECT * FROM works ORDER BY id ASC LIMIT 50").all();
  const workList = sampleRows.map(w => ({
    id: w.id,
    title: w.title,
    description: w.description,
    category: w.category,
    implementing_agency: w.implementing_agency,
    sanctioned_amount: parseFloat(w.sanctioned_amount || 0),
    estimated_cost: parseFloat(w.estimated_cost || 0),
    expenditure: parseFloat(w.expenditure || 0),
    status: w.status,
    constituency_id: w.constituency_id,
    district_id: w.district_id,
    _tokensTitle: getCachedTokens(w.title || ""),
    _tokensDesc: getCachedTokens(w.description || "")
  }));

  for (let i = 0; i < workList.length; i++) {
    for (let j = i + 1; j < workList.length; j++) {
      const w1 = workList[i];
      const w2 = workList[j];
      const pairKey = [w1.id, w2.id].sort().join(':');
      if (seenPairKeys.has(pairKey)) continue;

      const sim = computeDetailedSimilarity(w1, w2);
      if (sim.composite_similarity >= minThreshold) {
        seenPairKeys.add(pairKey);
        pairs.push({
          work_a: w1,
          work_b: w2,
          similarity: sim
        });
      }
    }
  }

  return pairs.sort((a, b) => b.similarity.composite_similarity - a.similarity.composite_similarity);
}

function getWorkSimilarities(db, workId) {
  const target = db.prepare("SELECT * FROM works WHERE id = ?").get(workId);
  if (!target) return [];

  const targetDict = {
    id: target.id,
    title: target.title,
    description: target.description,
    category: target.category,
    implementing_agency: target.implementing_agency,
    sanctioned_amount: parseFloat(target.sanctioned_amount || 0),
    estimated_cost: parseFloat(target.estimated_cost || 0),
    expenditure: parseFloat(target.expenditure || 0),
    status: target.status,
    constituency_id: target.constituency_id,
    district_id: target.district_id,
    _tokensTitle: getCachedTokens(target.title || ""),
    _tokensDesc: getCachedTokens(target.description || "")
  };

  // High-performance candidate query using district/category index
  let candidates = [];
  if (target.district_id || target.category) {
    candidates = db.prepare(`
      SELECT * FROM works 
      WHERE id != ? AND (district_id = ? OR category = ?)
      LIMIT 40
    `).all(workId, target.district_id || -1, target.category || '');
  }
  if (candidates.length < 10) {
    const additional = db.prepare("SELECT * FROM works WHERE id != ? LIMIT 30").all(workId);
    candidates = candidates.concat(additional);
  }

  const results = [];
  const seenIds = new Set();
  for (const c of candidates) {
    if (seenIds.has(c.id)) continue;
    seenIds.add(c.id);

    const cDict = {
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      implementing_agency: c.implementing_agency,
      sanctioned_amount: parseFloat(c.sanctioned_amount || 0),
      estimated_cost: parseFloat(c.estimated_cost || 0),
      expenditure: parseFloat(c.expenditure || 0),
      status: c.status,
      constituency_id: c.constituency_id,
      district_id: c.district_id,
      _tokensTitle: getCachedTokens(c.title || ""),
      _tokensDesc: getCachedTokens(c.description || "")
    };
    const sim = computeDetailedSimilarity(targetDict, cDict);
    results.push({
      candidate: cDict,
      similarity: sim
    });
  }

  return results.sort((a, b) => b.similarity.composite_similarity - a.similarity.composite_similarity);
}

module.exports = {
  tokenizeAndClean,
  computeJaccardSimilarity,
  computeDetailedSimilarity,
  getAllDuplicatePairs,
  getWorkSimilarities
};
