"""
Configuration des tests.
Stratégie : engine de test SÉPARÉ de l'engine applicatif pour éviter
les problèmes d'event loop attachée au mauvais moment avec asyncpg.
"""
import os

# IMPORTANT : orienter l'application vers la base de test AVANT tout import.
# Écrasement FORCÉ (pas setdefault) : DATABASE_URL est déjà défini par
# docker-compose vers la base dev — setdefault ne ferait rien et les tests
# drop_all/creer_all sur la base de développement. Les tests utilisent
# TOUJOURS analystaff_test.
os.environ["DATABASE_URL"] = (
    "postgresql+asyncpg://analystaff:analystaff@db:5432/analystaff_test"
)

import asyncio
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Create and set a module-level event loop BEFORE importing application modules
# This ensures any async engines/connections created during imports bind to
# the same loop used by pytest-asyncio and avoids 'attached to a different loop'.
_MODULE_LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(_MODULE_LOOP)

# Import de tous les modèles EXISTANTS pour que Base.metadata soit complet.
# IMPORTANT : n'importer QUE les modules qui ont été créés.
# Import de tous les modèles pour que Base.metadata soit complet.
import app.auth.models  # noqa: F401
import app.clubs.models  # noqa: F401
import app.matches.models  # noqa: F401
import app.players.models  # noqa: F401
import app.roles.models  # noqa: F401
import app.users.models  # noqa: F401
import app.files.models  # noqa: F401
# Phase 4C : Entraînements et planification
import app.training.models  # noqa: F401
import app.planning.models  # noqa: F401
# Phase 4D : Évaluations
import app.evaluations.models  # noqa: F401

# Phase 5 : IA
import app.ai.models  # noqa: F401

from app.core.database import Base
from app.core.rate_limit import limiter
from app.core.seed import (
    seed_formations,
    seed_permissions,
    seed_role_permissions,
    seed_roles,
    seed_roles_available_by_level,
    seed_ai_templates,
    seed_system_prompt,
)
from app.main import app

# Désactiver le rate limiting en environnement de test.
limiter.enabled = False

# Engine de test SÉPARÉ - critique pour éviter les problèmes d'event loop
TEST_DATABASE_URL = os.environ.get("DATABASE_URL")
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    pool_size=5,
    max_overflow=5,
    pool_timeout=30,
    echo=False,
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """Return the module-level event loop and close it at teardown."""
    yield _MODULE_LOOP
    # Close the loop after the whole test session finishes
    _MODULE_LOOP.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Crée les tables et insère les données de référence une fois par session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


    async with TestSessionLocal() as session:
        role_ids = await seed_roles(session)
        perm_ids = await seed_permissions(session)
        await seed_roles_available_by_level(session, role_ids)
        await seed_role_permissions(session, role_ids, perm_ids)
        await seed_formations(session)
        await seed_ai_templates(session)
        await seed_system_prompt(session)
        await session.commit()

    yield

    # Nettoyage final
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db() -> AsyncSession:
    """
    Session DB pour les tests.
    IMPORTANT : ne PAS utiliser session.begin() ici car certains tests
    font des commits explicites. On fait juste un rollback à la fin.
    """
    async with TestSessionLocal() as session:
        yield session
        # Rollback pour nettoyer les données créées par le test
        await session.rollback()


@pytest_asyncio.fixture
async def client():
    """Client HTTP asynchrone branché sur l'application."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c