"""
MPLADS AI Engine: Cost Overrun Detection
"""
from typing import Dict, Any, Tuple

def detect_cost_overrun(work: Dict[str, Any], threshold_percent: float = 15.0) -> Tuple[bool, float, Dict[str, Any]]:
    """
    Flags projects where actual expenditure significantly exceeds sanctioned budget.
    """
    sanctioned = float(work.get("sanctioned_amount") or 0.0)
    expenditure = float(work.get("expenditure") or 0.0)
    
    if sanctioned <= 0:
        return False, 0.0, {}

    deviation_amount = expenditure - sanctioned
    deviation_percent = (deviation_amount / sanctioned) * 100.0

    is_overrun = deviation_percent >= threshold_percent
    
    details = {
        "sanctioned_amount": sanctioned,
        "expenditure": expenditure,
        "deviation_amount": deviation_amount,
        "deviation_percent": round(deviation_percent, 2),
        "severity": "High" if deviation_percent >= 40.0 else ("Medium" if is_overrun else "Low")
    }

    return is_overrun, deviation_percent, details
