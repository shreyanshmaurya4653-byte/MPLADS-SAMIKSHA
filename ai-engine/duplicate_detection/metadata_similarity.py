"""
MPLADS AI Engine: Metadata Proximity Matching
"""
from typing import Dict, Any

def compute_metadata_match(work_a: Dict[str, Any], work_b: Dict[str, Any]) -> float:
    """
    Evaluates geospatial and administrative proximity:
    - Same constituency: 40 pts
    - Same category: 30 pts
    - Similar estimated cost (within 15%): 30 pts
    """
    score = 0.0

    if work_a.get("constituency_id") == work_b.get("constituency_id"):
        score += 40.0

    if work_a.get("category") == work_b.get("category"):
        score += 30.0

    cost_a = float(work_a.get("sanctioned_amount") or 0.0)
    cost_b = float(work_b.get("sanctioned_amount") or 0.0)

    if cost_a > 0 and cost_b > 0:
        ratio = min(cost_a, cost_b) / max(cost_a, cost_b)
        if ratio >= 0.85:
            score += 30.0
        elif ratio >= 0.70:
            score += 15.0

    return score
