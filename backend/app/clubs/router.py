"""Endpoints du module clubs.

MVP : les routes SANS {club_id} sont les routes principales (auto-resolues).
Les routes AVEC {club_id} restent pour l'API publique future.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_club, get_current_user, require_club_member, require_permission
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


# ============================================================
# ROUTES EXISTANTES (compatibles MVP)
# ============================================================

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


# ============================================================
# ROUTES MVP (sans club_id — auto-resolues via get_current_club_id)
# ============================================================

@router.get("/me", response_model=ClubResponse)
async def get_my_club(
    club_id: int = Depends(get_current_club),
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    """Récupère le club de l'utilisateur connecté (MVP)."""
    return await club_service.get_club(db, club_id)


@router.patch("/me", response_model=ClubResponse)
async def update_my_club(
    body: ClubUpdate,
    club_id: int = Depends(get_current_club),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_PARAMETRES_CLUB")),
):
    """Met à jour le club de l'utilisateur connecté (MVP)."""
    club = await club_service.get_club(db, club_id)
    return await club_service.update_club(db, club, body)


@router.post("/me/teams", response_model=TeamResponse, status_code=201)
async def create_team_mvp(
    body: TeamCreate,
    club_id: int = Depends(get_current_club),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_PARAMETRES_CLUB")),
):
    """Crée une équipe dans le club de l'utilisateur (MVP)."""
    await club_service.get_club(db, club_id)
    return await club_service.create_team(db, club_id, body)


@router.get("/me/teams", response_model=list[TeamResponse])
async def list_teams_mvp(
    club_id: int = Depends(get_current_club),
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    """Liste les équipes du club de l'utilisateur (MVP)."""
    return await club_service.list_teams(db, club_id)


@router.post("/me/seasons", response_model=SeasonResponse, status_code=201)
async def create_season_mvp(
    body: SeasonCreate,
    club_id: int = Depends(get_current_club),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_PARAMETRES_CLUB")),
):
    """Crée une saison dans le club de l'utilisateur (MVP)."""
    await club_service.get_club(db, club_id)
    return await club_service.create_season(db, club_id, body)


@router.get("/me/seasons", response_model=list[SeasonResponse])
async def list_seasons_mvp(
    club_id: int = Depends(get_current_club),
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    """Liste les saisons du club de l'utilisateur (MVP)."""
    return await club_service.list_seasons(db, club_id)


# ============================================================
# ROUTES API PUBLIQUE (avec club_id — compatibilite future)
# ============================================================

@router.get("/{club_id}", response_model=ClubResponse, include_in_schema=False)
async def get_club_api(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await club_service.get_club(db, club_id)


@router.patch("/{club_id}", response_model=ClubResponse, include_in_schema=False)
async def update_club_api(
    club_id: int,
    body: ClubUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_PARAMETRES_CLUB")),
):
    club = await club_service.get_club(db, club_id)
    return await club_service.update_club(db, club, body)


@router.post("/{club_id}/teams", response_model=TeamResponse, status_code=201, include_in_schema=False)
async def create_team_api(
    club_id: int,
    body: TeamCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_PARAMETRES_CLUB")),
):
    await club_service.get_club(db, club_id)
    return await club_service.create_team(db, club_id, body)


@router.get("/{club_id}/teams", response_model=list[TeamResponse], include_in_schema=False)
async def list_teams_api(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await club_service.list_teams(db, club_id)


@router.post("/{club_id}/seasons", response_model=SeasonResponse, status_code=201, include_in_schema=False)
async def create_season_api(
    club_id: int,
    body: SeasonCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_PARAMETRES_CLUB")),
):
    await club_service.get_club(db, club_id)
    return await club_service.create_season(db, club_id, body)


@router.get("/{club_id}/seasons", response_model=list[SeasonResponse], include_in_schema=False)
async def list_seasons_api(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await club_service.list_seasons(db, club_id)
