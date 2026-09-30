"""
MPLADS AI Engine: Physical Progress Analysis
"""
from typing import Dict, Any

def analyze_physical_progress_velocity(work: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluates the monthly burn rate of physical completion."""
    progress = float(work.get("physical_progress") or 0.0)
    elapsed_days = max(1.0, float(work.get("elapsed_duration_days") or 30.0))
    
    velocity_per_month = (progress / elapsed_days) * 30.0

    is_stagnant = progress < 30.0 and elapsed_days > 120.0

    return {
        "progress_percentage": progress,
        "velocity_per_month": round(velocity_per_month, 2),
        "is_stagnant": is_stagnant
    }
