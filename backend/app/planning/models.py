"""Modèles du domaine planification (plans de travail)."""
from datetime import date
from typing import Optional

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import WorkPlanType, sa_enum
from app.core.mixins import TimestampMixin


class WorkPlan(Base, TimestampMixin):
    """Plan de travail hebdomadaire ou mensuel (voir SCHEMA_SQL.md §8.1)."""

    __tablename__ = "work_plans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=False, index=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), nullable=False)
    nom: Mapped[str] = mapped_column(String(150), nullable=False)
    type: Mapped[WorkPlanType] = mapped_column(sa_enum(WorkPlanType, "work_plan_type"), nullable=False)
    date_debut: Mapped[date] = mapped_column(Date, nullable=False)
    date_fin: Mapped[date] = mapped_column(Date, nullable=False)
    statut: Mapped[str] = mapped_column(String(30), nullable=False, default="actif")
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)


class WorkPlanItem(Base, TimestampMixin):
    """Élément d'un plan : association plan <-> séance (voir SCHEMA_SQL.md §8.3)."""

    __tablename__ = "work_plan_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    work_plan_id: Mapped[int] = mapped_column(
        ForeignKey("work_plans.id"), nullable=False, index=True
    )
    training_session_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("training_sessions.id"), nullable=True, index=True
    )
    ordre: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    objectifs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    statut_prevu: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="planifie")
    statut_reel: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)