"""
Retrait par défaut d'une permission de rôle — colonne `user_permissions.denied`.

La table `user_permissions` ne savait jusqu'ici qu'accorder des exceptions
positives. Une permission possédée par défaut par le rôle ne pouvait donc pas
être retirée à une personne précise : `DECISIONS_FIGEES.md` §6 autorise le
coach à retirer « au-delà de son rôle par défaut », et
`MATRICE_PERMISSIONS_ET_REGLES_METIER.md` §10.1 liste « Retirer des
permissions ». C'est la lacune enregistrée dans `ROADMAP_IDEES.md` §18.1
(« Retrait d'une permission par défaut — Lacune schéma »).

`denied = false` : exception positive, l'accord du coach (comportement actuel).
`denied = true`  : exception négative, le retrait du coach. Une ligne de retrait
                    prime sur `role_permissions` pour ce membre uniquement.

Toutes les lignes existantes sont des ACCORDS : `server_default=false` conserve
exactement les permissions accordées jusqu'ici. Aucune donnée n'est perdue.

ATTENTION : cette migration n'a pas été exécutée par son auteur (ticket #9).
Elle doit être appliquée par l'opérateur sur la base cible avec
`alembic upgrade perm_retrait_defaut`, après vérification du head courant.

Revision ID: perm_retrait_defaut
Revises: d7acdded9e02
Create Date: 2026-10-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "perm_retrait_defaut"
down_revision = "d7acdded9e02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_permissions",
        sa.Column(
            "denied",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
            comment="false = accord du coach, true = retrait (prime sur le rôle)",
        ),
    )


def downgrade() -> None:
    # ATTENTION : le downgrade efface les retraits enregistrés. Les membres
    # concernés retrouvent les permissions de leur rôle par défaut.
    op.drop_column("user_permissions", "denied")