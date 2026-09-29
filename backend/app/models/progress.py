from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from ..core.database import Base

class ProgressUpdate(Base):
    __tablename__ = "progress_updates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    work_id = Column(String(50), index=True, nullable=False)
    progress_percentage = Column(Float, nullable=False)
    expected_progress = Column(Float, nullable=True)
    inspection_date = Column(String(20), nullable=False)
    inspector_name = Column(String(150), nullable=True)
    remarks = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now())
