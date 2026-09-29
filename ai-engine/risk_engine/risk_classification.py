"""
MPLADS AI Engine: Risk Level Classification
"""
def classify_risk_tier(score: float) -> str:
    """Classifies risk score into High, Medium, or Low tiers."""
    if score >= 70.0:
        return "High"
    elif score >= 40.0:
        return "Medium"
    return "Low"
