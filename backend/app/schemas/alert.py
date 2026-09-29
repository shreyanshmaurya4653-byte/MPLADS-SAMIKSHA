from pydantic import BaseModel
from typing import Optional

class AlertResponse(BaseModel):
    id: str
    work_id: str
    work_title: Optional[str] = None
    alert_type: str
    severity: str
    title: str
    description: str
    status: str
    created_at: str

class AlertStatusUpdate(BaseModel):
    status: str

class VerificationAction(BaseModel):
    officer_remarks: str
    action_taken: Optional[str] = None
    status: str = "Under Review"
