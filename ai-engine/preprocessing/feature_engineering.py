"""
MPLADS AI Engine: Feature Engineering
"""
from typing import Dict, Any

def extract_work_features(work: Dict[str, Any]) -> Dict[str, float]:
    """
    Extracts numerical feature vectors for anomaly models:
    - cost_overrun_ratio: expenditure / sanctioned_amount
    - progress_gap: payment_utilization - physical_progress
    - time_overrun_ratio: elapsed_days / planned_days
    - execution_velocity: physical_progress / elapsed_days
    """
    sanctioned = max(1000.0, float(work.get("sanctioned_amount") or 1.0))
    expenditure = float(work.get("expenditure") or 0.0)
    progress = float(work.get("physical_progress") or 0.0)
    payment_util = float(work.get("payment_utilization") or 0.0)
    
    cost_overrun_ratio = expenditure / sanctioned
    progress_gap = max(0.0, payment_util - progress)
    
    planned_days = max(30.0, float(work.get("planned_duration_days") or 180.0))
    elapsed_days = max(1.0, float(work.get("elapsed_duration_days") or 30.0))
    time_overrun_ratio = elapsed_days / planned_days
    execution_velocity = (progress / elapsed_days) * 30.0 # progress % per month

    return {
        "cost_overrun_ratio": round(cost_overrun_ratio, 3),
        "progress_gap": round(progress_gap, 2),
        "time_overrun_ratio": round(time_overrun_ratio, 3),
        "execution_velocity": round(execution_velocity, 2),
        "total_expenditure": expenditure
    }
