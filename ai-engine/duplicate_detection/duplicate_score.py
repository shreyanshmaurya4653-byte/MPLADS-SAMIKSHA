"""
MPLADS AI Engine: Composite Duplicate Detection Scoring
"""
from typing import Dict, Any, List, Tuple

try:
    from .semantic_similarity import compute_jaccard_similarity, compute_jaccard_from_sets
    from .metadata_similarity import compute_metadata_match
    from .text_preprocessing import tokenize_and_clean
except Exception:
    from duplicate_detection.semantic_similarity import compute_jaccard_similarity, compute_jaccard_from_sets
    from duplicate_detection.metadata_similarity import compute_metadata_match
    from duplicate_detection.text_preprocessing import tokenize_and_clean

def get_work_tokens(work: Dict[str, Any]) -> set:
    """Retrieves or caches pre-tokenized title tokens on the work dictionary."""
    tokens = work.get("_tokens")
    if tokens is None:
        tokens = set(tokenize_and_clean(work.get("title", "")))
        work["_tokens"] = tokens
    return tokens

class DuplicateIndex:
    """
    High-performance inverted token & geographic index.
    Prunes non-matching candidate comparisons from O(N) to O(1) candidate lookup.
    """
    def __init__(self, works: List[Dict[str, Any]]):
        self.token_to_works: Dict[str, List[Dict[str, Any]]] = {}
        self.geo_to_works: Dict[Any, List[Dict[str, Any]]] = {}
        self.works = works

        for w in works:
            tokens = get_work_tokens(w)
            for t in tokens:
                if t not in self.token_to_works:
                    self.token_to_works[t] = []
                self.token_to_works[t].append(w)
            
            geo_key = w.get("district_id") or w.get("constituency_id")
            if geo_key:
                if geo_key not in self.geo_to_works:
                    self.geo_to_works[geo_key] = []
                self.geo_to_works[geo_key].append(w)

    def get_candidate_subset(self, target_work: Dict[str, Any], max_candidates: int = 100) -> List[Dict[str, Any]]:
        target_id = target_work.get("id")
        tokens = get_work_tokens(target_work)
        candidate_ids = set()
        candidates = []

        # 1. Fetch works sharing at least one significant token
        for t in tokens:
            for w in self.token_to_works.get(t, []):
                w_id = w.get("id")
                if w_id != target_id and w_id not in candidate_ids:
                    candidate_ids.add(w_id)
                    candidates.append(w)
                    if len(candidates) >= max_candidates:
                        return candidates

        # 2. Fetch works sharing geographic district/constituency
        geo_key = target_work.get("district_id") or target_work.get("constituency_id")
        if geo_key and geo_key in self.geo_to_works:
            for w in self.geo_to_works[geo_key]:
                w_id = w.get("id")
                if w_id != target_id and w_id not in candidate_ids:
                    candidate_ids.add(w_id)
                    candidates.append(w)
                    if len(candidates) >= max_candidates:
                        return candidates

        return candidates

def detect_duplicates(
    target_work: Dict[str, Any],
    candidate_works: List[Dict[str, Any]],
    threshold: float = 70.0,
    index: DuplicateIndex = None
) -> List[Dict[str, Any]]:
    matches = []
    target_id = target_work.get("id")
    target_tokens = get_work_tokens(target_work)

    # Use index to filter down to promising candidates if available or if candidate list is large
    if index is not None:
        eval_candidates = index.get_candidate_subset(target_work, max_candidates=80)
    elif len(candidate_works) > 100:
        # Build lightweight ad-hoc inverted search or sample
        eval_candidates = []
        target_dist = target_work.get("district_id")
        target_cat = target_work.get("category")
        for c in candidate_works:
            if c.get("id") == target_id:
                continue
            c_tokens = get_work_tokens(c)
            # Fast filter: must share at least 1 token OR same district/category
            if (target_tokens and c_tokens and bool(target_tokens & c_tokens)) or \
               (target_dist and c.get("district_id") == target_dist) or \
               (target_cat and c.get("category") == target_cat):
                eval_candidates.append(c)
                if len(eval_candidates) >= 100:
                    break
    else:
        eval_candidates = candidate_works

    for cand in eval_candidates:
        if cand.get("id") == target_id:
            continue

        cand_tokens = get_work_tokens(cand)
        text_sim = compute_jaccard_from_sets(target_tokens, cand_tokens) * 100.0
        meta_sim = compute_metadata_match(target_work, cand)

        composite_score = (text_sim * 0.6) + (meta_sim * 0.4)

        if composite_score >= threshold:
            matches.append({
                "candidate_id": cand.get("id"),
                "candidate_title": cand.get("title"),
                "similarity_score": round(composite_score, 1),
                "reason": f"High lexical overlap ({text_sim:.0f}%) and category/location proximity."
            })

    return sorted(matches, key=lambda x: x["similarity_score"], reverse=True)

