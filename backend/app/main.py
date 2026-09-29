import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.database import init_db
from .routers import (
    auth_router,
    dashboard_router,
    works_router,
    risks_router,
    alerts_router,
    trends_router,
    users_router,
    jurisdiction_router
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="MPLADS AI Monitoring & Decision-Support System REST API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to ensure database is created & seeded
@app.on_event("startup")
def on_startup():
    init_db()

# Mount API Routers
api_v1 = settings.API_V1_STR
app.include_router(auth_router, prefix=api_v1)
app.include_router(dashboard_router, prefix=api_v1)
app.include_router(works_router, prefix=api_v1)
app.include_router(risks_router, prefix=api_v1)
app.include_router(alerts_router, prefix=api_v1)
app.include_router(trends_router, prefix=api_v1)
app.include_router(users_router, prefix=api_v1)
app.include_router(jurisdiction_router, prefix=api_v1)


@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "documentation": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
