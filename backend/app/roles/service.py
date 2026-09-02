"""Service de calcul des permissions effectives (RBAC dynamique)."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import StaffMemberStatut
from app.roles.models import Permission, RolePermission, StaffMember, UserPermission


async def get_user_permissions(db: AsyncSession, user_id: int, club_id: int) -> set[str]:
    """
    Calcule l'ensemble des permissions effectives d'un utilisateur pour un club.

    Permissions effectives = permissions par défaut du rôle
                            + exceptions individuelles actives (accordées, non révoquées).

    RÈGLE MÉTIER : le coach principal (HEAD_COACH) a une supervision totale.
    Le seed attribuant toutes les permissions au rôle HEAD_COACH, la logique
    générique couvre ce cas sans traitement spécial.
    """
    # 1. Adhésion active de l'utilisateur au club (isolation par club).
    stmt = (
        select(StaffMember)
        .where(StaffMember.user_id == user_id)
        .where(StaffMember.club_id == club_id)
        .where(StaffMember.statut == StaffMemberStatut.actif)
    )
    membership = (await db.execute(stmt)).scalar_one_or_none()
    if membership is None:
        return set()

    # 2. Permissions par défaut du rôle.
    stmt = (
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id == membership.role_id)
    )
    role_perms = set((await db.execute(stmt)).scalars().all())

    # 3. Exceptions individuelles actives (accordées, non révoquées).
    stmt = (
        select(Permission.code)
        .join(UserPermission, UserPermission.permission_id == Permission.id)
        .where(UserPermission.staff_member_id == membership.id)
        .where(UserPermission.revoked_at.is_(None))
    )
    exception_perms = set((await db.execute(stmt)).scalars().all())

    return role_perms | exception_perms


async def has_permission(db: AsyncSession, user_id: int, club_id: int, permission_code: str) -> bool:
    """Vérifie si un utilisateur possède une permission précise pour un club."""
    permissions = await get_user_permissions(db, user_id, club_id)
    return permission_code in permissions

async def get_active_membership(db: AsyncSession, user_id: int, club_id: int) -> StaffMember | None:
    """
    Retourne l'adhésion active d'un utilisateur à un club, ou None.
    Utilisé pour vérifier l'appartenance au club (isolation multi-tenant).
    """
    stmt = (
        select(StaffMember)
        .where(StaffMember.user_id == user_id)
        .where(StaffMember.club_id == club_id)
        .where(StaffMember.statut == StaffMemberStatut.actif)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_user_memberships(db: AsyncSession, user_id: int) -> list[StaffMember]:
    """
    Retourne toutes les adhésions actives d'un utilisateur (MVP : normalement 1).
    Utilisé par /me pour auto-resoudre le club_id.
    Le club est eagerly loaded pour éviter les requêtes N+1.
    """
    from sqlalchemy.orm import joinedload
    stmt = (
        select(StaffMember)
        .options(joinedload(StaffMember.club))
        .where(StaffMember.user_id == user_id)
        .where(StaffMember.statut == StaffMemberStatut.actif)
        .order_by(StaffMember.joined_at.asc())
    )
    return list((await db.execute(stmt)).scalars().all())