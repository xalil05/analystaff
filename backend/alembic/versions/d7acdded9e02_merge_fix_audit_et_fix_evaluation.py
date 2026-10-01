"""merge fix_audit et fix_evaluation

Revision ID: d7acdded9e02
Revises: fix_audit_resultat_varchar30, fix_evaluation_statut_enum
Create Date: 2026-10-01 22:37:34.227112

"""
from alembic import op
import sqlalchemy as sa


revision = 'd7acdded9e02'
down_revision = ('fix_audit_resultat_varchar30', 'fix_evaluation_statut_enum')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
