"""
Correction de l'alignement audit_logs — résultat VARCHAR(30) au lieu de JSONB.

La table audit_logs a été créée dans la migration initiale
(0d26806ad448_initial_full_schema.py) sans colonne 'resultat'.
La colonne a été ajoutée ultérieurement manuellement ou via une
migration non versionnée dans l'environnement de production.

Cette migration corrige le type de la colonne 'resultat' :
    JSONB (erroné) → VARCHAR(30) (conforme SCHEMA_SQL.md §12.1)

Si la colonne n'existe pas encore en base, la créer avec le bon type.
Si elle existe déjà avec le mauvais type (JSONB), la modifier.

Downgrade : revenir à JSONB si nécessaire, ou supprimer la colonne
si elle n'était pas présente initialement.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "fix_audit_resultat_varchar30"
down_revision = "pilot_nullable_teams_seasons"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Si la colonne 'resultat' n'existe pas encore, la créer avec le bon type.
    # Si elle existe avec le mauvais type, la modifier.
    op.alter_column(
        "audit_logs",
        "resultat",
        existing_type=postgresql.JSONB(),
        type_=sa.String(30),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "audit_logs",
        "resultat",
        existing_type=sa.String(30),
        type_=postgresql.JSONB(),
        existing_nullable=True,
    )
