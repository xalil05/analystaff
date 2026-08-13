"""Endpoints du module entraînement."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_club_member, require_permission
from app.core.database import get_db
from app.core.enums import TrainingStatut
from app.training import service as training_service
from app.training.schemas import (
    TrainingEvaluationCreate,
    TrainingEvaluationResponse,
    TrainingSessionCreate,
    TrainingSessionResponse,
    TrainingSessionUpdate,
)
from app.users.models import User

router = APIRouter(tags=["training"])


def _compose_evaluation_response(evaluation, pillars) -> TrainingEvaluationResponse:
    response = TrainingEvaluationResponse.model_validate(evaluation)
    response.pillars = [
        {"pilier": p.pilier, "note": p.note} for p in pillars
    ]
    return response


@router.post("/{club_id}/training/sessions", response_model=TrainingSessionResponse, status_code=201)
async def create_session(
    club_id: int,
    body: TrainingSessionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("CREER_SEANCE_ENTRAINEMENT")),
):
    return await training_service.create_session(db, club_id, body, user.id)


@router.get("/{club_id}/training/sessions", response_model=list[TrainingSessionResponse])
async def list_sessions(
    club_id: int,
    team_id: int | None = None,
    statut: TrainingStatut | None = None,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await training_service.list_sessions(db, club_id, team_id, statut)


@router.get("/{club_id}/training/sessions/{session_id}", response_model=TrainingSessionResponse)
async def get_session(
    club_id: int,
    session_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await training_service.get_session(db, club_id, session_id)


@router.patch("/{club_id}/training/sessions/{session_id}", response_model=TrainingSessionResponse)
async def update_session(
    club_id: int,
    session_id: int,
    body: TrainingSessionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("MODIFIER_SEANCE_ENTRAINEMENT")),
):
    session = await training_service.get_session(db, club_id, session_id)
    return await training_service.update_session(db, session, body, user.id)


@router.post(
    "/{club_id}/training/sessions/{session_id}/cancel", response_model=TrainingSessionResponse
)
async def cancel_session(
    club_id: int,
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("MODIFIER_SEANCE_ENTRAINEMENT")),
):
    """Annule une séance. RÈGLE : l'annulation laisse une trace (pas de suppression)."""
    session = await training_service.get_session(db, club_id, session_id)
    return await training_service.cancel_session(db, session, user.id)


@router.post(
    "/{club_id}/training/sessions/{session_id}/evaluations",
    response_model=TrainingEvaluationResponse,
    status_code=201,
)
async def create_evaluation(
    club_id: int,
    session_id: int,
    body: TrainingEvaluationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("EVALUER_ENTRAINEMENT")),
):
    session = await training_service.get_session(db, club_id, session_id)
    evaluation = await training_service.create_evaluation(db, club_id, session, body, user.id)
    pillars = await training_service.get_evaluations_with_pillars(db, session.id)
    # Retrouver les piliers de l'évaluation fraîchement créée.
    for ev, ev_pillars in pillars:
        if ev.id == evaluation.id:
            return _compose_evaluation_response(ev, ev_pillars)
    return _compose_evaluation_response(evaluation, [])


@router.get(
    "/{club_id}/training/sessions/{session_id}/evaluations",
    response_model=list[TrainingEvaluationResponse],
)
async def list_evaluations(
    club_id: int,
    session_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    session = await training_service.get_session(db, club_id, session_id)
    results = await training_service.get_evaluations_with_pillars(db, session.id)
    return [_compose_evaluation_response(ev, pillars) for ev, pillars in results]