from .auth import router as auth_router
from .dashboard import router as dashboard_router
from .works import router as works_router
from .risks import router as risks_router
from .alerts import router as alerts_router
from .trends import router as trends_router
from .users import router as users_router
from .jurisdiction import router as jurisdiction_router

__all__ = [
    "auth_router",
    "dashboard_router",
    "works_router",
    "risks_router",
    "alerts_router",
    "trends_router",
    "users_router",
    "jurisdiction_router"
]

