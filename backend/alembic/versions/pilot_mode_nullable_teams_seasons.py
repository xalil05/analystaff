"""
Rendre team_id et season_id NULLables pour le mode pilote V0.

Revision ID: pilot_nullable_teams_seasons
Revises: b806a273afbe
Create Date: 2026-09-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "pilot_nullable_teams_seasons"
down_revision = "b806a273afbe"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # players.team_id
    op.alter_column(
        "players",
        "team_id",
        existing_type=sa.Integer(),
        nullable=True,
        existing_comment=None,
    )

    # matches.team_id
    op.alter_column(
        "matches",
        "team_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    # matches.season_id
    op.alter_column(
        "matches",
        "season_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    # training_sessions.team_id
    op.alter_column(
        "training_sessions",
        "team_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    # training_sessions.season_id
    op.alter_column(
        "training_sessions",
        "season_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    # work_plans.team_id
    op.alter_column(
        "work_plans",
        "team_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    # work_plans.season_id
    op.alter_column(
        "work_plans",
        "season_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    # ATTENTION : le downgrade échouera si des lignes contiennent NULL.
    # À utiliser uniquement après avoir back-filled les données en V1.
    op.alter_column("players", "team_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("matches", "team_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("matches", "season_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("training_sessions", "team_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("training_sessions", "season_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("work_plans", "team_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("work_plans", "season_id", existing_type=sa.Integer(), nullable=False)
