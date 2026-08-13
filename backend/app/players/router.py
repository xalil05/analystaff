"""Endpoints du module joueurs."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_club_member, require_permission
from app.core.database import get_db
from app.core.enums import PlayerStatut
from app.players import service as player_service
from app.players.schemas import (
    MedicalRecordCreate,
    MedicalRecordResponse,
    PhysicalProfileResponse,
    PhysicalProfileUpdate,
    PlayerCreate,
    PlayerResponse,
    PlayerUpdate,
)
from app.users.models import User

router = APIRouter(tags=["players"])


@router.post("/{club_id}/players", response_model=PlayerResponse, status_code=201)
async def create_player(
    club_id: int,
    body: PlayerCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("GERER_JOUEURS")),
):
    return await player_service.create_player(db, club_id, body, user.id)


@router.get("/{club_id}/players", response_model=list[PlayerResponse])
async def list_players(
    club_id: int,
    statut: PlayerStatut | None = None,
    team_id: int | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await player_service.list_players(db, club_id, statut, team_id, page, limit)


@router.get("/{club_id}/players/{player_id}", response_model=PlayerResponse)
async def get_player(
    club_id: int,
    player_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await player_service.get_player(db, club_id, player_id)


@router.patch("/{club_id}/players/{player_id}", response_model=PlayerResponse)
async def update_player(
    club_id: int,
    player_id: int,
    body: PlayerUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("GERER_JOUEURS")),
):
    player = await player_service.get_player(db, club_id, player_id)
    return await player_service.update_player(db, player, body, user.id)


@router.delete("/{club_id}/players/{player_id}", status_code=204)
async def archive_player(
    club_id: int,
    player_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("GERER_JOUEURS")),
):
    player = await player_service.get_player(db, club_id, player_id)
    await player_service.archive_player(db, player, user.id)


@router.get("/{club_id}/players/{player_id}/physical", response_model=PhysicalProfileResponse)
async def get_physical(
    club_id: int,
    player_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("VOIR_DONNEES_PHYSIQUES")),
):
    await player_service.get_player(db, club_id, player_id)
    profile = await player_service.get_physical_profile(db, player_id)
    if profile is None:
        return PhysicalProfileResponse(
            player_id=player_id, taille_cm=None, poids_kg=None, imc=None, charge_travail=None
        )
    return profile


@router.put("/{club_id}/players/{player_id}/physical", response_model=PhysicalProfileResponse)
async def update_physical(
    club_id: int,
    player_id: int,
    body: PhysicalProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("ECRIRE_DONNEES_PHYSIQUES")),
):
    await player_service.get_player(db, club_id, player_id)
    return await player_service.upsert_physical_profile(db, player_id, body, user.id)


@router.get("/{club_id}/players/{player_id}/medical", response_model=list[MedicalRecordResponse])
async def list_medical(
    club_id: int,
    player_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("VOIR_DONNEES_MEDICALES")),
):
    await player_service.get_player(db, club_id, player_id)
    return await player_service.list_medical_records(db, player_id)


@router.post(
    "/{club_id}/players/{player_id}/medical", response_model=MedicalRecordResponse, status_code=201
)
async def add_medical(
    club_id: int,
    player_id: int,
    body: MedicalRecordCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("ECRIRE_DONNEES_MEDICALES")),
):
    await player_service.get_player(db, club_id, player_id)
    return await player_service.add_medical_record(db, player_id, body, user.id)