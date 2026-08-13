"""Registre des actions IA (boutons métier). Voir SPECIFICATIONS_IA_ET_PROMPTS.md §2."""
from dataclasses import dataclass, field
from typing import Callable, Optional

from pydantic import BaseModel

from app.ai import fallback
from app.ai.schemas import (
    FatigueAnalysis,
    LineupSuggestion,
    PreMatchPreparation,
    TrainingSessionSuggestion,
    WeekOrganization,
    WeekSummary,
    WorkloadAdjustment,
    WorkloadBalance,
)


@dataclass
class AiAction:
    key: str
    additional_permissions: list[str] = field(default_factory=list)
    timeout_seconds: int = 30
    response_model: Optional[type[BaseModel]] = None
    fallback: Optional[Callable] = None


# RÈGLE : toutes les actions requièrent UTILISER_ASSISTANT_IA (vérifié dans le router).
# Les permissions listées ici sont des permissions SUPPLÉMENTAIRES.
ACTIONS: dict[str, AiAction] = {
    "SUGGEST_TRAINING_SESSION": AiAction(
        key="SUGGEST_TRAINING_SESSION",
        additional_permissions=["CREER_SEANCE_ENTRAINEMENT"],
        timeout_seconds=30,
        response_model=TrainingSessionSuggestion,
    ),
    "SUGGEST_LINEUP": AiAction(
        key="SUGGEST_LINEUP",
        timeout_seconds=30,
        response_model=LineupSuggestion,
        fallback=fallback.fallback_suggest_lineup,
    ),
    "ANALYZE_FATIGUE": AiAction(
        key="ANALYZE_FATIGUE",
        timeout_seconds=20,
        response_model=FatigueAnalysis,
        fallback=fallback.fallback_analyze_fatigue,
    ),
    "SUMMARIZE_WEEK": AiAction(
        key="SUMMARIZE_WEEK",
        timeout_seconds=30,
        response_model=WeekSummary,
        fallback=fallback.fallback_summarize_week,
    ),
    "ADAPT_WORKLOAD": AiAction(
        key="ADAPT_WORKLOAD",
        additional_permissions=["VOIR_DONNEES_PHYSIQUES"],
        timeout_seconds=20,
        response_model=WorkloadAdjustment,
    ),
    "PREPARE_PRE_MATCH": AiAction(
        key="PREPARE_PRE_MATCH",
        timeout_seconds=30,
        response_model=PreMatchPreparation,
    ),
    "ORGANIZE_WEEK": AiAction(
        key="ORGANIZE_WEEK",
        additional_permissions=["CREER_PLAN_TRAVAIL"],
        timeout_seconds=30,
        response_model=WeekOrganization,
    ),
    "BALANCE_WORKLOAD": AiAction(
        key="BALANCE_WORKLOAD",
        additional_permissions=["VOIR_DONNEES_PHYSIQUES"],
        timeout_seconds=20,
        response_model=WorkloadBalance,
        fallback=fallback.fallback_balance_workload,
    ),
    # Nécessite le module fichiers (upload) — livré séparément.
    "PARSE_UPLOADED_SESSION": AiAction(
    key="PARSE_UPLOADED_SESSION",
    additional_permissions=["IMPORTER_SEANCE_DU_JOUR"],
    timeout_seconds=60,
    fallback=fallback.fallback_parse_uploaded,
    ),
}