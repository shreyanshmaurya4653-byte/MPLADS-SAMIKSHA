from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from ..core.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(50), primary_key=True, index=True)
    work_id = Column(String(50), index=True, nullable=False)
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False) # 'Low', 'Medium', 'High'
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime, default=func.now())
