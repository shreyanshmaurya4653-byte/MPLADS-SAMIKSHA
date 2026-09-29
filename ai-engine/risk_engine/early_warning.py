"""
MPLADS AI Engine: Early Warning Alert Generation
"""
from typing import Dict, Any, List

def evaluate_early_warning_trigger(work: Dict[str, Any], risk_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generates automated system alerts when high-risk thresholds are crossed."""
    alerts = []
    work_id = work.get("id")
    work_title = work.get("title", "")
    score = risk_result.get("risk_score", 0.0)

    for anomaly in risk_result.get("anomalies", []):
        if anomaly == "COST_OVERRUN":
            alerts.append({
                "work_id": work_id,
                "alert_type": "COST_OVERRUN",
                "severity": "High",
                "title": f"Cost Overrun Alert: {work_id}",
                "description": f"Work '{work_title}' has exceeded sanctioned ceiling."
            })
        elif anomaly == "PROGRESS_PAYMENT_MISMATCH":
            alerts.append({
                "work_id": work_id,
                "alert_type": "PROGRESS_PAYMENT_MISMATCH",
                "severity": "High" if score >= 80 else "Medium",
                "title": f"Payment Mismatch Alert: {work_id}",
                "description": f"Fund disbursement for '{work_title}' outpaces ground completion."
            })
        elif anomaly == "POSSIBLE_DUPLICATE":
            alerts.append({
                "work_id": work_id,
                "alert_type": "POSSIBLE_DUPLICATE",
                "severity": "High",
                "title": f"Potential Duplicate Work Proposal: {work_id}",
                "description": f"High lexical and geographic proximity detected for '{work_title}'."
            })
        elif anomaly == "DELAY":
            alerts.append({
                "work_id": work_id,
                "alert_type": "DELAY",
                "severity": "Medium",
                "title": f"Timeline Delay Alert: {work_id}",
                "description": f"Work '{work_title}' is lagging behind its committed delivery date."
            })

    return alerts
