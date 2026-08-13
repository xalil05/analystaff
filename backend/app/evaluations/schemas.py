"""Schémas Pydantic du module évaluations."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.enums import ContexteSaisie, Pilier, PosteGroupe


class PillarScoreInput(BaseModel):
    pilier: Pilier
    note: int = Field(ge=0, le=10)


class EvaluationCreate(BaseModel):
    """
    Création d'une évaluation. Le poste_groupe est requis car la table players
    ne le porte pas encore (voir registre des points honnêtes).
    """

    player_id: int
    poste_groupe: PosteGroupe
    pillars: list[PillarScoreInput] = Field(min_length=1)
    contexte_saisie: ContexteSaisie = ContexteSaisie.autre
    saisie_hors_ligne: bool = False
    date_saisie_reelle: Optional[datetime] = None


class EvaluationUpdate(BaseModel):
    pillars: list[PillarScoreInput] = Field(min_length=1)


class PillarScoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    pilier: Pilier
    note: int


class EvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    match_id: int
    player_id: int
    note_globale: Optional[Decimal]
    poids_physique_utilise: Optional[Decimal]
    poids_technique_utilise: Optional[Decimal]
    poids_tactique_utilise: Optional[Decimal]
    poids_mental_utilise: Optional[Decimal]
    statut: str
    contexte_saisie: ContexteSaisie
    date_saisie_reelle: datetime
    date_creation_en_base: datetime
    # Champ joint (rempli depuis le snapshot).
    poste_groupe: Optional[PosteGroupe] = None
    pillars: list[PillarScoreResponse] = []


class WeightingMatrixUpsert(BaseModel):
    """Poids relatifs : la somme doit être > 0 (pas obligatoirement 100)."""

    poids_physique: Decimal = Field(ge=0, le=100)
    poids_technique: Decimal = Field(ge=0, le=100)
    poids_tactique: Decimal = Field(ge=0, le=100)
    poids_mental: Decimal = Field(ge=0, le=100)

    @model_validator(mode="after")
    def check_sum(self):
        total = self.poids_physique + self.poids_technique + self.poids_tactique + self.poids_mental
        if total <= 0:
            raise ValueError("La somme des poids doit être strictement positive.")
        return self


class WeightingMatrixResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    club_id: int
    poste_groupe: PosteGroupe
    poids_physique: Decimal
    poids_technique: Decimal
    poids_tactique: Decimal
    poids_mental: Decimal
    is_active: bool