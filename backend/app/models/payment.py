from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from ..core.database import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(50), primary_key=True, index=True)
    work_id = Column(String(50), index=True, nullable=False)
    agency_name = Column(String(150), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(String(20), nullable=False)
    payment_mode = Column(String(50), default="RTGS")
    reference_number = Column(String(100), nullable=True)
    status = Column(String(50), default="Disbursed")
