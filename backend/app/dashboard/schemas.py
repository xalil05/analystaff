"""Schémas Pydantic du tableau de bord et de la synthèse."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.core.enums import Pilier


class DashboardOverview(BaseModel):
    """Vue d'ensemble du club (écran d'accueil du tableau de bord)."""

    player_count: int
    match_count: int
    training_session_count: int
    last_match_adversaire: Optional[str] = None
    last_match_date: Optional[datetime] = None
    last_match_score: Optional[str] = None


class RadarResponse(BaseModel):
    """Radar des 4 piliers d'un joueur sur les N derniers matchs évalués."""

    player_id: int
    matches_analyzed: int
    # Moyennes par pilier (None si aucune donnée).
    physique: Optional[Decimal] = None
    technique: Optional[Decimal] = None
    tactique: Optional[Decimal] = None
    mental: Optional[Decimal] = None
    note_globale_moyenne: Optional[Decimal] = None


class HistoryEntry(BaseModel):
    """Entrée de l'historique des notes d'un joueur."""

    evaluation_id: int
    match_id: int
    date_match: datetime
    adversaire: str
    note_globale: Optional[Decimal] = None


class PlayerHistoryResponse(BaseModel):
    player_id: int
    entries: list[HistoryEntry]


class PreMatchSummary(BaseModel):
    """Synthèse avant-match construite à partir des données de la semaine."""

    match_id: int
    adversaire: str
    date_match: datetime
    # Disponibilité.
    available_player_count: int
    injured_player_count: int
    suspended_player_count: int
    # Charge de travail (top joueurs chargés).
    top_workload: list[dict]
    # Signaux de fatigue (remplacements pour fatigue récents).
    fatigue_signals: list[str]
    # Moyenne des notes récentes de l'équipe.
    recent_avg_note: Optional[Decimal] = None


class PlayerPdfSection(BaseModel):
    """Section du profil joueur, contrôlée par permissions."""

    identite: dict
    sportif: dict
    # Inclus uniquement si l'utilisateur a la permission.
    physique: Optional[dict] = None
    medical: Optional[dict] = None