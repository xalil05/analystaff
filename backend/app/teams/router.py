"""Endpoints du module teams."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_club_member, require_permission
from app.core.database import get_db
from app.teams import service as team_service
from app.teams.schemas import TeamCreate, TeamResponse

router = APIRouter(tags=["teams"])


@router.post("/{club_id}/teams", response_model=TeamResponse, status_code=201)
async def create_team(
    club_id: int,
    body: TeamCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_PARAMETRES_CLUB")),
):
    return await team_service.create_team(db, club_id, body)


@router.get("/{club_id}/teams", response_model=list[TeamResponse])
async def list_teams(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await team_service.list_teams(db, club_id)