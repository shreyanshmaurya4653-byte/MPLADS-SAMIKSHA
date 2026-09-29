from typing import Dict, Any, List
from sqlalchemy.orm import Session
from .work_service import get_works_for_user
from ..models.alert import Alert

def get_dashboard_kpis(db: Session, user: Dict[str, Any]) -> Dict[str, Any]:
    """Aggregates high-level governance metrics according to user scope."""
    works = get_works_for_user(db, user)

    total_works = len(works)
    completed_works = sum(1 for w in works if w["status"] == "Completed")
    ongoing_works = sum(1 for w in works if w["status"] == "Ongoing")
    delayed_works = sum(1 for w in works if w["status"] == "Delayed")
    high_risk_works = sum(1 for w in works if w["risk_level"] == "High")

    total_sanctioned = sum(w["sanctioned_amount"] for w in works)
    total_expenditure = sum(w["expenditure"] for w in works)

    utilization_rate = round((total_expenditure / total_sanctioned * 100.0), 1) if total_sanctioned > 0 else 0.0

    return {
        "total_works": total_works,
        "completed_works": completed_works,
        "ongoing_works": ongoing_works,
        "delayed_works": delayed_works,
        "high_risk_works": high_risk_works,
        "total_sanctioned": total_sanctioned,
        "total_expenditure": total_expenditure,
        "utilization_rate": utilization_rate
    }

def get_fund_utilization_trends(db: Session, user: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Returns monthly expenditure trend data points."""
    return [
        {"month": "Jan", "sanctioned": 120, "released": 100, "spent": 85},
        {"month": "Feb", "sanctioned": 150, "released": 130, "spent": 110},
        {"month": "Mar", "sanctioned": 180, "released": 160, "spent": 140},
        {"month": "Apr", "sanctioned": 200, "released": 175, "spent": 160},
        {"month": "May", "sanctioned": 220, "released": 190, "spent": 172},
        {"month": "Jun", "sanctioned": 240, "released": 210, "spent": 195},
        {"month": "Jul", "sanctioned": 260, "released": 230, "spent": 210},
        {"month": "Aug", "sanctioned": 280, "released": 250, "spent": 228},
        {"month": "Sep", "sanctioned": 310, "released": 270, "spent": 248},
    ]
