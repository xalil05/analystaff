"""Schémas Pydantic du module clubs."""
from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.core.enums import ClubLevel


class ClubCreate(BaseModel):
    nom: str = Field(min_length=1, max_length=150)
    niveau: ClubLevel
    timezone: str = Field(default="Africa/Dakar", max_length=50)


class ClubUpdate(BaseModel):
    nom: Optional[str] = Field(default=None, min_length=1, max_length=150)
    niveau: Optional[ClubLevel] = None
    timezone: Optional[str] = Field(default=None, max_length=50)


class ClubResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nom: str
    niveau: ClubLevel
    timezone: str
    is_archived: bool


class TeamCreate(BaseModel):
    nom: str = Field(min_length=1, max_length=100)
    categorie: Optional[str] = Field(default=None, max_length=50)


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    club_id: int
    nom: str
    categorie: Optional[str]
    is_archived: bool


class SeasonCreate(BaseModel):
    label: str = Field(min_length=1, max_length=50)
    date_debut: date
    date_fin: Optional[date] = None
    is_active: bool = False


class SeasonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    club_id: int
    label: str
    date_debut: date
    date_fin: Optional[date]
    is_active: bool