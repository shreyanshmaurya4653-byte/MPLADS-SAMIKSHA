"""
MPLADS AI Engine: Payment-Progress Mismatch Detection
"""
from typing import Dict, Any, Tuple

def detect_payment_progress_mismatch(work: Dict[str, Any], gap_threshold: float = 25.0) -> Tuple[bool, float, str]:
    """
    Flags projects where cumulative payment percentage drastically exceeds physical progress.
    """
    payment_util = float(work.get("payment_utilization") or 0.0)
    physical_progress = float(work.get("physical_progress") or 0.0)

    gap = payment_util - physical_progress
    is_mismatched = gap >= gap_threshold

    reason = ""
    if is_mismatched:
        reason = f"Funds disbursed ({payment_util:.1f}%) severely outpaces on-ground physical progress ({physical_progress:.1f}%) by {gap:.1f}%."

    return is_mismatched, round(gap, 2), reason
