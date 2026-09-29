from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text
from sqlalchemy.sql import func
from ..core.database import Base

class Work(Base):
    __tablename__ = "works"

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    constituency_id = Column(Integer, index=True, nullable=True)
    district_id = Column(Integer, index=True, nullable=True)
    state_id = Column(Integer, index=True, nullable=True)
    implementing_agency = Column(String(150), nullable=False)
    estimated_cost = Column(Float, nullable=False)
    sanctioned_amount = Column(Float, nullable=False)
    released_amount = Column(Float, default=0.0)
    expenditure = Column(Float, default=0.0)
    physical_progress = Column(Float, default=0.0)
    payment_utilization = Column(Float, default=0.0)
    start_date = Column(String(20), nullable=True)
    expected_completion = Column(String(20), nullable=True)
    actual_completion = Column(String(20), nullable=True)
    status = Column(String(50), default="Sanctioned", index=True)
    created_at = Column(DateTime, default=func.now())
