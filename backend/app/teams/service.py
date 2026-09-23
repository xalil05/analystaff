"""Service du module teams."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.teams.models import Team
from app.teams.schemas import TeamCreate


async def create_team(db: AsyncSession, club_id: int, team_in: TeamCreate) -> Team:
    """Crée une équipe pour un club."""
    team = Team(club_id=club_id, nom=team_in.nom, categorie=team_in.categorie)
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return team


async def list_teams(db: AsyncSession, club_id: int) -> list[Team]:
    """Liste les équipes non archivées d'un club."""
    stmt = select(Team).where(Team.club_id == club_id).where(Team.is_archived.is_(False))
    return list((await db.execute(stmt)).scalars().all())
