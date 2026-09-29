from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from ..core.database import Base

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    work_id = Column(String(50), unique=True, index=True, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False) # 'Low', 'Medium', 'High'
    cost_risk = Column(Float, default=0.0)
    delay_risk = Column(Float, default=0.0)
    payment_risk = Column(Float, default=0.0)
    duplicate_risk = Column(Float, default=0.0)
    compliance_risk = Column(Float, default=0.0)
    anomalies_json = Column(Text, default="[]")
    model_version = Column(String(50), default="v1.4-ensemble")
    analyzed_at = Column(DateTime, default=func.now())
