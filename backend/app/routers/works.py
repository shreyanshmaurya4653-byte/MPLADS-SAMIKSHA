from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..schemas.work import WorkCreate, WorkResponse
from ..services.work_service import get_works_for_user, get_work_by_id, create_new_work
from ..services.risk_service import get_work_risk_dossier
from ..models.expenditure import Expenditure
from ..models.alert import Alert

router = APIRouter(prefix="/works", tags=["Works"])

@router.get("", response_model=List[WorkResponse])
def list_works(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    state_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    constituency_id: Optional[int] = Query(None),
    mp_name: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_works_for_user(
        db, 
        current_user, 
        status=status, 
        category=category, 
        search=search,
        state_id=state_id,
        district_id=district_id,
        constituency_id=constituency_id,
        mp_name=mp_name
    )


@router.get("/{work_id}")
def get_work_details(work_id: str, db: Session = Depends(get_db)):
    work = get_work_by_id(db, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    # Fetch related timeline expenditures
    expenditures = db.query(Expenditure).filter(Expenditure.work_id == work_id).all()
    exp_list = [{"month": e.month_name, "amount": e.amount, "date": e.expenditure_date} for e in expenditures]

    # Fetch alerts for this work
    alerts = db.query(Alert).filter(Alert.work_id == work_id).all()
    alert_list = [{
        "id": a.id, 
        "title": a.title, 
        "severity": a.severity, 
        "description": a.description,
        "status": a.status,
        "created_at": str(a.created_at).split(" ")[0] if a.created_at else "2024-08-15"
    } for a in alerts]

    # Fetch AI risk dossier
    risk_dossier = get_work_risk_dossier(db, work_id)

    # Fetch AI duplicate & similarity candidates
    from ..services.similarity_service import get_work_similarities
    similar_candidates = get_work_similarities(db, work_id)[:4]

    return {
        "project": work,
        "expenditures": exp_list,
        "alerts": alert_list,
        "risk_dossier": risk_dossier,
        "similar_candidates": similar_candidates
    }

@router.post("", response_model=WorkResponse)
def create_work(payload: WorkCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    new_work = create_new_work(db, payload)
    return get_work_by_id(db, new_work.id)

@router.post("/upload")
def upload_works_batch(
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ingest multiple MPLADS project records.
    MPs are prohibited from uploading data (recommendation-only privilege).
    District, State, Ministry, and Admin authorities are authorized.
    """
    from ..services.work_service import batch_upload_works
    from ..schemas.work import WorkBatchUploadItem

    raw_items = payload.get("works", [])
    items = []
    for item in raw_items:
        items.append(WorkBatchUploadItem(
            title=item.get("title", "Untitled Work"),
            description=item.get("description"),
            category=item.get("category", "General Community Asset"),
            implementing_agency=item.get("implementing_agency", "Public Works Department (PWD)"),
            estimated_cost=float(item.get("estimated_cost", 1000000.0)),
            sanctioned_amount=float(item.get("sanctioned_amount", 1000000.0)),
            state_id=item.get("state_id"),
            district_id=item.get("district_id"),
            constituency_id=item.get("constituency_id"),
            start_date=item.get("start_date", "2024-06-01"),
            expected_completion=item.get("expected_completion", "2024-12-01")
        ))
    return batch_upload_works(db, current_user, items)

