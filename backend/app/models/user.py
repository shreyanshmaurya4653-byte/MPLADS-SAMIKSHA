from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False) # 'MP', 'District', 'State', 'Ministry', 'Admin'
    state_id = Column(Integer, nullable=True)
    district_id = Column(Integer, nullable=True)
    constituency_id = Column(Integer, nullable=True)
    avatar = Column(String(10), default="US")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
