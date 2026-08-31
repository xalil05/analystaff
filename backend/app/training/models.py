"""Modèles du domaine entraînement."""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import Assiduite, ContexteSaisie, Pilier, TrainingStatut, sa_enum
from app.core.mixins import TimestampMixin, BigIntIdentityMixin


class TrainingSession(Base, BigIntIdentityMixin, TimestampMixin):
    """Séance d'entraînement (voir SCHEMA_SQL.md §8.2)."""

    __tablename__ = "training_sessions"

    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=False, index=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), nullable=False)
    date_seance: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    lieu: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    objectifs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    exercices: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    charge_prevue: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    statut: Mapped[TrainingStatut] = mapped_column(
        sa_enum(TrainingStatut, "training_statut"),
        nullable=False,
        default=TrainingStatut.planifiee,
        index=True,
    )
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)


class TrainingEvaluation(Base, BigIntIdentityMixin, TimestampMixin):
    """Évaluation post-entraînement d'un joueur (voir SCHEMA_SQL.md §8.4)."""

    __tablename__ = "training_evaluations"
    __table_args__ = (
        CheckConstraint(
            "charge_percue_rpe IS NULL OR (charge_percue_rpe >= 1 AND charge_percue_rpe <= 10)",
            name="ck_training_evaluations_rpe",
        ),
    )

    training_session_id: Mapped[int] = mapped_column(
        ForeignKey("training_sessions.id"), nullable=False, index=True
    )
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False, index=True)
    assiduite: Mapped[Assiduite] = mapped_column(sa_enum(Assiduite, "assiduite"), nullable=False)
    charge_percue_rpe: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    saisie_hors_ligne: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    synchronisee: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    contexte_saisie: Mapped[ContexteSaisie] = mapped_column(
        sa_enum(ContexteSaisie, "contexte_saisie"), nullable=False, default=ContexteSaisie.autre
    )
    date_saisie_reelle: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    date_creation_en_base: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)


class TrainingEvaluationPillar(Base, BigIntIdentityMixin, TimestampMixin):
    """Notes par pilier optionnelles (voir SCHEMA_SQL.md §8.5)."""

    __tablename__ = "training_evaluation_pillars"
    __table_args__ = (
        CheckConstraint("note >= 0 AND note <= 10", name="ck_training_eval_pillars_note"),
        UniqueConstraint("training_evaluation_id", "pilier", name="uq_training_eval_pillar"),
    )

    training_evaluation_id: Mapped[int] = mapped_column(
        ForeignKey("training_evaluations.id"), nullable=False, index=True
    )
    pilier: Mapped[Pilier] = mapped_column(sa_enum(Pilier, "pilier"), nullable=False)
    note: Mapped[int] = mapped_column(Integer, nullable=False)