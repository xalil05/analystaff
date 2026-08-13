"""Endpoints du module évaluations de match et pondération."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_club_member, require_permission
from app.core.database import get_db
from app.core.enums import PosteGroupe
from app.evaluations import service as evaluation_service
from app.evaluations.schemas import (
    EvaluationCreate,
    EvaluationResponse,
    EvaluationUpdate,
    PillarScoreResponse,
    WeightingMatrixResponse,
    WeightingMatrixUpsert,
)
from app.matches import service as match_service
from app.users.models import User

router = APIRouter(tags=["evaluations"])


async def _compose_evaluation_response(db, evaluation) -> EvaluationResponse:
    response = EvaluationResponse.model_validate(evaluation)
    response.pillars = [
        PillarScoreResponse.model_validate(p)
        for p in await evaluation_service.get_evaluation_pillars(db, evaluation.id)
    ]
    snapshot = await evaluation_service.get_evaluation_snapshot(db, evaluation.id)
    if snapshot is not None:
        response.poste_groupe = snapshot.poste_groupe
    return response


# --- Matrices de pondération ---


@router.get(
    "/{club_id}/evaluations/weighting-matrices", response_model=list[WeightingMatrixResponse]
)
async def list_weighting_matrices(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await evaluation_service.list_weighting_matrices(db, club_id)


@router.put(
    "/{club_id}/evaluations/weighting-matrices/{poste_groupe}",
    response_model=WeightingMatrixResponse,
)
async def upsert_weighting_matrix(
    club_id: int,
    poste_groupe: PosteGroupe,
    body: WeightingMatrixUpsert,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("GERER_PARAMETRES_CLUB")),
):
    return await evaluation_service.upsert_weighting_matrix(db, club_id, poste_groupe, body, user.id)


# --- Évaluations de match ---


@router.post(
    "/{club_id}/matches/{match_id}/evaluations", response_model=EvaluationResponse, status_code=201
)
async def create_evaluation(
    club_id: int,
    match_id: int,
    body: EvaluationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("MODIFIER_MATCH")),
):
    match = await match_service.get_match(db, club_id, match_id)
    evaluation = await evaluation_service.create_evaluation(db, club_id, match, body, user.id)
    return await _compose_evaluation_response(db, evaluation)


@router.get("/{club_id}/matches/{match_id}/evaluations", response_model=list[EvaluationResponse])
async def list_match_evaluations(
    club_id: int,
    match_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    match = await match_service.get_match(db, club_id, match_id)
    evaluations = await evaluation_service.list_match_evaluations(db, match.id)
    return [await _compose_evaluation_response(db, e) for e in evaluations]


@router.get(
    "/{club_id}/matches/{match_id}/evaluations/{evaluation_id}", response_model=EvaluationResponse
)
async def get_evaluation(
    club_id: int,
    match_id: int,
    evaluation_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    evaluation = await evaluation_service.get_evaluation(db, club_id, match_id, evaluation_id)
    return await _compose_evaluation_response(db, evaluation)


@router.patch(
    "/{club_id}/matches/{match_id}/evaluations/{evaluation_id}", response_model=EvaluationResponse
)
async def update_evaluation(
    club_id: int,
    match_id: int,
    evaluation_id: int,
    body: EvaluationUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("MODIFIER_MATCH")),
):
    evaluation = await evaluation_service.get_evaluation(db, club_id, match_id, evaluation_id)
    updated = await evaluation_service.update_evaluation(db, evaluation, body, user.id)
    return await _compose_evaluation_response(db, updated)


@router.post(
    "/{club_id}/matches/{match_id}/evaluations/{evaluation_id}/validate",
    response_model=EvaluationResponse,
)
async def validate_evaluation(
    club_id: int,
    match_id: int,
    evaluation_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("VALIDER_EVALUATION_MATCH")),
):
    """Validation explicite par le coach. RÈGLE : le coach reste le décideur final."""
    evaluation = await evaluation_service.get_evaluation(db, club_id, match_id, evaluation_id)
    validated = await evaluation_service.validate_evaluation(db, evaluation, user.id)
    return await _compose_evaluation_response(db, validated)