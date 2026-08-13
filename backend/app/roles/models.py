"""Modèles du domaine rôles et permissions."""
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import ClubLevel, InvitationStatut, StaffMemberStatut, sa_enum
from app.core.mixins import CreatedAtMixin, TimestampMixin


class Role(Base, TimestampMixin):
    """Rôle disponible dans la plateforme (voir SCHEMA_SQL.md §5.1)."""

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Permission(Base, TimestampMixin):
    """Permission disponible (voir SCHEMA_SQL.md §5.3)."""

    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class RolesAvailableByLevel(Base, CreatedAtMixin):
    """Association niveau de club -> rôles activables (voir SCHEMA_SQL.md §5.2)."""

    __tablename__ = "roles_available_by_level"
    __table_args__ = (
        UniqueConstraint("club_level", "role_id", name="uq_roles_available_by_level"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    club_level: Mapped[ClubLevel] = mapped_column(
        sa_enum(ClubLevel, "club_level"), nullable=False, index=True
    )
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)


class RolePermission(Base, CreatedAtMixin):
    """Permissions par défaut d'un rôle (voir SCHEMA_SQL.md §5.4)."""

    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_id", "permission_id", name="uq_role_permissions"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False, index=True)
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id"), nullable=False)


class StaffMember(Base, TimestampMixin):
    """Appartenance d'un utilisateur à un club avec rôle (voir SCHEMA_SQL.md §5.5)."""

    __tablename__ = "staff_members"
    __table_args__ = (UniqueConstraint("user_id", "club_id", name="uq_staff_members_user_club"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    statut: Mapped[StaffMemberStatut] = mapped_column(
        sa_enum(StaffMemberStatut, "staff_member_statut"),
        nullable=False,
        default=StaffMemberStatut.actif,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    left_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class UserPermission(Base, CreatedAtMixin):
    """Exception individuelle de permission accordée par le coach (voir §5.6)."""

    __tablename__ = "user_permissions"
    __table_args__ = (
        UniqueConstraint("staff_member_id", "permission_id", name="uq_user_permissions"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    staff_member_id: Mapped[int] = mapped_column(
        ForeignKey("staff_members.id"), nullable=False, index=True
    )
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id"), nullable=False)
    granted_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Invitation(Base, CreatedAtMixin):
    """Invitation envoyée par le coach (voir SCHEMA_SQL.md §3.2)."""

    __tablename__ = "invitations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    invited_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    statut: Mapped[InvitationStatut] = mapped_column(
        sa_enum(InvitationStatut, "invitation_statut"),
        nullable=False,
        default=InvitationStatut.pending,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)