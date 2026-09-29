"""
MPLADS AI Engine: Milestone Delay Detection
"""
from typing import Dict, Any, Tuple

try:
    from ..preprocessing.transform_data import compute_duration_metrics
except Exception:
    from preprocessing.transform_data import compute_duration_metrics

def evaluate_project_delay(work: Dict[str, Any]) -> Tuple[bool, float, str]:
    delay_months = work.get("delay_months")
    if delay_months is None:
        metrics = compute_duration_metrics(work)
        delay_months = metrics.get("delay_months", 0.0)
    else:
        delay_months = float(delay_months or 0.0)

    progress = float(work.get("physical_progress") or 0.0)
    status = work.get("status", "")

    if status == "Completed":
        return False, 0.0, "Work successfully completed."

    is_delayed = delay_months > 1.0 or (status == "Delayed")
    reason = ""
    if is_delayed:
        reason = f"Execution is delayed by {delay_months:.1f} months beyond expected completion date (progress at {progress:.0f}%)."

    return is_delayed, delay_months, reason

