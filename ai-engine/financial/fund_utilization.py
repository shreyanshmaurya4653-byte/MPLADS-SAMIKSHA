"""
MPLADS AI Engine: Fund Utilization Analysis
"""
from typing import Dict, Any

def analyze_fund_utilization(work: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluates the efficiency of fund utilization for a project."""
    sanctioned = float(work.get("sanctioned_amount") or 0.0)
    released = float(work.get("released_amount") or 0.0)
    expenditure = float(work.get("expenditure") or 0.0)

    release_ratio = (released / sanctioned * 100.0) if sanctioned > 0 else 0.0
    burn_rate = (expenditure / released * 100.0) if released > 0 else 0.0
    overall_utilization = (expenditure / sanctioned * 100.0) if sanctioned > 0 else 0.0

    return {
        "release_ratio": round(release_ratio, 2),
        "burn_rate": round(burn_rate, 2),
        "overall_utilization": round(overall_utilization, 2),
        "is_underutilized": burn_rate < 40.0 and release_ratio > 80.0,
        "is_overutilized": overall_utilization > 100.0
    }
