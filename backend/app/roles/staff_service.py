"""Logique métier de gestion du staff (adhésions, rôles)."""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clubs import service as club_service
from app.core.enums import StaffMemberStatut
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.roles.models import Role, RolesAvailableByLevel, StaffMember
from app.roles.schemas import (
    AddStaffMemberRequest,
    StaffMemberResponse,
    UpdateStaffMemberRequest,
)
from app.users.models import User


def _compose_response(member: StaffMember, user: User, role: Role) -> StaffMemberResponse:
    return StaffMemberResponse(
        id=member.id,
        user_id=member.user_id,
        club_id=member.club_id,
        role_id=member.role_id,
        statut=member.statut,
        joined_at=member.joined_at,
        left_at=member.left_at,
        user_email=user.email,
        user_nom=user.nom,
        role_code=role.code,
        role_label=role.label,
    )


async def list_available_roles_for_club(db: AsyncSession, club_id: int) -> list[Role]:
    """
    RÈGLE MÉTIER (voir DECISIONS_FIGEES.md §7) : la liste des rôles proposés
    est filtrée selon le niveau du club.
    """
    club = await club_service.get_club(db, club_id)
    stmt = (
        select(Role)
        .join(RolesAvailableByLevel, RolesAvailableByLevel.role_id == Role.id)
        .where(RolesAvailableByLevel.club_level == club.niveau)
    )
    return list((await db.execute(stmt)).scalars().all())


async def _role_available_for_level(db: AsyncSession, role_code: str, club_level) -> bool:
    stmt = (
        select(RolesAvailableByLevel)
        .join(Role, Role.id == RolesAvailableByLevel.role_id)
        .where(Role.code == role_code)
        .where(RolesAvailableByLevel.club_level == club_level)
    )
    return (await db.execute(stmt)).scalar_one_or_none() is not None


async def list_staff(db: AsyncSession, club_id: int) -> list[StaffMemberResponse]:
    await club_service.get_club(db, club_id)
    stmt = (
        select(StaffMember, User, Role)
        .join(User, User.id == StaffMember.user_id)
        .join(Role, Role.id == StaffMember.role_id)
        .where(StaffMember.club_id == club_id)
        .order_by(StaffMember.joined_at)
    )
    return [
        _compose_response(member, user, role)
        for member, user, role in (await db.execute(stmt)).all()
    ]


async def add_staff_member(
    db: AsyncSession, club_id: int, request: AddStaffMemberRequest
) -> StaffMemberResponse:
    """
    Rattache un utilisateur existant au club avec un rôle.
    RÈGLE : l'utilisateur doit déjà avoir un compte, et le rôle doit être
    disponible pour le niveau du club.
    """
    club = await club_service.get_club(db, club_id)

    user = (
        await db.execute(select(User).where(User.email == request.email))
    ).scalar_one_or_none()
    if user is None:
        raise NotFoundError("Aucun utilisateur avec cet email. Il doit d'abord créer un compte.")

    if not await _role_available_for_level(db, request.role_code, club.niveau):
        raise ValidationError(
            f"Le rôle {request.role_code} n'est pas disponible pour un club {club.niveau.value}."
        )

    role = (
        await db.execute(select(Role).where(Role.code == request.role_code))
    ).scalar_one()

    existing = (
        await db.execute(
            select(StaffMember)
            .where(StaffMember.user_id == user.id)
            .where(StaffMember.club_id == club.id)
        )
    ).scalar_one_or_none()

    if existing is not None and existing.statut == StaffMemberStatut.actif:
        raise ConflictError("Cet utilisateur est déjà membre actif de ce club.")

    if existing is not None:
        # Réactivation d'un membre parti ou suspendu.
        existing.role_id = role.id
        existing.statut = StaffMemberStatut.actif
        existing.left_at = None
        member = existing
    else:
        member = StaffMember(
            user_id=user.id, club_id=club.id, role_id=role.id, statut=StaffMemberStatut.actif
        )
        db.add(member)
    await db.commit()
    return _compose_response(member, user, role)


async def update_staff_member(
    db: AsyncSession, club_id: int, staff_member_id: int, request: UpdateStaffMemberRequest
) -> StaffMemberResponse:
    """Modifie le rôle ou le statut d'un membre du staff."""
    club = await club_service.get_club(db, club_id)
    member = (
        await db.execute(
            select(StaffMember)
            .where(StaffMember.id == staff_member_id)
            .where(StaffMember.club_id == club_id)
        )
    ).scalar_one_or_none()
    if member is None:
        raise NotFoundError("Ce membre n'existe pas.")

    if request.role_code is not None:
        if not await _role_available_for_level(db, request.role_code, club.niveau):
            raise ValidationError(
                f"Le rôle {request.role_code} n'est pas disponible pour un club {club.niveau.value}."
            )
        role = (
            await db.execute(select(Role).where(Role.code == request.role_code))
        ).scalar_one()
        member.role_id = role.id

    if request.statut is not None:
        member.statut = request.statut
        member.left_at = (
            datetime.now(timezone.utc)
            if request.statut in (StaffMemberStatut.parti, StaffMemberStatut.suspendu)
            else None
        )

    await db.commit()
    user = await db.get(User, member.user_id)
    role = await db.get(Role, member.role_id)
    return _compose_response(member, user, role)