from typing import Dict, Any, List
from sqlalchemy.orm import Session
from .work_service import get_works_for_user, get_work_by_id
from .ai_service import assess_work_risk
from ..models.risk import RiskAssessment

def get_risk_overview(db: Session, user: Dict[str, Any]) -> Dict[str, Any]:
    works = get_works_for_user(db, user)
    total = len(works)
    high = sum(1 for w in works if w["risk_level"] == "High")
    med = sum(1 for w in works if w["risk_level"] == "Medium")
    low = sum(1 for w in works if w["risk_level"] == "Low")

    avg_score = round(sum(w["risk_score"] for w in works) / max(1, total), 1)

    return {
        "total_assessed": total,
        "high_risk_count": high,
        "medium_risk_count": med,
        "low_risk_count": low,
        "average_score": avg_score,
        "distribution": [
            {"name": "High Risk", "value": high, "color": "#ef4444"},
            {"name": "Medium Risk", "value": med, "color": "#f59e0b"},
            {"name": "Low Risk", "value": low, "color": "#10b981"}
        ]
    }

def get_work_risk_dossier(db: Session, work_id: str) -> Dict[str, Any]:
    work = get_work_by_id(db, work_id)
    if not work:
        return {}

    # Run real-time AI risk assessment
    all_works = db.query(Work).all()
    all_works_dict = [{"id": w.id, "title": w.title, "sanctioned_amount": w.sanctioned_amount, "category": w.category, "constituency_id": w.constituency_id} for w in all_works]
    
    assessment = assess_work_risk(work, all_works_dict)
    return assessment
from ..models.work import Work
