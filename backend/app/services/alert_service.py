from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ..models.alert import Alert
from ..models.work import Work

def get_alerts_for_user(
    db: Session, 
    user: Dict[str, Any], 
    severity: Optional[str] = None,
    alert_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = db.query(Alert, Work.title.label("work_title"), Work.district_id, Work.constituency_id, Work.state_id)\
              .join(Work, Alert.work_id == Work.id)

    role = user.get("role")
    if role == "MP" and user.get("constituency_id"):
        query = query.filter(Work.constituency_id == user["constituency_id"])
    elif role == "District" and user.get("district_id"):
        query = query.filter(Work.district_id == user["district_id"])
    elif role == "State" and user.get("state_id"):
        query = query.filter(Work.state_id == user["state_id"])

    if severity and severity != "All":
        query = query.filter(Alert.severity == severity)
    if alert_type and alert_type != "All":
        query = query.filter(Alert.alert_type == alert_type)

    results = []
    for alert, work_title, d_id, c_id, s_id in query.all():
        results.append({
            "id": alert.id,
            "work_id": alert.work_id,
            "work_title": work_title,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "title": alert.title,
            "description": alert.description,
            "status": alert.status,
            "created_at": str(alert.created_at).split(" ")[0] if alert.created_at else "2024-08-15"
        })
    return results

def update_alert_status(db: Session, alert_id: str, new_status: str) -> Optional[Alert]:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.status = new_status
        db.commit()
        db.refresh(alert)
    return alert
