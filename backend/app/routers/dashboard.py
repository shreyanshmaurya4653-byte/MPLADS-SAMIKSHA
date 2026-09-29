from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..services.dashboard_service import get_dashboard_kpis, get_fund_utilization_trends
from ..services.alert_service import get_alerts_for_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_stats(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_dashboard_kpis(db, current_user)

@router.get("/utilization-trends")
def get_trends(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_fund_utilization_trends(db, current_user)

@router.get("/recent-alerts")
def get_recent_alerts(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    alerts = get_alerts_for_user(db, current_user)
    return alerts[:5]
