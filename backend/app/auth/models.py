"""Modèles du domaine authentification (refresh tokens)."""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.mixins import CreatedAtMixin, BigIntIdentityMixin


class RefreshToken(Base, BigIntIdentityMixin, CreatedAtMixin):
    """
    Refresh token stocké en base pour permettre la révocation (ZG-5).

    SÉCURITÉ : seul le hash (SHA-256) du token est stocké. Le token brut
    n'est jamais persisté. Un token révoqué (revoked_at renseigné) ou expiré
    est considéré comme invalide.
    """

    __tablename__ = "refresh_tokens"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)