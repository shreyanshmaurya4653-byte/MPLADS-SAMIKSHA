from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str # 'MP', 'District', 'State', 'Ministry'
    phone: Optional[str] = None
    
    # MP Specific
    house_type: Optional[str] = None # 'Lok Sabha', 'Rajya Sabha'
    constituency_name: Optional[str] = None
    party: Optional[str] = None
    mp_id: Optional[str] = None
    
    # District Specific
    district_name: Optional[str] = None
    designation: Optional[str] = None
    cadre_id: Optional[str] = None
    department: Optional[str] = None
    
    # State Specific
    state_name: Optional[str] = None
    nodal_code: Optional[str] = None
    
    # Ministry Specific
    ministry_wing: Optional[str] = None
    central_employee_code: Optional[str] = None
    security_token: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    constituency_id: Optional[int] = None
    avatar: Optional[str] = "US"
    state_name: Optional[str] = None
    district_name: Optional[str] = None
    constituency_name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    house_type: Optional[str] = None
    party: Optional[str] = None
    employee_code: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
