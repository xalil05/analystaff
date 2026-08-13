"""Logique métier du module clubs."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.clubs.models import Club, Season, Team
from app.clubs.schemas import ClubCreate, ClubUpdate, SeasonCreate, TeamCreate
from app.core.enums import StaffMemberStatut
from app.core.errors import NotFoundError
from app.roles.models import Role, StaffMember
from app.users.models import User


async def create_club(db: AsyncSession, creator: User, club_in: ClubCreate) -> Club:
    """
    Crée un club et rattache son créateur comme coach principal.
    RÈGLE MÉTIER : le créateur d'un club en devient automatiquement le HEAD_COACH.
    """
    club = Club(nom=club_in.nom, niveau=club_in.niveau, timezone=club_in.timezone)
    db.add(club)
    await db.flush()

    head_coach = (
        await db.execute(select(Role).where(Role.code == "HEAD_COACH"))
    ).scalar_one()

    db.add(
        StaffMember(
            user_id=creator.id,
            club_id=club.id,
            role_id=head_coach.id,
            statut=StaffMemberStatut.actif,
        )
    )
    await db.commit()
    return club


async def get_club(db: AsyncSession, club_id: int) -> Club:
    """Récupère un club non archivé. Lève NotFoundError sinon."""
    club = await db.get(Club, club_id)
    if club is None or club.is_archived:
        raise NotFoundError("Ce club n'existe pas.")
    return club


async def update_club(db: AsyncSession, club: Club, club_in: ClubUpdate) -> Club:
    if club_in.nom is not None:
        club.nom = club_in.nom
    if club_in.niveau is not None:
        club.niveau = club_in.niveau
    if club_in.timezone is not None:
        club.timezone = club_in.timezone
    await db.commit()
    return club


async def list_user_clubs(db: AsyncSession, user_id: int) -> list[Club]:
    """Liste les clubs où l'utilisateur a une adhésion active."""
    stmt = (
        select(Club)
        .join(StaffMember, StaffMember.club_id == Club.id)
        .where(StaffMember.user_id == user_id)
        .where(StaffMember.statut == StaffMemberStatut.actif)
        .where(Club.is_archived.is_(False))
    )
    return list((await db.execute(stmt)).scalars().all())


async def create_team(db: AsyncSession, club_id: int, team_in: TeamCreate) -> Team:
    team = Team(club_id=club_id, nom=team_in.nom, categorie=team_in.categorie)
    db.add(team)
    await db.commit()
    return team


async def list_teams(db: AsyncSession, club_id: int) -> list[Team]:
    stmt = select(Team).where(Team.club_id == club_id).where(Team.is_archived.is_(False))
    return list((await db.execute(stmt)).scalars().all())


async def create_season(db: AsyncSession, club_id: int, season_in: SeasonCreate) -> Season:
    season = Season(
        club_id=club_id,
        label=season_in.label,
        date_debut=season_in.date_debut,
        date_fin=season_in.date_fin,
        is_active=season_in.is_active,
    )
    db.add(season)
    await db.commit()
    return season


async def list_seasons(db: AsyncSession, club_id: int) -> list[Season]:
    stmt = (
        select(Season).where(Season.club_id == club_id).order_by(Season.date_debut.desc())
    )
    return list((await db.execute(stmt)).scalars().all())