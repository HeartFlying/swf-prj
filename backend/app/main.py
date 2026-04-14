"""FastAPI application main entry."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.cache import router as cache_router
from app.api.v1.projects import router as projects_router
from app.api.v1.stats.global_stats import router as global_stats_router
from app.api.v1.stats.personal import router as personal_stats_router
from app.api.v1.stats.projects import router as project_stats_router
from app.api.v1.sync import router as sync_router
from app.api.v1.users import router as users_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.core.response import StandardResponseMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    setup_logging()
    yield
    # Shutdown


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan,
)

# Register exception handlers (must be before middleware)
register_exception_handlers(app)

# Standard response middleware (must be before CORS)
app.add_middleware(StandardResponseMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(global_stats_router, prefix="/api/v1/stats/global")
app.include_router(project_stats_router, prefix="/api/v1/stats/projects")
app.include_router(personal_stats_router, prefix="/api/v1/stats/personal")
app.include_router(sync_router, prefix="/api/v1/sync")
app.include_router(cache_router, prefix="/api/v1/cache")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.VERSION}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
    }
