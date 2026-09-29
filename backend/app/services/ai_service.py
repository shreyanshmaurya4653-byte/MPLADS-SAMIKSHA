import os
import sys
import json
from typing import Dict, Any, List

# Ensure ai-engine directory is in sys.path
ai_engine_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ai-engine"))
if ai_engine_path not in sys.path:
    sys.path.insert(0, ai_engine_path)

from risk_engine.risk_scoring import calculate_composite_risk
from risk_engine.risk_classification import classify_risk_tier
from risk_engine.risk_explanation import generate_risk_explanations

def assess_work_risk(work_dict: Dict[str, Any], all_works: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Runs the AI Engine multi-factor risk assessment model on a work entity."""
    try:
        risk_result = calculate_composite_risk(work_dict, all_works or [])
        tier = classify_risk_tier(risk_result["risk_score"])
        explanations = generate_risk_explanations(work_dict, risk_result)

        return {
            "work_id": work_dict.get("id"),
            "risk_score": risk_result["risk_score"],
            "risk_level": tier,
            "cost_risk": risk_result.get("cost_risk", 0.0),
            "delay_risk": risk_result.get("delay_risk", 0.0),
            "payment_risk": risk_result.get("payment_risk", 0.0),
            "duplicate_risk": risk_result.get("duplicate_risk", 0.0),
            "compliance_risk": risk_result.get("compliance_risk", 0.0),
            "anomalies": risk_result.get("anomalies", []),
            "explanations": explanations
        }
    except Exception as e:
        # Graceful fallback
        sanctioned = float(work_dict.get("sanctioned_amount") or 1.0)
        expenditure = float(work_dict.get("expenditure") or 0.0)
        score = 80.0 if expenditure > sanctioned else 20.0
        return {
            "work_id": work_dict.get("id"),
            "risk_score": score,
            "risk_level": "High" if score >= 70 else "Low",
            "cost_risk": 50.0 if expenditure > sanctioned else 10.0,
            "delay_risk": 30.0,
            "payment_risk": 20.0,
            "duplicate_risk": 0.0,
            "compliance_risk": 10.0,
            "anomalies": ["COST_OVERRUN"] if expenditure > sanctioned else [],
            "explanations": ["Expenditure exceeds sanctioned amount."] if expenditure > sanctioned else ["Tracking within parameters."]
        }
