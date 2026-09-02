"""Endpoints de gestion du staff."""
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