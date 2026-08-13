"""Modèles du domaine clubs, saisons et équipes."""
from datetime import date
from typing import Optional

from sqlalchemy import Boolean, Date, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import ClubLevel, sa_enum
from app.core.mixins import TimestampMixin


class Club(Base, TimestampMixin):
    """Club de football (voir SCHEMA_SQL.md §4.1)."""

    __tablename__ = "clubs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nom: Mapped[str] = mapped_column(String(150), nullable=False)
    niveau: Mapped[ClubLevel] = mapped_column(
        sa_enum(ClubLevel, "club_level"), nullable=False, index=True
    )
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="Africa/Dakar")
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class Season(Base, TimestampMixin):
    """Saison sportive d'un club (voir SCHEMA_SQL.md §4.2)."""

    __tablename__ = "seasons"
    __table_args__ = (UniqueConstraint("club_id", "label", name="uq_seasons_club_label"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    date_debut: Mapped[date] = mapped_column(Date, nullable=False)
    date_fin: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class Team(Base, TimestampMixin):
    """Équipe d'un club (voir SCHEMA_SQL.md §4.3)."""

    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    categorie: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)