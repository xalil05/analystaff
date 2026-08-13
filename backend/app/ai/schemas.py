"""Schémas Pydantic du module IA (validation des réponses et feedback)."""
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# --- Réponses des actions IA (permissives : valident DeepSeek et fallback) ---


class Exercise(BaseModel):
    name: str = ""
    description: str = ""


class TrainingSessionSuggestion(BaseModel):
    objective: str = ""
    intensity: str = ""
    duration_minutes: int = 60
    exercises: list[Exercise] = []
    target_players: list[str] = []
    reasoning: str = ""


class LineupPlayerPosition(BaseModel):
    player_id: str = ""
    position: str = ""
    position_x: float = 50
    position_y: float = 50


class LineupSuggestion(BaseModel):
    formation: str = ""
    starting_players: list[LineupPlayerPosition] = []
    substitutes: list[dict] = []
    players_to_watch: list[dict] = []
    reasoning: str = ""


class PlayerRisk(BaseModel):
    player_id: str = ""
    risk_level: str = ""
    reason: str = ""
    recommendation: str = ""


class FatigueAnalysis(BaseModel):
    players_at_risk: list[PlayerRisk] = []
    recommendations: list[str] = []
    summary: str = ""


class WeekSummary(BaseModel):
    highlights: list[str] = []
    concerns: list[str] = []
    player_performances: list[dict] = []
    recommendations: list[str] = []
    summary: str = ""


class WorkloadAdjustment(BaseModel):
    adjustments: list[dict] = []
    global_recommendation: str = ""
    reasoning: str = ""


class PreMatchPreparation(BaseModel):
    match_context: str = ""
    team_readiness: str = ""
    key_players: list[dict] = []
    tactical_considerations: list[str] = []
    recommendations: list[str] = []
    summary: str = ""


class WeekOrganization(BaseModel):
    weekly_structure: list[dict] = []
    focus_areas: list[str] = []
    rest_recommendations: list[str] = []
    reasoning: str = ""


class WorkloadBalance(BaseModel):
    overloaded_players: list[dict] = []
    underloaded_players: list[dict] = []
    balance_suggestions: list[str] = []
    reasoning: str = ""


# --- API ---


class AiSuggestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    club_id: int
    user_id: int
    action_key: str
    template_version: int
    suggestion_content: dict
    statut: str
    pre_generated: bool


class AiFeedbackCreate(BaseModel):
    action: str = Field(pattern="^(accepted|modified|rejected)$")
    modification_details: Optional[dict] = None