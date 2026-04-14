"""Mock Server Main Entry Point

This is a standalone Mock Server that simulates external APIs:
- GitLab API (commits, merge requests, members)
- ZenTao API (bugs, tasks)
- Trae API (token usage, AI suggestions)

Run with: uvicorn main:app --host 0.0.0.0 --port 8001
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import gitlab, zendao, trae

app = FastAPI(
    title="Mock Server",
    description="Mock server for GitLab, ZenTao, and Trae APIs",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(gitlab.router, prefix="/api/v4")
app.include_router(zendao.router, prefix="/api/v1/zendao")
app.include_router(trae.router, prefix="/api/v1/trae")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Mock Server is running",
        "apis": {
            "gitlab": "/api/v4",
            "zendao": "/api/v1/zendao",
            "trae": "/api/v1/trae",
        },
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
