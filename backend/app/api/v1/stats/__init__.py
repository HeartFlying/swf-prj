"""Stats API routes."""

from fastapi import APIRouter

from app.api.v1.stats.personal import router as personal_router
from app.api.v1.stats.projects import router as projects_router
from app.api.v1.stats.global_stats import router as global_router

router = APIRouter()
router.include_router(personal_router, prefix="/personal")
router.include_router(projects_router, prefix="/projects")
router.include_router(global_router, prefix="/global")
