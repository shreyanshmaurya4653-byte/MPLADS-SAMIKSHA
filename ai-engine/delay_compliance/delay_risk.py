"""
MPLADS AI Engine: Delay Risk Subscoring
"""
from typing import Dict, Any

try:
    from .delay_detection import evaluate_project_delay
    from .deviation_detection import compute_timeline_deviation
except Exception:
    from delay_compliance.delay_detection import evaluate_project_delay
    from delay_compliance.deviation_detection import compute_timeline_deviation

def compute_delay_risk(work: Dict[str, Any]) -> Dict[str, Any]:
    is_delayed, delay_months, reason = evaluate_project_delay(work)
    time_dev = compute_timeline_deviation(work)

    score = 0.0
    if is_delayed:
        score += min(70.0, delay_months * 12.0)
        score += min(30.0, time_dev * 0.3)

    return {
        "delay_risk_score": round(min(100.0, score), 2),
        "delay_months": delay_months,
        "is_delayed": is_delayed,
        "reason": reason
    }
