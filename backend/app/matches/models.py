"""
Modèles du domaine matchs et tactique.
Inclut : formations (référence), matchs, compositions (plateau tactique),
positions des joueurs et remplacements. Voir SCHEMA_SQL.md §7.
"""
from datetime import datetime
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
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import LineupStatut, MatchStatut, SubstitutionMotif, sa_enum
from app.core.mixins import CreatedAtMixin, TimestampMixin


class Formation(Base, CreatedAtMixin):
    """Formation tactique prédéfinie (voir SCHEMA_SQL.md §7.2)."""

    __tablename__ = "formations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_preset: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Match(Base, TimestampMixin):
    """Match de l'équipe (voir SCHEMA_SQL.md §7.1)."""

    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=False, index=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), nullable=False, index=True)
    adversaire: Mapped[str] = mapped_column(String(150), nullable=False)
    competition: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_domicile: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    date_match: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    lieu: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    score_equipe: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    score_adversaire: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    statut: Mapped[MatchStatut] = mapped_column(
        sa_enum(MatchStatut, "match_statut"),
        nullable=False,
        default=MatchStatut.brouillon,
        index=True,
    )
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)


class MatchTacticalSetup(Base, TimestampMixin):
    """
    Composition tactique d'un match — plateau tactique (voir SCHEMA_SQL.md §7.3).
    RÈGLE MÉTIER : la composition est sauvée en brouillon, puis validée
    explicitement par le coach. La formation est une aide, pas une contrainte.
    """

    __tablename__ = "match_tactical_setups"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False, index=True)
    formation_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("formations.id"), nullable=True
    )
    formation_label: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_custom: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    statut: Mapped[LineupStatut] = mapped_column(
        sa_enum(LineupStatut, "lineup_statut"), nullable=False, default=LineupStatut.brouillon
    )
    validated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    validated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)


class LineupPlayer(Base, CreatedAtMixin):
    """
    Joueur d'une composition tactique (voir SCHEMA_SQL.md §7.4).
    SÉCURITÉ : contraintes CHECK sur les coordonnées normalisées 0-100.
    """

    __tablename__ = "lineup_players"
    __table_args__ = (
        CheckConstraint("position_x >= 0 AND position_x <= 100", name="ck_lineup_players_x"),
        CheckConstraint("position_y >= 0 AND position_y <= 100", name="ck_lineup_players_y"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    match_tactical_setup_id: Mapped[int] = mapped_column(
        ForeignKey("match_tactical_setups.id"), nullable=False, index=True
    )
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False, index=True)
    is_starting: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_captain: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_goalkeeper: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tactical_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    position_x: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2), nullable=True, default=Decimal("50")
    )
    position_y: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2), nullable=True, default=Decimal("50")
    )
    substitute_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)


class Substitution(Base, CreatedAtMixin):
    """Remplacement effectué pendant un match (voir SCHEMA_SQL.md §7.5)."""

    __tablename__ = "substitutions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False, index=True)
    player_out_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False, index=True)
    player_in_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False, index=True)
    minute: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    motif: Mapped[SubstitutionMotif] = mapped_column(
        sa_enum(SubstitutionMotif, "substitution_motif"), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)