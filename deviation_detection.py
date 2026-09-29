"""
MPLADS AI Engine: Timeline Deviation Detection
"""
from typing import Dict, Any

def compute_timeline_deviation(work: Dict[str, Any]) -> float:
    """Computes percentage time overrun vs planned schedule."""
    planned_days = max(1.0, float(work.get("planned_duration_days") or 180.0))
    delay_days = float(work.get("delay_days") or 0.0)

    deviation_pct = (delay_days / planned_days) * 100.0
    return round(deviation_pct, 2)
