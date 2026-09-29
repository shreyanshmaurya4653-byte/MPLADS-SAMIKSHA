"""
MPLADS AI Engine: Composite Multi-Factor Risk Scoring
"""
from typing import Dict, Any, List

try:
    from ..financial.financial_risk import compute_financial_risk
    from ..delay_compliance.delay_risk import compute_delay_risk
    from ..duplicate_detection.duplicate_score import detect_duplicates, DuplicateIndex
except Exception:
    from financial.financial_risk import compute_financial_risk
    from delay_compliance.delay_risk import compute_delay_risk
    from duplicate_detection.duplicate_score import detect_duplicates, DuplicateIndex

def calculate_composite_risk(
    work: Dict[str, Any],
    candidate_works: List[Dict[str, Any]] = None,
    index: DuplicateIndex = None
) -> Dict[str, Any]:
    fin_eval = compute_financial_risk(work)
    delay_eval = compute_delay_risk(work)
    
    dup_matches = detect_duplicates(work, candidate_works or [], index=index)
    duplicate_score = float(dup_matches[0]["similarity_score"]) if dup_matches else 0.0

    # Weights: 40% Financial, 35% Delay, 15% Duplicate
    f_score = fin_eval["financial_risk_score"]
    d_score = delay_eval["delay_risk_score"]
    dup_score = duplicate_score

    composite = (f_score * 0.40) + (d_score * 0.35) + (dup_score * 0.15)
    
    anomalies = list(fin_eval.get("anomalies", []))
    if delay_eval.get("is_delayed"):
        anomalies.append("DELAY")
    if dup_matches:
        anomalies.append("POSSIBLE_DUPLICATE")

    anomalies = list(dict.fromkeys(anomalies))
    risk_score = round(min(100.0, max(0.0, composite)), 1)

    return {
        "work_id": work.get("id"),
        "risk_score": risk_score,
        "cost_risk": f_score,
        "delay_risk": d_score,
        "duplicate_risk": round(dup_score, 1),
        "anomalies": anomalies,
        "duplicate_matches": dup_matches
    }

class BatchRiskEngine:
    """
    Optimized batch processor that constructs an inverted candidate index once
    and efficiently evaluates thousands of works without O(N^2) overhead.
    """
    def __init__(self, candidate_works: List[Dict[str, Any]]):
        self.candidate_works = candidate_works
        self.index = DuplicateIndex(candidate_works)

    def assess_work(self, work: Dict[str, Any]) -> Dict[str, Any]:
        return calculate_composite_risk(work, self.candidate_works, index=self.index)

