import json
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
from ..models.work import Work
from ..models.risk import RiskAssessment
from ..schemas.work import WorkCreate, WorkBatchUploadItem

def get_works_for_user(
    db: Session, 
    user: Dict[str, Any], 
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    state_id: Optional[int] = None,
    district_id: Optional[int] = None,
    constituency_id: Optional[int] = None,
    mp_name: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Retrieves works strictly filtered by user role jurisdiction (RBAC) and cascaded filters:
    - MP: Only sees their constituency
    - District Officer: Only sees their district; can filter by constituency in their district
    - State Officer: Only sees their state; can filter by district and constituency in their state
    - Ministry / Admin: National level; can filter by any state, district, and constituency
    - MP Search: Filters works belonging to the searched MP
    """
    role = user.get("role", "Ministry")
    user_state_id = user.get("state_id")
    user_dist_id = user.get("district_id")
    user_const_id = user.get("constituency_id")

    # Base query joined with constituencies, districts, states, and risk_assessments
    base_sql = """
        SELECT 
            w.id, w.title, w.description, w.category, w.constituency_id, w.district_id, w.state_id,
            w.implementing_agency, w.sanctioned_amount, w.estimated_cost, w.released_amount,
            w.expenditure, w.physical_progress, w.payment_utilization, w.start_date,
            w.expected_completion, w.actual_completion, w.status,
            c.constituency_name, c.mp_name, c.mp_party,
            d.district_name, s.state_name,
            r.risk_score, r.risk_level, r.recommendations
        FROM works w
        LEFT JOIN constituencies c ON w.constituency_id = c.constituency_id
        LEFT JOIN districts d ON w.district_id = d.district_id
        LEFT JOIN states s ON w.state_id = s.state_id
        LEFT JOIN risk_assessments r ON w.id = r.work_id
        WHERE 1=1
    """
    params = {}

    # 1. Enforce strict role boundary
    if role == "MP":
        # Strictly locked to MP's own constituency
        cid = user_const_id or 1
        base_sql += " AND w.constituency_id = :rbac_cid"
        params["rbac_cid"] = cid
    elif role == "District":
        # Strictly locked to District Officer's own district
        did = user_dist_id or 1
        base_sql += " AND w.district_id = :rbac_did"
        params["rbac_did"] = did
        # Can filter by constituency within their district
        if constituency_id:
            base_sql += " AND w.constituency_id = :filter_cid"
            params["filter_cid"] = constituency_id
    elif role == "State":
        # Strictly locked to State Officer's own state
        sid = user_state_id or 1
        base_sql += " AND w.state_id = :rbac_sid"
        params["rbac_sid"] = sid
        # Can filter by district within their state
        if district_id:
            base_sql += " AND w.district_id = :filter_did"
            params["filter_did"] = district_id
        # Can filter by constituency within their state
        if constituency_id:
            base_sql += " AND w.constituency_id = :filter_cid"
            params["filter_cid"] = constituency_id
    else:
        # Ministry / Admin (National level) - can filter any state, district, constituency
        if state_id:
            base_sql += " AND w.state_id = :filter_sid"
            params["filter_sid"] = state_id
        if district_id:
            base_sql += " AND w.district_id = :filter_did"
            params["filter_did"] = district_id
        if constituency_id:
            base_sql += " AND w.constituency_id = :filter_cid"
            params["filter_cid"] = constituency_id

    # 2. Filter by MP Name if provided
    if mp_name and mp_name.strip() and mp_name != "All":
        base_sql += " AND LOWER(c.mp_name) LIKE :mp_name"
        params["mp_name"] = f"%{mp_name.strip().lower()}%"

    # 3. Status and category filters
    if status and status != "All":
        base_sql += " AND w.status = :status"
        params["status"] = status
    if category and category != "All":
        base_sql += " AND w.category = :category"
        params["category"] = category

    # 4. Search filter
    if search and search.strip():
        base_sql += " AND (LOWER(w.title) LIKE :search OR LOWER(w.id) LIKE :search OR LOWER(c.constituency_name) LIKE :search OR LOWER(c.mp_name) LIKE :search)"
        params["search"] = f"%{search.strip().lower()}%"

    base_sql += " ORDER BY w.id ASC"

    rows = db.execute(text(base_sql), params).mappings().all()
    results = []
    for r in rows:
        item = {
            "id": r["id"],
            "title": r["title"],
            "description": r["description"],
            "category": r["category"],
            "constituency_id": r["constituency_id"],
            "district_id": r["district_id"],
            "state_id": r["state_id"],
            "implementing_agency": r["implementing_agency"],
            "sanctioned_amount": float(r["sanctioned_amount"] or 0),
            "estimated_cost": float(r["estimated_cost"] or 0),
            "released_amount": float(r["released_amount"] or 0),
            "expenditure": float(r["expenditure"] or 0),
            "physical_progress": float(r["physical_progress"] or 0),
            "payment_utilization": float(r["payment_utilization"] or 0),
            "start_date": r["start_date"],
            "expected_completion": r["expected_completion"],
            "actual_completion": r["actual_completion"],
            "status": r["status"],
            "risk_score": float(r["risk_score"] or 15.0),
            "risk_level": r["risk_level"] or "Low",
            "anomalies": [],
            "constituency_name": r["constituency_name"] or "Central Constituency",
            "district_name": r["district_name"] or "Central District",
            "state_name": r["state_name"] or "Uttar Pradesh",
            "mp_name": r["mp_name"] or "Shri Rajesh Kumar Sharma"
        }
        results.append(item)
    return results

def get_work_by_id(db: Session, work_id: str) -> Optional[Dict[str, Any]]:
    row = db.execute(text("""
        SELECT 
            w.id, w.title, w.description, w.category, w.constituency_id, w.district_id, w.state_id,
            w.implementing_agency, w.sanctioned_amount, w.estimated_cost, w.released_amount,
            w.expenditure, w.physical_progress, w.payment_utilization, w.start_date,
            w.expected_completion, w.actual_completion, w.status,
            c.constituency_name, c.mp_name, c.mp_party,
            d.district_name, s.state_name,
            r.risk_score, r.risk_level, r.recommendations
        FROM works w
        LEFT JOIN constituencies c ON w.constituency_id = c.constituency_id
        LEFT JOIN districts d ON w.district_id = d.district_id
        LEFT JOIN states s ON w.state_id = s.state_id
        LEFT JOIN risk_assessments r ON w.id = r.work_id
        WHERE w.id = :wid
    """), {"wid": work_id}).mappings().first()

    if not row:
        return None

    r = dict(row)
    return {
        "id": r["id"],
        "title": r["title"],
        "description": r["description"],
        "category": r["category"],
        "constituency_id": r["constituency_id"],
        "district_id": r["district_id"],
        "state_id": r["state_id"],
        "implementing_agency": r["implementing_agency"],
        "sanctioned_amount": float(r["sanctioned_amount"] or 0),
        "estimated_cost": float(r["estimated_cost"] or 0),
        "released_amount": float(r["released_amount"] or 0),
        "expenditure": float(r["expenditure"] or 0),
        "physical_progress": float(r["physical_progress"] or 0),
        "payment_utilization": float(r["payment_utilization"] or 0),
        "start_date": r["start_date"],
        "expected_completion": r["expected_completion"],
        "actual_completion": r["actual_completion"],
        "status": r["status"],
        "risk_score": float(r["risk_score"] or 15.0),
        "risk_level": r["risk_level"] or "Low",
        "anomalies": [],
        "constituency_name": r["constituency_name"] or "Central Constituency",
        "district_name": r["district_name"] or "Central District",
        "state_name": r["state_name"] or "Uttar Pradesh",
        "mp_name": r["mp_name"] or "Shri Rajesh Kumar Sharma"
    }

def create_new_work(db: Session, payload: WorkCreate) -> Work:
    work_id = payload.id
    if not work_id:
        count = db.query(Work).count() + 1000
        work_id = f"P{count + 1}"

    new_work = Work(
        id=work_id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        constituency_id=payload.constituency_id,
        district_id=payload.district_id,
        state_id=payload.state_id,
        implementing_agency=payload.implementing_agency,
        estimated_cost=payload.estimated_cost,
        sanctioned_amount=payload.sanctioned_amount,
        released_amount=0.0,
        expenditure=0.0,
        physical_progress=0.0,
        payment_utilization=0.0,
        start_date=payload.start_date,
        expected_completion=payload.expected_completion,
        status="Sanctioned"
    )
    db.add(new_work)
    db.commit()
    db.refresh(new_work)
    return new_work

def batch_upload_works(
    db: Session, 
    user: Dict[str, Any], 
    items: List[WorkBatchUploadItem]
) -> Dict[str, Any]:
    """
    Ingests a batch of new project works.
    PERMISSION CHECK: MPs are prohibited from uploading data.
    Only District, State, and Ministry officers have data upload rights.
    """
    role = user.get("role", "Ministry")
    if role == "MP":
        raise HTTPException(
            status_code=403, 
            detail="Members of Parliament have recommendation and review privileges only. Data upload is reserved for District, State, and Ministry Administrative Officers."
        )

    created_ids = []
    # Determine base ID counter
    max_num = 1000
    existing = db.execute(text("SELECT id FROM works")).fetchall()
    for row in existing:
        wid = row[0]
        if wid and wid.startswith("P") and wid[1:].isdigit():
            val = int(wid[1:])
            if val > max_num:
                max_num = val

    for item in items:
        max_num += 1
        work_id = f"P{max_num}"
        
        # Enforce jurisdiction defaults based on role if not provided
        sid = item.state_id or user.get("state_id") or 1
        did = item.district_id or user.get("district_id") or 1
        cid = item.constituency_id or user.get("constituency_id") or 1

        # If role is District, lock to user's district
        if role == "District":
            did = user.get("district_id") or 1
        # If role is State, lock to user's state
        elif role == "State":
            sid = user.get("state_id") or 1

        # Insert into projects
        db.execute(text("""
            INSERT INTO projects (
                project_code, project_name, description, category, state_id, district_id,
                constituency_id, implementing_agency_name, estimated_cost, sanctioned_amount,
                released_amount, expenditure_amount, physical_progress, payment_utilization,
                start_date, expected_completion_date, status, created_by
            ) VALUES (
                :code, :name, :desc, :cat, :sid, :did, :cid, :agency, :est, :sanc,
                0, 0, 0, 0, :sdate, :edate, 'Sanctioned', :creator
            )
        """), {
            "code": work_id,
            "name": item.title,
            "desc": item.description or f"Development project under {item.category}",
            "cat": item.category,
            "sid": sid,
            "did": did,
            "cid": cid,
            "agency": item.implementing_agency,
            "est": item.estimated_cost,
            "sanc": item.sanctioned_amount,
            "sdate": item.start_date or "2024-06-01",
            "edate": item.expected_completion or "2024-12-01",
            "creator": user.get("email", "admin@mplads.gov.in")
        })

        # Insert into works
        db.execute(text("""
            INSERT INTO works (
                id, title, description, category, constituency_id, district_id, state_id,
                implementing_agency, estimated_cost, sanctioned_amount, released_amount,
                expenditure, physical_progress, payment_utilization, start_date, expected_completion, status
            ) VALUES (
                :id, :title, :desc, :cat, :cid, :did, :sid, :agency, :est, :sanc,
                0, 0, 0, 0, :sdate, :edate, 'Sanctioned'
            )
        """), {
            "id": work_id,
            "title": item.title,
            "desc": item.description or f"Development project under {item.category}",
            "cat": item.category,
            "cid": cid,
            "did": did,
            "sid": sid,
            "agency": item.implementing_agency,
            "est": item.estimated_cost,
            "sanc": item.sanctioned_amount,
            "sdate": item.start_date or "2024-06-01",
            "edate": item.expected_completion or "2024-12-01"
        })

        # Insert baseline risk assessment
        db.execute(text("""
            INSERT OR REPLACE INTO risk_assessments (
                work_id, risk_score, risk_level, delay_probability, cost_overrun_risk,
                progress_gap_score, agency_concentration_score, duplicate_risk_score, recommendations
            ) VALUES (
                :wid, 18.0, 'Low', 10.0, 15.0, 10.0, 15.0, 5.0, 'Initial baseline assessment: On track.'
            )
        """), {"wid": work_id})

        created_ids.append(work_id)

    db.commit()
    return {
        "success": True,
        "count": len(created_ids),
        "created_ids": created_ids,
        "message": f"Successfully ingested and indexed {len(created_ids)} MPLADS works into the national monitoring database."
    }
