"""Scheduler de pré-génération IA (ZG-6 : APScheduler intégré au processus FastAPI)."""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.ai.service import run_pregeneration
from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger

logger = get_logger(__name__)

scheduler = AsyncIOScheduler()


async def _pregeneration_job() -> None:
    """Job quotidien : ouvre sa propre session DB et lance la pré-génération."""
    async with AsyncSessionLocal() as session:
        await run_pregeneration(session)
    logger.info("Pré-génération IA terminée.")


def start_scheduler() -> None:
    """Démarre le scheduler. Exécuté chaque jour à 20h00 (veille au soir)."""
    scheduler.add_job(
        _pregeneration_job,
        CronTrigger(hour=20, minute=0),
        id="ai_pregeneration",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler IA démarré (pré-génération quotidienne à 20h00).")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)