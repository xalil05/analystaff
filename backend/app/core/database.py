"""
Connexion et pool de connexions PostgreSQL.

Décision ZG-3 : pool SQLAlchemy configuré (15 connexions + 5 overflow,
timeout 30s), sans PgBouncer pour le V0.
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()


class Base(DeclarativeBase):
    """Base déclarative commune à tous les modèles SQLAlchemy."""


# Pool de connexions asynchrone (voir ZG-3 dans DECISIONS_FIGEES.md)
engine = create_async_engine(
    settings.database_url,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_recycle=settings.db_pool_recycle,
    pool_pre_ping=True,  # détecte les connexions mortes avant usage
    echo=settings.db_echo,
)

# Fabrique de sessions asynchrones
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dépendance FastAPI fournissant une session DB.

    Le commit est géré explicitement par les services. En cas d'erreur,
    un rollback est effectué et la session est fermée proprement.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    """Ferme proprement le pool (appelé à l'arrêt de l'application)."""
    await engine.dispose()