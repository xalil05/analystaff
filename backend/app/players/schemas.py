"""Schémas Pydantic du module joueurs."""
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import PlayerStatut


class PlayerCreate(BaseModel):
    nom: str = Field(min_length=1, max_length=100)
    prenom: Optional[str] = Field(default=None, max_length=100)
    poste: Optional[str] = Field(default=None, max_length=50)
    numero: Optional[int] = Field(default=None, ge=1, le=99)
    date_naissance: Optional[date] = None
    team_id: Optional[int] = None
    statut: PlayerStatut = PlayerStatut.actif


class PlayerUpdate(BaseModel):
    nom: Optional[str] = Field(default=None, min_length=1, max_length=100)
    prenom: Optional[str] = Field(default=None, max_length=100)
    poste: Optional[str] = Field(default=None, max_length=50)
    numero: Optional[int] = Field(default=None, ge=1, le=99)
    date_naissance: Optional[date] = None
    team_id: Optional[int] = None
    statut: Optional[PlayerStatut] = None


class PlayerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    club_id: int
    team_id: Optional[int]
    nom: str
    prenom: Optional[str]
    poste: Optional[str]
    numero: Optional[int]
    date_naissance: Optional[date]
    statut: PlayerStatut
    is_archived: bool


class PhysicalProfileUpdate(BaseModel):
    taille_cm: Optional[Decimal] = Field(default=None, ge=100, le=250)
    poids_kg: Optional[Decimal] = Field(default=None, ge=30, le=200)


class PhysicalProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    player_id: int
    taille_cm: Optional[Decimal]
    poids_kg: Optional[Decimal]
    imc: Optional[Decimal]
    charge_travail: Optional[Decimal]


class MedicalRecordCreate(BaseModel):
    type: str = Field(min_length=1, max_length=50)
    description: Optional[str] = None
    date_debut: Optional[date] = None
    date_fin: Optional[date] = None
    statut: str = Field(default="en_cours", max_length=30)


class MedicalRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    player_id: int
    type: str
    description: Optional[str]
    date_debut: Optional[date]
    date_fin: Optional[date]
    statut: Optional[str]