"""
Test de contrat de schéma (Phase 5 — CI/CD).

Vérifie que les tables et colonnes documentées dans SCHEMA_SQL.md
correspondent aux modèles SQLAlchemy. Évite la dérive documentation/code.

Ce test ne nécessite PAS de connexion PostgreSQL.
"""
import re
from pathlib import Path

import pytest

# Chemin vers la documentation schéma
SCHEMA_DOC = Path(__file__).resolve().parents[2] / "SCHEMA_SQL.md"


def parse_schema_doc() -> dict[str, list[str]]:
    """
    Parse SCHEMA_SQL.md et retourne {table_name: [colonnes]}.

    Format attendu :
    ### N.N Table `table_name`
    | Colonne | Type | Contraintes | Description |
    |---|---|---|---|
    | `col1` | ... | ... | ... |
    """
    if not SCHEMA_DOC.exists():
        pytest.skip(f"SCHEMA_DOC introuvable: {SCHEMA_DOC}")

    content = SCHEMA_DOC.read_text(encoding="utf-8")
    tables: dict[str, list[str]] = {}

    # Trouver les sections de table
    table_pattern = re.compile(r"### \d+\.\d+ Table `(\w+)`")
    row_pattern = re.compile(r"^\| `(\w+)` \|")

    current_table = None
    for line in content.splitlines():
        # Début d'une nouvelle table
        m = table_pattern.match(line)
        if m:
            current_table = m.group(1)
            tables[current_table] = []
            continue

        # Ligne de colonne
        if current_table:
            rm = row_pattern.match(line)
            if rm:
                tables[current_table].append(rm.group(1))

    return tables


def test_all_documented_tables_exist():
    """Vérifie que chaque table documentée existe dans Base.metadata."""
    from app.core.database import Base
    from app.players.models import Player, PhysicalProfile, MedicalRecord, PlayerParentalConsent
    from app.users.models import User, UserPreference
    from app.evaluations.models import Evaluation
    from app.training.models import TrainingSession, TrainingEvaluation
    from app.roles.models import Permission, Role, StaffMember
    from app.matches.models import Match
    from app.planning.models import WorkPlan, WorkPlanItem
    from app.files.models import UploadedFile
    from app.clubs.models import Club, Team, Season
    from app.auth.models import RefreshToken
    from app.ai.models import AiTemplate, AiSuggestion, AiFeedback
    from app.audit.models import AuditLog

    documented = parse_schema_doc()
    existing_tables = set(Base.metadata.tables.keys())

    missing = []
    for table_name in documented:
        if table_name not in existing_tables:
            missing.append(table_name)

    assert not missing, (
        f"Tables documentées mais absentes des modèles: {missing}. "
        f"Mettre à jour les modèles ou la documentation."
    )


def test_all_documented_columns_exist():
    """Vérifie que chaque colonne documentée existe dans le modèle."""
    from app.core.database import Base
    from app.players.models import Player, PhysicalProfile, MedicalRecord, PlayerParentalConsent
    from app.users.models import User, UserPreference
    from app.evaluations.models import Evaluation
    from app.training.models import TrainingSession, TrainingEvaluation
    from app.roles.models import Permission, Role, StaffMember
    from app.matches.models import Match
    from app.planning.models import WorkPlan, WorkPlanItem
    from app.files.models import UploadedFile
    from app.clubs.models import Club, Team, Season
    from app.auth.models import RefreshToken
    from app.ai.models import AiTemplate, AiSuggestion, AiFeedback
    from app.audit.models import AuditLog

    documented = parse_schema_doc()

    missing = []
    for table_name, columns in documented.items():
        if table_name not in Base.metadata.tables:
            continue
        model_columns = {c.name for c in Base.metadata.tables[table_name].columns}
        for col in columns:
            if col not in model_columns:
                missing.append(f"{table_name}.{col}")

    assert not missing, (
        f"Colonnes documentées mais absentes des modèles: {missing}. "
        f"Mettre à jour les modèles ou la documentation."
    )


def test_no_undocumented_tables():
    """Vérifie qu'aucune table du modèle n'est absente de la documentation."""
    from app.core.database import Base
    from app.players.models import Player, PhysicalProfile, MedicalRecord, PlayerParentalConsent
    from app.users.models import User, UserPreference
    from app.evaluations.models import Evaluation
    from app.training.models import TrainingSession, TrainingEvaluation
    from app.roles.models import Permission, Role, StaffMember
    from app.matches.models import Match
    from app.planning.models import WorkPlan, WorkPlanItem
    from app.files.models import UploadedFile
    from app.clubs.models import Club, Team, Season
    from app.auth.models import RefreshToken
    from app.ai.models import AiTemplate, AiSuggestion, AiFeedback
    from app.audit.models import AuditLog

    documented = parse_schema_doc()
    existing_tables = set(Base.metadata.tables.keys())

    # Tables techniques non documentées (index, alembic, etc.)
    technical_tables = {"alembic_version"}

    undocumented = []
    for table_name in existing_tables:
        if table_name not in documented and table_name not in technical_tables:
            undocumented.append(table_name)

    assert not undocumented, (
        f"Tables dans les modèles mais absentes de SCHEMA_SQL.md: {undocumented}. "
        f"Documenter ou marquer comme technique."
    )
