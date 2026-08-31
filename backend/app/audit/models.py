"""Modèle d'audit trail (voir SCHEMA_SQL.md §12.1)."""
from typing import Optional

from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, INET
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.mixins import BigIntIdentityMixin, CreatedAtMixin


class AuditLog(Base, BigIntIdentityMixin, CreatedAtMixin):
    """Journal d'audit immutables (RGPD, traçabilité des actions sensibles)."""

    __tablename__ = "audit_logs"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    club_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clubs.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
