from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import verify_password, create_access_token, get_password_hash
from ..core.dependencies import get_current_user
from ..models.user import User
from ..schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

ROLE_GEOGRAPHY = {
    "MP": {
        "constituency_name": "Central Constituency",
        "district_name": "Central District",
        "state_name": "Uttar Pradesh",
        "house_type": "Lok Sabha",
        "party": "Bharatiya Janata Party (BJP)",
        "designation": "Hon'ble Member of Parliament (Lok Sabha)",
        "department": "Parliament House Complex / MPLADS Nodal Division",
        "employee_code": "MP-LS-2024-042"
    },
    "District": {
        "district_name": "District Administrative Jurisdiction",
        "state_name": "Uttar Pradesh",
        "designation": "District Magistrate & Collector",
        "department": "District Urban & Rural Development Authority (DRDA)",
        "employee_code": "IAS-UP-2018-084"
    },
    "State": {
        "state_name": "Uttar Pradesh",
        "designation": "Principal Secretary / State Nodal Officer",
        "department": "Planning & Programme Implementation Department",
        "employee_code": "SNO-UP-PLAN-01"
    },
    "Ministry": {
        "state_name": "National Oversight (New Delhi)",
        "designation": "Joint Secretary (MPLADS Division)",
        "department": "Ministry of Statistics and Programme Implementation (MoSPI)",
        "employee_code": "MOSPI-CENTRAL-09"
    }
}

def generate_avatar(name: str) -> str:
    parts = name.strip().split()
    if len(parts) >= 2:
        return f"{parts[0][0]}{parts[1][0]}".upper()
    elif len(parts) == 1 and len(parts[0]) >= 2:
        return parts[0][:2].upper()
    return "US"

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    geo = ROLE_GEOGRAPHY.get(user.role, {})
    
    token = create_access_token(
        subject=user.id,
        role=user.role,
        jurisdiction={
            "name": user.name,
            "email": user.email,
            "state_id": user.state_id,
            "district_id": user.district_id,
            "constituency_id": user.constituency_id
        }
    )

    user_resp = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        state_id=user.state_id,
        district_id=user.district_id,
        constituency_id=user.constituency_id,
        avatar=user.avatar or generate_avatar(user.name),
        **geo
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_resp
    )

@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this official email address already exists."
        )

    avatar = generate_avatar(payload.name)
    hashed_pwd = get_password_hash(payload.password)

    # Resolve jurisdictional IDs based on state / district / constituency names
    state_id = 1 if payload.state_name else None
    district_id = 1 if payload.district_name else None
    constituency_id = 1 if payload.constituency_name else None

    new_user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hashed_pwd,
        role=payload.role,
        state_id=state_id,
        district_id=district_id,
        constituency_id=constituency_id,
        avatar=avatar,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(
        subject=new_user.id,
        role=new_user.role,
        jurisdiction={
            "name": new_user.name,
            "email": new_user.email,
            "state_id": new_user.state_id,
            "district_id": new_user.district_id,
            "constituency_id": new_user.constituency_id
        }
    )

    user_resp = UserResponse(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        role=new_user.role,
        phone=payload.phone,
        state_id=new_user.state_id,
        district_id=new_user.district_id,
        constituency_id=new_user.constituency_id,
        avatar=avatar,
        state_name=payload.state_name or "Uttar Pradesh",
        district_name=payload.district_name or ("District Administrative Jurisdiction" if payload.role in ["MP", "District"] else None),
        constituency_name=payload.constituency_name or ("Central Constituency" if payload.role == "MP" else None),
        designation=payload.designation,
        department=payload.department or payload.ministry_wing,
        house_type=payload.house_type,
        party=payload.party,
        employee_code=payload.central_employee_code or payload.cadre_id or payload.mp_id
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_resp
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.get("sub") or current_user.get("id")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    geo = ROLE_GEOGRAPHY.get(user.role, {})
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        state_id=user.state_id,
        district_id=user.district_id,
        constituency_id=user.constituency_id,
        avatar=user.avatar or generate_avatar(user.name),
        **geo
    )
