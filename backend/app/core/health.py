"""
Healthcheck interne (décision ZG-16).

Exposé sur /health. Uptime Robot (externe, gratuit) interroge cet
endpoint pour détecter les indisponibilités.
"""
from fastapi import APIRouter
from sqlalchemy import text

from app.core.database import engine

router = APIRouter(tags=["health"])


@router.get("/health")
async def healthcheck() -> dict:
    """Vérifie que l'API répond et que la base de données est joignable."""
    db_status = "ok"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "unavailable"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "service": "analystaff-api",
    }