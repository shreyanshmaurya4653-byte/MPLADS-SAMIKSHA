"""
MPLADS AI Engine: Expenditure Spike & Anomaly Detection
"""
from typing import List, Dict, Any, Tuple
import numpy as np

def detect_expenditure_spikes(monthly_expenditures: List[float], z_threshold: float = 2.0) -> Tuple[bool, List[int]]:
    """
    Detects sudden abnormal spikes in expenditure logs using statistical Z-Score.
    """
    if len(monthly_expenditures) < 3:
        return False, []

    data = np.array(monthly_expenditures)
    mean = np.mean(data)
    std = np.std(data)

    if std == 0:
        return False, []

    z_scores = (data - mean) / std
    spike_indices = [int(i) for i, z in enumerate(z_scores) if z >= z_threshold]

    return len(spike_indices) > 0, spike_indices

def check_work_expenditure_spike(work: Dict[str, Any]) -> Tuple[bool, str]:
    """Inspects work record for disproportionate expenditure spikes."""
    sanctioned = float(work.get("sanctioned_amount") or 0.0)
    expenditure = float(work.get("expenditure") or 0.0)
    progress = float(work.get("physical_progress") or 0.0)

    # Spike: High expenditure when work is barely halfway
    if progress < 50.0 and expenditure > (sanctioned * 0.9):
        return True, f"High expenditure ({expenditure}) released with low physical progress ({progress}%)"
    
    if expenditure > (sanctioned * 1.5):
        return True, f"Expenditure exceeds 150% of sanctioned limit."

    return False, ""
