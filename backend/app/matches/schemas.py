"""Schémas Pydantic du module matchs et tactique."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import LineupStatut, MatchStatut, SubstitutionMotif


class MatchCreate(BaseModel):
    team_id: int
    season_id: int
    adversaire: str = Field(min_length=1, max_length=150)
    competition: Optional[str] = Field(default=None, max_length=100)
    is_domicile: bool = True
    date_match: datetime
    lieu: Optional[str] = Field(default=None, max_length=200)
    score_equipe: Optional[int] = Field(default=None, ge=0)
    score_adversaire: Optional[int] = Field(default=None, ge=0)


class MatchUpdate(BaseModel):
    adversaire: Optional[str] = Field(default=None, min_length=1, max_length=150)
    competition: Optional[str] = None
    is_domicile: Optional[bool] = None
    date_match: Optional[datetime] = None
    lieu: Optional[str] = None
    score_equipe: Optional[int] = Field(default=None, ge=0)
    score_adversaire: Optional[int] = Field(default=None, ge=0)
    statut: Optional[MatchStatut] = None


class MatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    club_id: int
    team_id: int
    season_id: int
    adversaire: str
    competition: Optional[str]
    is_domicile: bool
    date_match: datetime
    lieu: Optional[str]
    score_equipe: Optional[int]
    score_adversaire: Optional[int]
    statut: MatchStatut


class LineupPlayerInput(BaseModel):
    """Position d'un joueur sur le plateau tactique (coordonnées 0-100)."""

    player_id: int
    is_starting: bool = False
    is_captain: bool = False
    is_goalkeeper: bool = False
    tactical_role: Optional[str] = Field(default=None, max_length=50)
    position_x: Decimal = Field(default=Decimal("50"), ge=0, le=100)
    position_y: Decimal = Field(default=Decimal("50"), ge=0, le=100)
    substitute_order: Optional[int] = Field(default=None, ge=0)


class TacticalSetupSave(BaseModel):
    """Payload complet de sauvegarde du plateau tactique (drag & drop)."""

    formation_id: Optional[int] = None
    formation_label: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None
    players: list[LineupPlayerInput] = []


class LineupPlayerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    player_id: int
    is_starting: bool
    is_captain: bool
    is_goalkeeper: bool
    tactical_role: Optional[str]
    position_x: Optional[Decimal]
    position_y: Optional[Decimal]
    substitute_order: Optional[int]


class TacticalSetupResponse(BaseModel):
    id: Optional[int] = None
    match_id: int
    formation_id: Optional[int] = None
    formation_label: Optional[str] = None
    is_custom: bool = False
    statut: Optional[LineupStatut] = None
    validated_by: Optional[int] = None
    validated_at: Optional[datetime] = None
    notes: Optional[str] = None
    players: list[LineupPlayerResponse] = []


class SubstitutionCreate(BaseModel):
    player_out_id: int
    player_in_id: int
    minute: Optional[int] = Field(default=None, ge=0, le=150)
    motif: SubstitutionMotif
    notes: Optional[str] = None


class SubstitutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    match_id: int
    player_out_id: int
    player_in_id: int
    minute: Optional[int]
    motif: SubstitutionMotif
    notes: Optional[str]