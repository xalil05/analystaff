"""Modèles du domaine évaluations de match et pondération."""
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import ContexteSaisie, Pilier, PosteGroupe, sa_enum
from app.core.mixins import CreatedAtMixin, TimestampMixin, BigIntIdentityMixin
from datetime import timezone, datetime


class Evaluation(Base, BigIntIdentityMixin, TimestampMixin):
    """Évaluation globale d'un joueur pour un match (voir SCHEMA_SQL.md §9.1)."""

    __tablename__ = "evaluations"
    __table_args__ = (
        UniqueConstraint("match_id", "player_id", name="uq_evaluations_match_player"),
    )

    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False, index=True)
    note_globale: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 1), nullable=True)
    poids_physique_utilise: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    poids_technique_utilise: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    poids_tactique_utilise: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    poids_mental_utilise: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    statut: Mapped[str] = mapped_column(String(20), nullable=False, default="brouillon")
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
    updated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)


class MatchEvaluationPillar(Base, BigIntIdentityMixin, TimestampMixin):
    """Notes par pilier pour une évaluation de match (voir SCHEMA_SQL.md §9.2)."""

    __tablename__ = "match_evaluation_pillars"
    __table_args__ = (
        CheckConstraint("note >= 0 AND note <= 10", name="ck_match_eval_pillars_note"),
        UniqueConstraint("evaluation_id", "pilier", name="uq_match_eval_pillar"),
    )

    evaluation_id: Mapped[int] = mapped_column(
        ForeignKey("evaluations.id"), nullable=False, index=True
    )
    pilier: Mapped[Pilier] = mapped_column(sa_enum(Pilier, "pilier"), nullable=False)
    note: Mapped[int] = mapped_column(Integer, nullable=False)


class WeightingMatrix(Base, BigIntIdentityMixin, TimestampMixin):
    """Matrice de pondération par club et groupe de poste (voir SCHEMA_SQL.md §9.3)."""

    __tablename__ = "weighting_matrices"
    __table_args__ = (
        UniqueConstraint("club_id", "poste_groupe", name="uq_weighting_matrices_club_poste"),
    )

    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    poste_groupe: Mapped[PosteGroupe] = mapped_column(
        sa_enum(PosteGroupe, "poste_groupe"), nullable=False
    )
    poids_physique: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    poids_technique: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    poids_tactique: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    poids_mental: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)


class WeightingSnapshot(Base, BigIntIdentityMixin, CreatedAtMixin):
    """Snapshot de pondération utilisé lors d'un calcul (voir SCHEMA_SQL.md §9.4)."""

    __tablename__ = "weighting_snapshots"
    __table_args__ = (UniqueConstraint("evaluation_id", name="uq_weighting_snapshots_evaluation"),)

    evaluation_id: Mapped[int] = mapped_column(
        ForeignKey("evaluations.id"), nullable=False, index=True
    )
    poste_groupe: Mapped[PosteGroupe] = mapped_column(
        sa_enum(PosteGroupe, "poste_groupe"), nullable=False
    )
    poids_physique: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    poids_technique: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    poids_tactique: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    poids_mental: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)