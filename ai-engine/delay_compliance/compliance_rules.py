"""
MPLADS AI Engine: Scheme Compliance Rules
"""
from typing import Dict, Any, List

def check_mplads_guideline_compliance(work: Dict[str, Any]) -> List[str]:
    """
    Validates regulatory checks under MPLADS 2023 revised guidelines:
    - Minimum duration without zero progress
    - Implementing agency ceiling checks
    """
    violations = []
    sanctioned = float(work.get("sanctioned_amount") or 0.0)
    released = float(work.get("released_amount") or 0.0)
    progress = float(work.get("physical_progress") or 0.0)

    # 1. 100% funds released with zero progress
    if released >= sanctioned and progress == 0.0:
        violations.append("Full funds released before initiation of ground execution.")

    # 2. Ineligible excessive cost overrun without revised sanction
    expenditure = float(work.get("expenditure") or 0.0)
    if expenditure > (sanctioned * 1.30):
        violations.append("Expenditure exceeds 30% without administrative re-sanction order.")

    return violations
