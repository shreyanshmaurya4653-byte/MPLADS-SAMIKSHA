from sqlalchemy import Column, Integer, String, Float
from ..core.database import Base

class Expenditure(Base):
    __tablename__ = "expenditures"

    id = Column(Integer, primary_key=True, autoincrement=True)
    work_id = Column(String(50), index=True, nullable=False)
    amount = Column(Float, nullable=False)
    month_name = Column(String(20), nullable=False)
    expenditure_date = Column(String(20), nullable=False)
    description = Column(String(255), nullable=True)
