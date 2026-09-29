from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any, List
from ..core.database import get_db
from ..core.dependencies import get_current_user

router = APIRouter(prefix="/jurisdiction", tags=["Jurisdiction"])

@router.get("/hierarchy")
def get_jurisdiction_hierarchy(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns hierarchical states, districts, constituencies, and MPs scoped strictly by user role:
    - MP: Only their constituency and parent district/state
    - District Officer: Only their district, and all constituencies in their district
    - State Officer: Only their state, and all districts & constituencies in their state
    - Ministry / Admin: All states, all districts, all constituencies nationwide
    """
    role = current_user.get("role", "Ministry")
    user_state_id = current_user.get("state_id") or 1
    user_dist_id = current_user.get("district_id") or 1
    user_const_id = current_user.get("constituency_id") or 1

    # Fetch states
    if role in ("Ministry", "Admin"):
        states_rows = db.execute(text("SELECT state_id, state_name, state_code FROM states ORDER BY state_name ASC")).mappings().all()
    else:
        states_rows = db.execute(text("SELECT state_id, state_name, state_code FROM states WHERE state_id = :sid"), {"sid": user_state_id}).mappings().all()
    states = [dict(s) for s in states_rows]

    # Fetch districts
    if role in ("Ministry", "Admin"):
        dist_rows = db.execute(text("SELECT district_id, state_id, district_name, district_code FROM districts ORDER BY district_name ASC")).mappings().all()
    elif role == "State":
        dist_rows = db.execute(text("SELECT district_id, state_id, district_name, district_code FROM districts WHERE state_id = :sid ORDER BY district_name ASC"), {"sid": user_state_id}).mappings().all()
    else:
        # District or MP
        dist_rows = db.execute(text("SELECT district_id, state_id, district_name, district_code FROM districts WHERE district_id = :did"), {"did": user_dist_id}).mappings().all()
    districts = [dict(d) for d in dist_rows]

    # Fetch constituencies with MP details
    if role in ("Ministry", "Admin"):
        const_rows = db.execute(text("""
            SELECT c.constituency_id, c.state_id, c.district_id, c.constituency_name, 
                   c.constituency_number, c.mp_name, c.mp_party, c.house_type,
                   d.district_name, s.state_name
            FROM constituencies c
            LEFT JOIN districts d ON c.district_id = d.district_id
            LEFT JOIN states s ON c.state_id = s.state_id
            ORDER BY c.constituency_name ASC
        """)).mappings().all()
    elif role == "State":
        const_rows = db.execute(text("""
            SELECT c.constituency_id, c.state_id, c.district_id, c.constituency_name, 
                   c.constituency_number, c.mp_name, c.mp_party, c.house_type,
                   d.district_name, s.state_name
            FROM constituencies c
            LEFT JOIN districts d ON c.district_id = d.district_id
            LEFT JOIN states s ON c.state_id = s.state_id
            WHERE c.state_id = :sid
            ORDER BY c.constituency_name ASC
        """), {"sid": user_state_id}).mappings().all()
    elif role == "District":
        const_rows = db.execute(text("""
            SELECT c.constituency_id, c.state_id, c.district_id, c.constituency_name, 
                   c.constituency_number, c.mp_name, c.mp_party, c.house_type,
                   d.district_name, s.state_name
            FROM constituencies c
            LEFT JOIN districts d ON c.district_id = d.district_id
            LEFT JOIN states s ON c.state_id = s.state_id
            WHERE c.district_id = :did
            ORDER BY c.constituency_name ASC
        """), {"did": user_dist_id}).mappings().all()
    else:
        # MP
        const_rows = db.execute(text("""
            SELECT c.constituency_id, c.state_id, c.district_id, c.constituency_name, 
                   c.constituency_number, c.mp_name, c.mp_party, c.house_type,
                   d.district_name, s.state_name
            FROM constituencies c
            LEFT JOIN districts d ON c.district_id = d.district_id
            LEFT JOIN states s ON c.state_id = s.state_id
            WHERE c.constituency_id = :cid
            ORDER BY c.constituency_name ASC
        """), {"cid": user_const_id}).mappings().all()
    constituencies = [dict(c) for c in const_rows]

    # Extract unique MP list
    seen_mps = set()
    mps = []
    for c in constituencies:
        mp = c.get("mp_name")
        if mp and mp not in seen_mps:
            seen_mps.add(mp)
            mps.append({
                "mp_name": mp,
                "mp_party": c.get("mp_party", "Independent"),
                "constituency_id": c.get("constituency_id"),
                "constituency_name": c.get("constituency_name"),
                "district_id": c.get("district_id"),
                "district_name": c.get("district_name"),
                "state_id": c.get("state_id"),
                "state_name": c.get("state_name")
            })

    return {
        "user_role": role,
        "user_scope": {
            "state_id": user_state_id,
            "district_id": user_dist_id,
            "constituency_id": user_const_id
        },
        "states": states,
        "districts": districts,
        "constituencies": constituencies,
        "mps": mps
    }
