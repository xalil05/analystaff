"""
Mixins de colonnes réutilisables.

Règle (voir SCHEMA_SQL.md §1.3) : stockage en UTC via TIMESTAMPTZ.
"""
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Identity, func
from sqlalchemy.orm import Mapped, mapped_column


class BigIntIdentityMixin:
    """
    Contrat SCHEMA_SQL.md §1.2 : BIGINT GENERATED ALWAYS AS IDENTITY.
    Remplace l'ancien pattern Integer + autoincrement.
    """

    id: Mapped[int] = mapped_column(
        BigInteger,
        Identity(always=True),
        primary_key=True,
    )


class CreatedAtMixin:
    """Ajoute uniquement created_at (tables d'association et de logs)."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class TimestampMixin(CreatedAtMixin):
    """Ajoute created_at + updated_at (tables d'entités)."""

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )