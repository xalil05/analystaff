"""Test de la définition des modèles (aucune base de données requise)."""
import app.clubs.models  # noqa: F401
import app.matches.models  # noqa: F401
import app.players.models  # noqa: F401
import app.roles.models  # noqa: F401
import app.users.models  # noqa: F401

from app.core.database import Base


def test_core_tables_are_registered():
    """Les tables principales doivent être enregistrées dans Base.metadata."""
    tables = set(Base.metadata.tables.keys())
    expected = {
        "users",
        "clubs",
        "seasons",
        "teams",
        "roles",
        "permissions",
        "role_permissions",
        "roles_available_by_level",
        "staff_members",
        "user_permissions",
        "invitations",
        "players",
        "physical_profiles",
        "medical_records",
        "formations",
    }
    assert expected.issubset(tables)