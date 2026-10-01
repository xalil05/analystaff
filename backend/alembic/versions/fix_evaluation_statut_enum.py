from alembic import op

# revision identifiers, used by Alembic.
revision = "fix_evaluation_statut_enum"
down_revision = "pilot_nullable_teams_seasons"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE evaluation_statut AS ENUM ('brouillon','validee','archive')")
    op.execute("ALTER TABLE evaluations ALTER COLUMN statut TYPE evaluation_statut USING statut::evaluation_statut")
