"""
Configuration Alembic asynchrone.

L'URL de la base est lue depuis les Settings (jamais codée en dur).
Les modèles seront importés ici en Phase 2 pour qu'Alembic les détecte.
"""
# Phase 2 : import des modèles pour la détection automatique par Alembic.
from app.users.models import User  # noqa: F401
from app.clubs.models import Club, Season, Team  # noqa: F401
from app.roles.models import (  # noqa: F401
    Invitation,
    Permission,
    Role,
    RolePermission,
    RolesAvailableByLevel,
    StaffMember,
    UserPermission,
)
from app.players.models import MedicalRecord, PhysicalProfile, Player  # noqa: F401
from app.matches.models import (  # noqa: F401
    Formation,
    LineupPlayer,
    Match,
    MatchTacticalSetup,
    Substitution,
)
from app.auth.models import RefreshToken  # noqa: F401
from app.ai.models import AiFeedback, AiSuggestion, AiTemplate  # noqa: F401
from app.training.models import (  # noqa: F401
    TrainingEvaluation,
    TrainingEvaluationPillar,
    TrainingSession,
)
from app.planning.models import WorkPlan, WorkPlanItem  # noqa: F401
from app.evaluations.models import (  # noqa: F401
    Evaluation,
    MatchEvaluationPillar,
    WeightingMatrix,
    WeightingSnapshot,
)
from alembic import context
from logging.config import fileConfig
import asyncio
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from app.core.database import Base
from app.core.config import get_settings
from app.files.models import UploadedFile  # noqa: F401



# Phase 2 : importer ici tous les modèles pour la détection automatique.
from app.clubs.models import Club  # noqa

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()