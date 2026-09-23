"""Modèle Team — migré depuis app/clubs/models.py."""
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.mixins import BigIntIdentityMixin, TimestampMixin


class Team(Base, BigIntIdentityMixin, TimestampMixin):
    """Équipe d'un club (voir SCHEMA_SQL.md §4.3)."""

    __tablename__ = "teams"

    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    categorie: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)