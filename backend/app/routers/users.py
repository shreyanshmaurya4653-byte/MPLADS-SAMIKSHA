from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.user import User
from ..schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.is_active == True).all()
    return [
        UserResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
            state_id=u.state_id,
            district_id=u.district_id,
            constituency_id=u.constituency_id,
            avatar=u.avatar or "US"
        )
        for u in users
    ]
