"""Modèles du domaine joueurs et profils."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import PlayerStatut, sa_enum
from app.core.mixins import TimestampMixin


class Player(Base, TimestampMixin):
    """Identité de base d'un joueur (voir SCHEMA_SQL.md §6.1)."""

    __tablename__ = "players"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    team_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("teams.id"), nullable=True, index=True
    )
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    prenom: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    poste: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    numero: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    date_naissance: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    statut: Mapped[PlayerStatut] = mapped_column(
        sa_enum(PlayerStatut, "player_statut"),
        nullable=False,
        default=PlayerStatut.actif,
        index=True,
    )
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)


class PhysicalProfile(Base, TimestampMixin):
    """
    Données physiques et morphologiques (voir SCHEMA_SQL.md §6.2).

    SÉCURITÉ : table dédiée, séparée de players. L'accès est restreint aux
    permissions VOIR_DONNEES_PHYSIQUES / ECRIRE_DONNEES_PHYSIQUES.
    """

    __tablename__ = "physical_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), unique=True, nullable=False)
    taille_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 1), nullable=True)
    poids_kg: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 1), nullable=True)
    imc: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1), nullable=True)
    charge_travail: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True, default=Decimal("0")
    )
    updated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)


class MedicalRecord(Base, TimestampMixin):
    """
    Dossier médical d'un joueur (voir SCHEMA_SQL.md §6.3).

    SÉCURITÉ / CDP : données sensibles. Table dédiée, accès restreint aux
    permissions VOIR_DONNEES_MEDICALES / ECRIRE_DONNEES_MEDICALES.
    """

    __tablename__ = "medical_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date_debut: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    date_fin: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    statut: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="en_cours")
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)