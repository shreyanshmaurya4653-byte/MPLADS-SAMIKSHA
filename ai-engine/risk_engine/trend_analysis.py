"""
MPLADS AI Engine: Trend & Velocity Analysis
"""
from typing import List, Dict, Any

def analyze_risk_trends(historical_assessments: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Evaluates macro trends across constituency or district works."""
    if not historical_assessments:
        return {"average_score": 0.0, "high_risk_count": 0, "status": "Stable"}

    scores = [float(a.get("risk_score", 0.0)) for a in historical_assessments]
    avg_score = sum(scores) / len(scores)
    high_count = sum(1 for s in scores if s >= 70.0)

    status = "Elevated Risk" if avg_score > 50.0 or high_count > 3 else "Normal"
    return {
        "average_score": round(avg_score, 1),
        "total_assessed": len(scores),
        "high_risk_count": high_count,
        "status": status
    }
