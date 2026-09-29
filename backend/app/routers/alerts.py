from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..schemas.alert import AlertResponse, AlertStatusUpdate, VerificationAction
from ..services.alert_service import get_alerts_for_user, update_alert_status
from ..models.alert import Alert

router = APIRouter(prefix="/alerts", tags=["Alerts & Verification"])

@router.get("", response_model=List[AlertResponse])
def list_alerts(
    severity: Optional[str] = Query(None),
    alert_type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_alerts_for_user(db, current_user, severity=severity, alert_type=alert_type)

@router.patch("/{alert_id}/status")
def patch_status(alert_id: str, payload: AlertStatusUpdate, db: Session = Depends(get_db)):
    updated = update_alert_status(db, alert_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Status updated successfully", "status": updated.status}

@router.post("/{alert_id}/verify")
def submit_verification(alert_id: str, payload: VerificationAction, db: Session = Depends(get_db)):
    updated = update_alert_status(db, alert_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {
        "message": "Verification recorded successfully",
        "alert_id": alert_id,
        "officer_remarks": payload.officer_remarks,
        "action_taken": payload.action_taken,
        "status": updated.status
    }
