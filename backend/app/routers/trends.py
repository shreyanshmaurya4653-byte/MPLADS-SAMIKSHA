from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..services.dashboard_service import get_fund_utilization_trends

router = APIRouter(prefix="/trends", tags=["Macro Trends"])

@router.get("/expenditure")
def get_macro_expenditure_trends(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_fund_utilization_trends(db, current_user)

@router.get("/districts")
def get_district_performance():
    return [
        {"district": "Central District", "works": 420, "highRisk": 22, "delayed": 35, "expenditure": 8400000000},
        {"district": "Lucknow", "works": 510, "highRisk": 28, "delayed": 41, "expenditure": 10200000000},
        {"district": "Kanpur", "works": 380, "highRisk": 18, "delayed": 29, "expenditure": 7600000000},
        {"district": "Varanasi", "works": 450, "highRisk": 25, "delayed": 38, "expenditure": 9000000000},
        {"district": "Agra", "works": 320, "highRisk": 12, "delayed": 22, "expenditure": 6400000000},
        {"district": "Mathura", "works": 280, "highRisk": 9, "delayed": 18, "expenditure": 5600000000},
    ]

@router.get("/states")
def get_state_performance():
    return [
        {"state": "Uttar Pradesh", "totalWorks": 4200, "completed": 2800, "ongoing": 1100, "delayed": 300, "highRisk": 128, "totalFunds": 84000000000, "expenditure": 63000000000},
        {"state": "Bihar", "totalWorks": 3100, "completed": 1950, "ongoing": 900, "delayed": 250, "highRisk": 95, "totalFunds": 62000000000, "expenditure": 44000000000},
        {"state": "Rajasthan", "totalWorks": 2800, "completed": 2100, "ongoing": 550, "delayed": 150, "highRisk": 62, "totalFunds": 56000000000, "expenditure": 48000000000},
        {"state": "Maharashtra", "totalWorks": 3600, "completed": 2900, "ongoing": 600, "delayed": 100, "highRisk": 41, "totalFunds": 72000000000, "expenditure": 68000000000},
        {"state": "Madhya Pradesh", "totalWorks": 2500, "completed": 1700, "ongoing": 650, "delayed": 150, "highRisk": 58, "totalFunds": 50000000000, "expenditure": 38000000000}
    ]
