"""Modèle d'audit trail (voir SCHEMA_SQL.md §12.1)."""
from typing import Optional

from sqlalchemy import BigInteger, ForeignKey, Index, String, TIMESTAMP
from sqlalchemy.dialects.postgresql import JSONB, INET, VARCHAR
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.mixins import BigIntIdentityMixin, CreatedAtMixin



class AuditLog(Base, BigIntIdentityMixin, CreatedAtMixin):
    """Journal d'audit immutables (RGPD, traçabilité des actions sensibles)."""

    __tablename__ = "audit_logs"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(VARCHAR(100), nullable=False, index=True)
    resource_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    resultat: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    context: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)

    __table_args__ = (
        Index("idx_audit_logs_created_at", "created_at"),
    )
