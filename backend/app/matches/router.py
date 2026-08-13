"""Endpoints du module matchs et plateau tactique."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_club_member, require_permission
from app.core.database import get_db
from app.core.enums import MatchStatut
from app.core.errors import NotFoundError
from app.matches import service as match_service
from app.matches.schemas import (
    LineupPlayerResponse,
    MatchCreate,
    MatchResponse,
    MatchUpdate,
    SubstitutionCreate,
    SubstitutionResponse,
    TacticalSetupResponse,
    TacticalSetupSave,
)
from app.users.models import User

router = APIRouter(tags=["matches"])


def _compose_setup_response(setup, players) -> TacticalSetupResponse:
    return TacticalSetupResponse(
        id=setup.id,
        match_id=setup.match_id,
        formation_id=setup.formation_id,
        formation_label=setup.formation_label,
        is_custom=setup.is_custom,
        statut=setup.statut,
        validated_by=setup.validated_by,
        validated_at=setup.validated_at,
        notes=setup.notes,
        players=[LineupPlayerResponse.model_validate(p) for p in players],
    )


@router.post("/{club_id}/matches", response_model=MatchResponse, status_code=201)
async def create_match(
    club_id: int,
    body: MatchCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("CREER_MATCH")),
):
    return await match_service.create_match(db, club_id, body, user.id)


@router.get("/{club_id}/matches", response_model=list[MatchResponse])
async def list_matches(
    club_id: int,
    team_id: int | None = None,
    season_id: int | None = None,
    statut: MatchStatut | None = None,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await match_service.list_matches(db, club_id, team_id, season_id, statut)


@router.get("/{club_id}/matches/{match_id}", response_model=MatchResponse)
async def get_match(
    club_id: int,
    match_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await match_service.get_match(db, club_id, match_id)


@router.patch("/{club_id}/matches/{match_id}", response_model=MatchResponse)
async def update_match(
    club_id: int,
    match_id: int,
    body: MatchUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("MODIFIER_MATCH")),
):
    match = await match_service.get_match(db, club_id, match_id)
    return await match_service.update_match(db, match, body, user.id)


@router.get("/{club_id}/matches/{match_id}/tactical-setup", response_model=TacticalSetupResponse)
async def get_tactical_setup(
    club_id: int,
    match_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    match = await match_service.get_match(db, club_id, match_id)
    setup = await match_service.get_tactical_setup(db, match.id)
    if setup is None:
        return TacticalSetupResponse(match_id=match.id)
    players = await match_service.get_setup_players(db, setup.id)
    return _compose_setup_response(setup, players)


@router.put("/{club_id}/matches/{match_id}/tactical-setup", response_model=TacticalSetupResponse)
async def save_tactical_setup(
    club_id: int,
    match_id: int,
    body: TacticalSetupSave,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("PREPARER_COMPOSITION")),
):
    """Sauvegarde le plateau tactique complet (drag & drop) en brouillon."""
    match = await match_service.get_match(db, club_id, match_id)
    setup = await match_service.save_tactical_setup(db, club_id, match, body, user.id)
    players = await match_service.get_setup_players(db, setup.id)
    return _compose_setup_response(setup, players)


@router.post(
    "/{club_id}/matches/{match_id}/tactical-setup/validate", response_model=TacticalSetupResponse
)
async def validate_tactical_setup(
    club_id: int,
    match_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("VALIDER_COMPOSITION")),
):
    """Validation explicite de la composition par le coach."""
    match = await match_service.get_match(db, club_id, match_id)
    setup = await match_service.get_tactical_setup(db, match.id)
    if setup is None:
        raise NotFoundError("Aucune composition à valider.")
    setup = await match_service.validate_tactical_setup(db, setup, user.id)
    players = await match_service.get_setup_players(db, setup.id)
    return _compose_setup_response(setup, players)


@router.post(
    "/{club_id}/matches/{match_id}/substitutions", response_model=SubstitutionResponse, status_code=201
)
async def add_substitution(
    club_id: int,
    match_id: int,
    body: SubstitutionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("MODIFIER_MATCH")),
):
    match = await match_service.get_match(db, club_id, match_id)
    return await match_service.add_substitution(db, club_id, match, body, user.id)


@router.get(
    "/{club_id}/matches/{match_id}/substitutions", response_model=list[SubstitutionResponse]
)
async def list_substitutions(
    club_id: int,
    match_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    match = await match_service.get_match(db, club_id, match_id)
    return await match_service.list_substitutions(db, match.id)