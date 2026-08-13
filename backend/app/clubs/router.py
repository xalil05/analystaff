"""Endpoints du module clubs."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependencies import get_current_user, require_club_member, require_permission
from app.clubs import service as club_service
from app.clubs.schemas import (
    ClubCreate,
    ClubResponse,
    ClubUpdate,
    SeasonCreate,
    SeasonResponse,
    TeamCreate,
    TeamResponse,
)
from app.core.database import get_db
from app.users.models import User

router = APIRouter(tags=["clubs"])


@router.post("", response_model=ClubResponse, status_code=201)
async def create_club(
    body: ClubCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crée un club. Le créateur devient automatiquement coach principal."""
    return await club_service.create_club(db, current_user, body)


@router.get("", response_model=list[ClubResponse])
async def list_my_clubs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Liste les clubs auxquels l'utilisateur appartient."""
    return await club_service.list_user_clubs(db, current_user.id)


@router.get("/{club_id}", response_model=ClubResponse)
async def get_club(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await club_service.get_club(db, club_id)


@router.patch("/{club_id}", response_model=ClubResponse)
async def update_club(
    club_id: int,
    body: ClubUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_PARAMETRES_CLUB")),
):
    club = await club_service.get_club(db, club_id)
    return await club_service.update_club(db, club, body)


@router.post("/{club_id}/teams", response_model=TeamResponse, status_code=201)
async def create_team(
    club_id: int,
    body: TeamCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_PARAMETRES_CLUB")),
):
    await club_service.get_club(db, club_id)
    return await club_service.create_team(db, club_id, body)


@router.get("/{club_id}/teams", response_model=list[TeamResponse])
async def list_teams(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await club_service.list_teams(db, club_id)


@router.post("/{club_id}/seasons", response_model=SeasonResponse, status_code=201)
async def create_season(
    club_id: int,
    body: SeasonCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_PARAMETRES_CLUB")),
):
    await club_service.get_club(db, club_id)
    return await club_service.create_season(db, club_id, body)


@router.get("/{club_id}/seasons", response_model=list[SeasonResponse])
async def list_seasons(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await club_service.list_seasons(db, club_id)