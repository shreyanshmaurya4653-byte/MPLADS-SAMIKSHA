"""
MPLADS AI Engine: Explainable AI Risk Drivers
"""
from typing import Dict, Any, List

def generate_risk_explanations(work: Dict[str, Any], risk_data: Dict[str, Any]) -> List[str]:
    """Generates human-readable, auditable bullet points explaining the assigned risk score."""
    explanations = []

    # Financial checks
    sanctioned = float(work.get("sanctioned_amount") or 0.0)
    expenditure = float(work.get("expenditure") or 0.0)
    if sanctioned > 0 and expenditure > sanctioned:
        pct = ((expenditure - sanctioned) / sanctioned) * 100.0
        explanations.append(f"Cost overrun of {pct:.1f}% beyond the sanctioned limit (₹{expenditure:,.0f} spent vs ₹{sanctioned:,.0f} sanctioned).")

    # Payment vs Progress gap
    pay_util = float(work.get("payment_utilization") or 0.0)
    prog = float(work.get("physical_progress") or 0.0)
    if pay_util - prog >= 25.0:
        explanations.append(f"Significant progress-payment divergence: {pay_util:.0f}% disbursed with only {prog:.0f}% ground completion.")

    # Delay check
    delay_months = float(work.get("delay_months") or 0.0)
    if delay_months > 1.0 or work.get("status") == "Delayed":
        explanations.append(f"Project delayed by approximately {delay_months:.1f} months past scheduled completion.")

    # Duplicate match
    dup_matches = risk_data.get("duplicate_matches", [])
    if dup_matches:
        top_dup = dup_matches[0]
        explanations.append(f"Possible duplicate work: {top_dup['similarity_score']}% match with work '{top_dup['candidate_title']}' ({top_dup['candidate_id']}).")

    if not explanations:
        explanations.append("Project milestones and expenditures are tracking within expected standard limits.")

    return explanations
