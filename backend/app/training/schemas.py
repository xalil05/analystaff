"""Schémas Pydantic du module entraînement."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import Assiduite, ContexteSaisie, Pilier, TrainingStatut


class TrainingSessionCreate(BaseModel):
    team_id: int
    season_id: int
    date_seance: datetime
    lieu: Optional[str] = Field(default=None, max_length=200)
    objectifs: Optional[str] = None
    exercices: Optional[str] = None
    charge_prevue: Optional[Decimal] = Field(default=None, ge=0)


class TrainingSessionUpdate(BaseModel):
    date_seance: Optional[datetime] = None
    lieu: Optional[str] = Field(default=None, max_length=200)
    objectifs: Optional[str] = None
    exercices: Optional[str] = None
    charge_prevue: Optional[Decimal] = Field(default=None, ge=0)
    statut: Optional[TrainingStatut] = None


class TrainingSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    club_id: int
    team_id: int
    season_id: int
    date_seance: datetime
    lieu: Optional[str]
    objectifs: Optional[str]
    exercices: Optional[str]
    charge_prevue: Optional[Decimal]
    statut: TrainingStatut


class PillarNoteInput(BaseModel):
    pilier: Pilier
    note: int = Field(ge=0, le=10)


class TrainingEvaluationCreate(BaseModel):
    """Évaluation post-séance. Le contexte de saisie hors ligne est tracé."""

    player_id: int
    assiduite: Assiduite
    charge_percue_rpe: Optional[int] = Field(default=None, ge=1, le=10)
    pillars: list[PillarNoteInput] = []
    contexte_saisie: ContexteSaisie = ContexteSaisie.autre
    saisie_hors_ligne: bool = False
    date_saisie_reelle: Optional[datetime] = None


class PillarNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    pilier: Pilier
    note: int


class TrainingEvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    training_session_id: int
    player_id: int
    assiduite: Assiduite
    charge_percue_rpe: Optional[int]
    saisie_hors_ligne: bool
    synchronisee: bool
    contexte_saisie: ContexteSaisie
    date_saisie_reelle: datetime
    date_creation_en_base: datetime
    pillars: list[PillarNoteResponse] = []