"""
MPLADS AI Engine: Composite Financial Risk Score
"""
from typing import Dict, Any, List
from .cost_overrun import detect_cost_overrun
from .expenditure_anomaly import check_work_expenditure_spike
from .payment_anomaly import detect_payment_progress_mismatch

def compute_financial_risk(work: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes a 0-100 financial risk subscore combining overrun, spikes, and payment gaps.
    """
    score = 0.0
    anomalies: List[str] = []
    reasons: List[str] = []

    # 1. Cost overrun check
    is_overrun, deviation, overrun_details = detect_cost_overrun(work)
    if is_overrun:
        score += min(50.0, deviation * 0.8)
        anomalies.append("COST_OVERRUN")
        reasons.append(f"Cost overrun of {deviation:.1f}% beyond sanctioned budget.")

    # 2. Payment vs Progress Mismatch
    is_mismatch, gap, mismatch_reason = detect_payment_progress_mismatch(work)
    if is_mismatch:
        score += min(35.0, gap * 0.7)
        anomalies.append("PROGRESS_PAYMENT_MISMATCH")
        reasons.append(mismatch_reason)

    # 3. Expenditure Spike
    is_spike, spike_reason = check_work_expenditure_spike(work)
    if is_spike:
        score += 20.0
        anomalies.append("EXPENDITURE_SPIKE")
        reasons.append(spike_reason)

    final_score = min(100.0, max(0.0, score))
    return {
        "financial_risk_score": round(final_score, 2),
        "anomalies": anomalies,
        "reasons": reasons
    }
