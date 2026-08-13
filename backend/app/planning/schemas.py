"""Schémas Pydantic du module planification."""
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.enums import WorkPlanType


class WorkPlanCreate(BaseModel):
    team_id: int
    season_id: int
    nom: str = Field(min_length=1, max_length=150)
    type: WorkPlanType
    date_debut: date
    date_fin: date

    @model_validator(mode="after")
    def check_dates(self):
        if self.date_fin < self.date_debut:
            raise ValueError("date_fin doit être postérieure ou égale à date_debut.")
        return self


class WorkPlanUpdate(BaseModel):
    nom: Optional[str] = Field(default=None, min_length=1, max_length=150)
    date_debut: Optional[date] = None
    date_fin: Optional[date] = None
    statut: Optional[str] = Field(default=None, max_length=30)


class WorkPlanItemCreate(BaseModel):
    training_session_id: Optional[int] = None
    ordre: int = Field(default=0, ge=0)
    objectifs: Optional[str] = None
    statut_prevu: Optional[str] = Field(default="planifie", max_length=30)


class WorkPlanItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    work_plan_id: int
    training_session_id: Optional[int]
    ordre: int
    objectifs: Optional[str]
    statut_prevu: Optional[str]
    statut_reel: Optional[str]


class WorkPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    club_id: int
    team_id: int
    season_id: int
    nom: str
    type: WorkPlanType
    date_debut: date
    date_fin: date
    statut: str


class WorkPlanDetailResponse(WorkPlanResponse):
    items: list[WorkPlanItemResponse] = []