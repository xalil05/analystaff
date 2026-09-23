"""Endpoints de gestion du staff."""
from app.users.models import User
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_permission
from app.core.database import get_db
from app.roles import staff_service
from app.roles.schemas import (
    AddStaffMemberRequest,
    RoleResponse,
    StaffMemberResponse,
    UpdateStaffMemberRequest,
    DeleteStaffMemberRequest,
)

router = APIRouter(tags=["staff"])


@router.get("/{club_id}/roles", response_model=list[RoleResponse])
async def list_available_roles(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_STAFF")),
):
    """Liste les rôles activables pour le niveau du club."""
    return await staff_service.list_available_roles_for_club(db, club_id)


@router.get("/{club_id}/staff", response_model=list[StaffMemberResponse])
async def list_staff(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_STAFF")),
):
    return await staff_service.list_staff(db, club_id)


@router.post("/{club_id}/staff", response_model=StaffMemberResponse, status_code=201)
async def add_staff_member(
    club_id: int,
    body: AddStaffMemberRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_STAFF")),
):
    return await staff_service.add_staff_member(db, club_id, body)


@router.patch("/{club_id}/staff/{staff_member_id}", response_model=StaffMemberResponse)
async def update_staff_member(
    club_id: int,
    staff_member_id: int,
    body: UpdateStaffMemberRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_STAFF")),
):
    return await staff_service.update_staff_member(db, club_id, staff_member_id, body)


@router.delete("/{club_id}/staff/{staff_member_id}", response_model=StaffMemberResponse)
async def delete_staff_member(
    club_id: int,
    staff_member_id: int,
    body: DeleteStaffMemberRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("GERER_STAFF")),
):
    return await staff_service.delete_staff_member(db, club_id, staff_member_id)

@router.post("/{club_id}/staff/{staff_member_id}/permissions", status_code=201)
async def grant_permission(
    club_id: int,
    staff_member_id: int,
    permission_code: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("GERER_PERMISSIONS")),
):
    """Accorde une permission individuelle à un membre du staff."""
    return await staff_service.grant_permission(
        db, club_id, staff_member_id, permission_code, granted_by=user.id
    )


@router.delete("/{club_id}/staff/{staff_member_id}/permissions/{permission_code}", status_code=204)
async def revoke_permission(
    club_id: int,
    staff_member_id: int,
    permission_code: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("GERER_PERMISSIONS")),
):
    """Révoque une permission individuelle."""
    await staff_service.revoke_permission(
        db, club_id, staff_member_id, permission_code
    )