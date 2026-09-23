"""Schémas Pydantic du module teams."""
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


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