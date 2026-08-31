"""Modèles du domaine utilisateurs."""
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.mixins import TimestampMixin, BigIntIdentityMixin


class User(Base, BigIntIdentityMixin, TimestampMixin):
    """Compte utilisateur de la plateforme (voir SCHEMA_SQL.md §3.1)."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    prenom: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class UserPreference(Base, BigIntIdentityMixin, TimestampMixin):
    """Préférences utilisateur par club (voir SCHEMA_SQL.md §13.1)."""

    __tablename__ = "user_preferences"
    __table_args__ = (UniqueConstraint("user_id", "club_id"),)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False)
    preferences: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)