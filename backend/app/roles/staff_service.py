"""Logique métier de gestion du staff (adhésions, rôles)."""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clubs import service as club_service
from app.core.enums import StaffMemberStatut
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.roles.models import (
    Permission,
    Role,
    RolePermission,
    RolesAvailableByLevel,
    StaffMember,
    UserPermission,
)
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


async def _get_member_in_club(
    db: AsyncSession, club_id: int, staff_member_id: int
) -> StaffMember | None:
    """
    Retourne l'adhésion `staff_member_id` dans le club `club_id`, ou None.

    Le filtre porte TOUJOURS sur les deux colonnes : un identifiant connu mais
    appartenant à un autre club est traité comme inexistant (isolation par club,
    MATRICE_PERMISSIONS_ET_REGLES_METIER.md §9.1).
    """
    return (
        await db.execute(
            select(StaffMember)
            .where(StaffMember.id == staff_member_id)
            .where(StaffMember.club_id == club_id)
        )
    ).scalar_one_or_none()


async def update_staff_member(
    db: AsyncSession, club_id: int, staff_member_id: int, request: UpdateStaffMemberRequest
) -> StaffMemberResponse:
    """Modifie le rôle ou le statut d'un membre du staff."""
    club = await club_service.get_club(db, club_id)
    member = await _get_member_in_club(db, club_id, staff_member_id)
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


async def delete_staff_member(
    db: AsyncSession, club_id: int, staff_member_id: int
) -> StaffMemberResponse:
    """
    Retire un membre du club. RÈGLE : c'est une DÉSACTIVATION, pas une
    suppression physique.

    La ligne `staff_members` n'est jamais effacée :

    - le modèle décrit une fin d'adhésion DATÉE : `statut` et `left_at`
      (« Date de départ », SCHEMA_SQL.md §5.5) ;
    - le RBAC ne résout les droits que sur une adhésion `actif`
      (`roles/service.py`) : passer le membre à `parti` ferme son accès, et
      `GET /staff` le fait apparaître sous le filtre « Partis » de l'UI ;
    - `user_permissions` référence `staff_members.id` sans ON DELETE CASCADE :
      un effacement physique lèverait une IntegrityError (500) dès que le membre
      a fait l'objet d'une décision de permission.

    La ligne conservée garde l'historique : date d'arrivée, date de départ, et
    décisions de permission prises sur ce membre. `add_staff_member` réactive
    cette même ligne si le coach rattache de nouveau la personne au club.

    Idempotent : retirer un membre déjà `parti` ne réécrit pas `left_at`.
    """
    member = await _get_member_in_club(db, club_id, staff_member_id)
    if member is None:
        raise NotFoundError("Ce membre n'existe pas dans ce club.")

    if member.statut != StaffMemberStatut.parti:
        member.statut = StaffMemberStatut.parti
        member.left_at = datetime.now(timezone.utc)
        await db.commit()

    user = await db.get(User, member.user_id)
    role = await db.get(Role, member.role_id)
    return _compose_response(member, user, role)


async def _resolve_permission_scope(
    db: AsyncSession, club_id: int, staff_member_id: int, permission_code: str
) -> tuple[StaffMember, Permission]:
    """
    Résout le membre (dans le club visé) et la permission visés par une décision
    du coach. Lève NotFoundError si l'un des deux n'existe pas.
    """
    member = await _get_member_in_club(db, club_id, staff_member_id)
    if member is None:
        raise NotFoundError("Ce membre n'existe pas dans ce club.")

    permission = (
        await db.execute(select(Permission).where(Permission.code == permission_code))
    ).scalar_one_or_none()
    if permission is None:
        raise NotFoundError(f"Permission inconnue : {permission_code}.")

    return member, permission


async def _role_owns_permission(db: AsyncSession, role_id: int, permission_id: int) -> bool:
    """Le rôle possède-t-il cette permission par défaut ?"""
    return (
        await db.execute(
            select(RolePermission)
            .where(RolePermission.role_id == role_id)
            .where(RolePermission.permission_id == permission_id)
        )
    ).scalar_one_or_none() is not None


async def _find_permission_decision(
    db: AsyncSession, staff_member_id: int, permission_id: int
) -> UserPermission | None:
    """Retourne la décision individuelle du coach sur cette permission, ou None."""
    return (
        await db.execute(
            select(UserPermission)
            .where(UserPermission.staff_member_id == staff_member_id)
            .where(UserPermission.permission_id == permission_id)
        )
    ).scalar_one_or_none()


async def _decide_permission(
    db: AsyncSession,
    member: StaffMember,
    permission: Permission,
    granted_by: int,
    denied: bool,
) -> None:
    """
    Enregistre la décision du coach comme exception individuelle (table
    user_permissions), en upsert sur (staff_member_id, permission_id) : une
    décision antérieure est réactivée plutôt que dupliquée, et `revoked_at`
    est remis à None pour que la nouvelle décision prenne effet.
    """
    existing = await _find_permission_decision(db, member.id, permission.id)

    if existing is None:
        db.add(
            UserPermission(
                staff_member_id=member.id,
                permission_id=permission.id,
                denied=denied,
                granted_by=granted_by,
                granted_at=datetime.now(timezone.utc),
            )
        )
    else:
        existing.denied = denied
        existing.revoked_at = None
        existing.granted_by = granted_by
        existing.granted_at = datetime.now(timezone.utc)


async def grant_permission(
    db: AsyncSession, club_id: int, staff_member_id: int, permission_code: str, granted_by: int
) -> dict:
    """
    RÈGLE MÉTIER (DECISIONS_FIGEES.md §6) : le coach accorde une permission à
    une personne précise, au-delà de son rôle par défaut.
    Une autorisation « ouvre des droits précis » : elle ne dit rien des
    permissions que le membre ne reçoit pas.
    Idempotent : ré-accorder une permission déjà accordée (ou déjà détenue par
    le rôle) ne change rien au résultat.
    """
    member, permission = await _resolve_permission_scope(
        db, club_id, staff_member_id, permission_code
    )
    await _decide_permission(db, member, permission, granted_by, denied=False)
    await db.commit()
    return {"staff_member_id": member.id, "permission_code": permission.code}


async def revoke_permission(
    db: AsyncSession, club_id: int, staff_member_id: int, permission_code: str, revoked_by: int
) -> None:
    """
    RÈGLE MÉTIER — RETRAIT PAR DÉFAUT (DECISIONS_FIGEES.md §6, et
    MATRICE_PERMISSIONS_ET_REGLES_METIER.md §10.1 « Retirer des permissions ») :
    le coach retire une permission à une personne précise. Après cet appel, le
    membre ne possède PAS cette permission, y compris si son rôle la possède
    par défaut.

    Deux cas, car ils ne demandent pas la même trace :

    - le rôle NE possède pas la permission par défaut → l'absence d'accord vaut
      déjà refus (MATRICE §1.1 « Variable »). On annule un éventuel accord.
    - le rôle POSSÈDE la permission par défaut → l'absence de décision ne
      suffirait pas, le défaut la rendrait de nouveau. On enregistre donc un
      RETRAIT explicite, seul moyen de primer sur le rôle.

    Le retrait est individuel : `role_permissions` n'est jamais modifié, donc
    les autres membres du même rôle conservent leur droit. Inversement,
    `grant_permission` sur la même permission lève le retrait.
    Idempotent : retirer deux fois de suite laisse le membre sans la permission.
    """
    member, permission = await _resolve_permission_scope(
        db, club_id, staff_member_id, permission_code
    )

    if await _role_owns_permission(db, member.role_id, permission.id):
        await _decide_permission(db, member, permission, revoked_by, denied=True)
    else:
        # Aucune trace de retrait à laisser : on neutralise l'accord éventuel.
        # `revoked_at` suffit, l'absence d'accord valant déjà refus.
        decision = await _find_permission_decision(db, member.id, permission.id)
        if decision is not None:
            decision.revoked_at = datetime.now(timezone.utc)

    await db.commit()