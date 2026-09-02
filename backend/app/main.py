"""
Point d'entrée de l'API Analystaff.

Monolithe modulaire FastAPI (voir DECISIONS_FIGEES.md §Architecture).
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.limiter import limiter
from app.core.config import get_settings
from app.core.database import dispose_engine
from app.core.errors import AnalystaffError, analystaff_error_handler
from app.core.health import router as health_router
from app.core.logger_config import get_logger, setup_logging
from app.auth.router import router as auth_router
from app.clubs.router import router as clubs_router
from app.players.router import router as players_router
from app.roles.router import router as staff_router
from app.matches.router import router as matches_router
from app.training.router import router as training_router
from app.planning.router import router as planning_router
from app.evaluations.router import router as evaluations_router
from app.ai.router import router as ai_router
from app.ai.scheduler import start_scheduler, stop_scheduler
from app.files.router import router as files_router
from app.dashboard.router import router as dashboard_router

settings = get_settings()
setup_logging("DEBUG" if settings.debug else "INFO")
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Démarrage d'Analystaff")
    start_scheduler()
    yield
    stop_scheduler()
    await dispose_engine()
    logger.info("Arrêt d'Analystaff")


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Quota d'appels IA dépassé pour ce club (100/jour). Veuillez réessayer demain.",
            "error_code": "RATE_LIMIT_EXCEEDED"
        },
    )


def create_app() -> FastAPI:
    """Fabrique de l'application FastAPI."""
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
    )

    # --- Rate limiting applicatif (ZG-4) ---
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # --- CORS restrictif ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # --- Erreurs standardisées ---
    app.add_exception_handler(AnalystaffError, analystaff_error_handler)

    # --- Routes ---
    app.include_router(health_router)
    app.include_router(auth_router, prefix=f"{settings.api_v1_prefix}/auth")
    app.include_router(clubs_router, prefix=f"{settings.api_v1_prefix}/clubs")
    app.include_router(staff_router, prefix=f"{settings.api_v1_prefix}/clubs")
    app.include_router(players_router, prefix=f"{settings.api_v1_prefix}/clubs")
    app.include_router(matches_router, prefix=f"{settings.api_v1_prefix}/clubs")
    app.include_router(training_router, prefix=f"{settings.api_v1_prefix}/clubs")
    app.include_router(planning_router, prefix=f"{settings.api_v1_prefix}/clubs")
    app.include_router(evaluations_router, prefix=f"{settings.api_v1_prefix}/clubs")
    # AI router: MVP (sans club_id, auto-resolu)
    app.include_router(ai_router, prefix=f"{settings.api_v1_prefix}")
    app.include_router(files_router, prefix=f"{settings.api_v1_prefix}/clubs")
    app.include_router(dashboard_router, prefix=f"{settings.api_v1_prefix}/clubs")
    return app


app = create_app()
