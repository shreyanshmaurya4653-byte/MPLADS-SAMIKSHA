from pydantic import BaseModel
from typing import List, Optional

class RiskAssessmentResponse(BaseModel):
    work_id: str
    risk_score: float
    risk_level: str
    cost_risk: float
    delay_risk: float
    payment_risk: float
    duplicate_risk: float
    compliance_risk: float
    anomalies: List[str]
    explanations: List[str] = []

class RiskOverviewStats(BaseModel):
    total_assessed: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    average_score: float
