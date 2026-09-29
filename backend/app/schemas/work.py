from pydantic import BaseModel
from typing import Optional, List

class WorkBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    implementing_agency: str
    sanctioned_amount: float
    estimated_cost: float
    start_date: Optional[str] = None
    expected_completion: Optional[str] = None

class WorkCreate(WorkBase):
    id: Optional[str] = None
    constituency_id: Optional[int] = 1
    district_id: Optional[int] = 1
    state_id: Optional[int] = 1

class ProgressUpdateCreate(BaseModel):
    progress_percentage: float
    remarks: Optional[str] = None
    inspector_name: Optional[str] = None

class WorkResponse(WorkBase):
    id: str
    constituency_id: Optional[int] = None
    district_id: Optional[int] = None
    state_id: Optional[int] = None
    released_amount: float = 0.0
    expenditure: float = 0.0
    physical_progress: float = 0.0
    payment_utilization: float = 0.0
    actual_completion: Optional[str] = None
    status: str
    risk_score: Optional[float] = 0.0
    risk_level: Optional[str] = "Low"
    anomalies: List[str] = []
    constituency_name: Optional[str] = None
    district_name: Optional[str] = None
    state_name: Optional[str] = None
    mp_name: Optional[str] = None

class WorkBatchUploadItem(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    implementing_agency: str
    estimated_cost: float
    sanctioned_amount: float
    state_id: Optional[int] = 1
    district_id: Optional[int] = 1
    constituency_id: Optional[int] = 1
    start_date: Optional[str] = None
    expected_completion: Optional[str] = None

class WorkBatchUploadRequest(BaseModel):
    works: List[WorkBatchUploadItem]

