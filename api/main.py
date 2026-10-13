"""
Apple Tray Grading REST API + optional React UI

Run from project root (folder that contains `api/`):
  python -m uvicorn api.main:app --host 0.0.0.0 --port 8000

Do NOT use `python -m http.server` for login/analysis — that only serves files
and returns 404 for /api/v1/auth/login.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from api.auth import hash_password
from api.config import (
    BOOTSTRAP_ADMIN_EMAIL,
    BOOTSTRAP_ADMIN_NAME,
    BOOTSTRAP_ADMIN_PASSWORD,
    PROJECT_ROOT,
    ensure_dirs,
)
from api.database import db
from api.email import smtp_configured
from api.job_worker import job_worker
from api.ml_service import grader_service
from api.routers import admin_routes, auth_routes, grade_routes, jobs_routes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")


def _resolve_frontend_build() -> Path | None:
    """React build folder (index.html). Optional for API-only deploys."""
    candidates = []
    env = os.getenv("FRONTEND_BUILD_DIR")
    if env:
        candidates.append(Path(env))
    candidates.extend(
        [
            PROJECT_ROOT / "frontend_build",
            PROJECT_ROOT / "build",
            PROJECT_ROOT / "Productapp" / "build",
        ]
    )
    for path in candidates:
        if (path / "index.html").is_file():
            return path.resolve()
    return None


FRONTEND_BUILD = _resolve_frontend_build()


def bootstrap_admin() -> None:
    """Create a default admin on first run if none exists."""
    if db.count_admins() > 0:
        return
    existing = db.get_user_by_email(BOOTSTRAP_ADMIN_EMAIL)
    if existing:
        db.update_user(existing["id"], role="admin", status="approved")
        logger.info("Promoted existing user %s to admin", BOOTSTRAP_ADMIN_EMAIL)
        return
    db.create_user(
        email=BOOTSTRAP_ADMIN_EMAIL,
        full_name=BOOTSTRAP_ADMIN_NAME,
        password_hash=hash_password(BOOTSTRAP_ADMIN_PASSWORD),
        role="admin",
        status="approved",
        org_id=None,
    )
    logger.info("Bootstrap admin created: %s", BOOTSTRAP_ADMIN_EMAIL)


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_dirs()
    bootstrap_admin()
    try:
        if grader_service.ready:
            logger.info("ML models loaded successfully")
        else:
            logger.warning("ML models not ready: %s", grader_service.load_error)
    except Exception as exc:
        logger.warning("ML model preload failed: %s", exc)
    yield
    job_worker.shutdown()


app = FastAPI(
    title="Apple Tray Grading API",
    description=(
        "Auth + grade API. React UI served from frontend_build/ when present. "
        "Core grader.py is used as-is and not modified."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers FIRST — never blocked by SPA
app.include_router(grade_routes.router, prefix="/api/v1")
app.include_router(auth_routes.router, prefix="/api/v1")
app.include_router(jobs_routes.router, prefix="/api/v1")
app.include_router(admin_routes.router, prefix="/api/v1")

_STATIC_DIR = Path(__file__).resolve().parent / "static"


@app.get("/test")
def test_page():
    page = _STATIC_DIR / "test_grade.html"
    if not page.exists():
        return JSONResponse({"detail": "test page missing"}, status_code=404)
    return FileResponse(page)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "path": request.url.path,
            "error": str(exc),
        },
    )


@app.get("/health")
def health():
    auth_paths = [
        getattr(r, "path", "")
        for r in app.routes
        if "auth" in getattr(r, "path", "")
    ]
    return {
        "status": "ok",
        "ml_ready": grader_service.ready,
        "ml_error": grader_service.load_error,
        "frontend": bool(FRONTEND_BUILD),
        "auth_routes_loaded": any("/api/v1/auth/login" in p or p.endswith("/login") for p in auth_paths)
        or any("auth" in p for p in auth_paths),
        "smtp_configured": smtp_configured(),
        "auth_paths": auth_paths[:20],
    }


@app.get("/")
def root():
    if FRONTEND_BUILD is not None:
        return FileResponse(FRONTEND_BUILD / "index.html")
    return {
        "name": "Apple Tray Grading API",
        "grade_api": "POST /api/v1/grade",
        "login": "POST /api/v1/auth/login",
        "docs": "/docs",
        "health": "/health",
    }


def _is_api_or_docs(path: str) -> bool:
    return (
        path.startswith("/api")
        or path.startswith("/docs")
        or path.startswith("/redoc")
        or path.startswith("/openapi")
        or path in ("/health", "/test")
    )


# React static assets
if FRONTEND_BUILD is not None:
    assets_dir = FRONTEND_BUILD / "static"
    if assets_dir.is_dir():
        app.mount("/static", StaticFiles(directory=str(assets_dir)), name="frontend-static")

    @app.middleware("http")
    async def spa_fallback_middleware(request: Request, call_next):
        """
        After normal routing: only GET 404s that are NOT API/docs become index.html.
        POST /api/v1/auth/login is never rewritten.
        """
        response = await call_next(request)
        if (
            response.status_code == 404
            and request.method == "GET"
            and FRONTEND_BUILD is not None
            and not _is_api_or_docs(request.url.path)
            and not request.url.path.startswith("/static")
        ):
            index = FRONTEND_BUILD / "index.html"
            if index.is_file():
                return FileResponse(index)
        return response

    logger.info("Serving React UI from %s", FRONTEND_BUILD)
else:
    logger.warning(
        "No React build found at %s — UI will not show on /",
        PROJECT_ROOT / "frontend_build",
    )
