"""Schémas Pydantic du module rôles / staff."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.enums import StaffMemberStatut


class RoleResponse(BaseModel):
    """Rôle disponible (voir MATRICE_PERMISSIONS_ET_REGLES_METIER.md)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    label: str
    description: Optional[str] = None


class AddStaffMemberRequest(BaseModel):
    """Rattache un utilisateur existant à un club avec un rôle."""

    email: EmailStr
    role_code: str = Field(min_length=1, max_length=50)


class UpdateStaffMemberRequest(BaseModel):
    """Modifie le rôle ou le statut d'un membre du staff."""

    role_code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    statut: Optional[StaffMemberStatut] = None


class DeleteStaffMemberRequest(BaseModel):
    """Supprime un membre du staff."""

    pass


class StaffMemberResponse(BaseModel):
    """Membre du staff avec les informations de l'utilisateur et du rôle."""

    id: int
    user_id: int
    club_id: int
    role_id: int
    statut: StaffMemberStatut
    joined_at: datetime
    left_at: Optional[datetime] = None

    # Champs joints (remplis par le service).
    user_email: str
    user_nom: str
    role_code: str
    role_label: str