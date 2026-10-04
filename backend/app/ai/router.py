"""Endpoints du module IA.

MVP : routes à /api/v1/ai/... (sans club_id, auto-resolu)
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai import service as ai_service
from app.ai.actions import ACTIONS
from app.ai.schemas import AiFeedbackCreate, AiSuggestionResponse
from app.auth.dependencies import get_current_club, require_club_member_mvp, require_permission_mvp
from app.core.database import get_db
from app.core.limiter import (
    IA_DAILY_QUOTA,
    IA_DAILY_SCOPE,
    ai_daily_quota_key,
    limiter,
)

router = APIRouter(tags=["IA"])


@router.get("/ai/actions", response_model=list[str])
async def list_available_actions(
    club_id: int = Depends(get_current_club),
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member_mvp),
):
    """Liste les boutons métier disponibles (MVP)."""
    return list(ACTIONS.keys())


@router.post("/ai/actions/{action_key}", response_model=AiSuggestionResponse, status_code=201)
# Quota quotidien PAR CLUB, commun à toutes les actions (SPECIFICATIONS_IA §11.2).
# `shared_limit` fige le compteur sur la portée IA : sans scope, slowapi
# l'indexe par URL et le club obtient 100 appels PAR ACTION et par jour.
@limiter.shared_limit(
    f"{IA_DAILY_QUOTA}/day",
    scope=IA_DAILY_SCOPE,
    key_func=ai_daily_quota_key,
)
async def trigger_ai_action(
    request: Request,
    action_key: str,
    club_id: int = Depends(get_current_club),
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permission_mvp("UTILISER_ASSISTANT_IA")),
):
    """Déclenche une action IA (MVP)."""
    suggestion = await ai_service.trigger_action(db, club_id, user, action_key)
    return suggestion


@router.get("/ai/suggestions", response_model=list[AiSuggestionResponse])
async def list_my_suggestions(
    ready_only: bool = False,
    club_id: int = Depends(get_current_club),
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permission_mvp("UTILISER_ASSISTANT_IA")),
):
    """Liste les suggestions de l'utilisateur (MVP)."""
    return await ai_service.list_user_suggestions(db, club_id, user.id, ready_only)


@router.post("/ai/suggestions/{suggestion_id}/viewed", response_model=AiSuggestionResponse)
async def mark_suggestion_viewed(
    suggestion_id: int,
    club_id: int = Depends(get_current_club),
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member_mvp),
):
    return await ai_service.mark_viewed(db, club_id, suggestion_id)


@router.post("/ai/suggestions/{suggestion_id}/feedback", response_model=AiSuggestionResponse)
async def give_feedback(
    suggestion_id: int,
    body: AiFeedbackCreate,
    club_id: int = Depends(get_current_club),
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permission_mvp("UTILISER_ASSISTANT_IA")),
):
    """Feedback coach : accepter / modifier / rejeter (MVP)."""
    return await ai_service.record_feedback(
        db, club_id, suggestion_id, user, body.action, body.modification_details
    )
