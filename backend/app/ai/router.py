"""Endpoints du module IA."""
from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependencies import get_current_user, require_club_member, require_permission
from app.ai import service as ai_service
from app.ai.actions import ACTIONS
from app.ai.schemas import AiFeedbackCreate, AiSuggestionResponse
from app.core.database import get_db
from app.users.models import User
# ... tes autres imports (db, services, etc.)
from app.core.limiter import limiter, get_club_id_key  # <-- AJOUT

router = APIRouter(tags=["ai"])

router = APIRouter(tags=["IA"])


@router.get("/{club_id}/ai/actions", response_model=list[str])
async def list_available_actions(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    """Liste les boutons métier disponibles (le frontend filtre par permission)."""
    return list(ACTIONS.keys())


@router.post(
    "/{club_id}/ai/actions/{action_key}", response_model=AiSuggestionResponse, status_code=201
)
@limiter.limit("100/day", key_func=get_club_id_key)
async def trigger_ai_action(
    request: Request,
    club_id: int,
    action_key: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("UTILISER_ASSISTANT_IA")),
):
    """
    Déclenche un bouton métier IA.
    RÈGLE : l'IA suggère, le coach décide. Rien n'est appliqué automatiquement.
    """
    suggestion = await ai_service.trigger_action(db, club_id, user, action_key)
    return suggestion


@router.get("/{club_id}/ai/suggestions", response_model=list[AiSuggestionResponse])
async def list_my_suggestions(
    club_id: int,
    ready_only: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("UTILISER_ASSISTANT_IA")),
):
    """Liste les suggestions de l'utilisateur. ready_only=true pour l'écran d'accueil."""
    return await ai_service.list_user_suggestions(db, club_id, user.id, ready_only)


@router.post("/{club_id}/ai/suggestions/{suggestion_id}/viewed", response_model=AiSuggestionResponse)
async def mark_suggestion_viewed(
    club_id: int,
    suggestion_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await ai_service.mark_viewed(db, club_id, suggestion_id)


@router.post("/{club_id}/ai/suggestions/{suggestion_id}/feedback", response_model=AiSuggestionResponse)
async def give_feedback(
    club_id: int,
    suggestion_id: int,
    body: AiFeedbackCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("UTILISER_ASSISTANT_IA")),
):
    """Feedback coach : accepter / modifier / rejeter. Systématiquement stocké."""
    return await ai_service.record_feedback(
        db, club_id, suggestion_id, user, body.action, body.modification_details
    )