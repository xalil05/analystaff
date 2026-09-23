"""Modèle d'audit trail (voir SCHEMA_SQL.md §12.1)."""
from typing import Optional

from sqlalchemy import BigInteger, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.mixins import BigIntIdentityMixin, CreatedAtMixin


class AuditLog(Base, BigIntIdentityMixin, CreatedAtMixin):
    """Journal d'audit immutables (RGPD, traçabilité des actions sensibles)."""

    __tablename__ = "audit_logs"

    __table_args__ = (
        Index("idx_audit_logs_user_id", "user_id"),
        Index("idx_audit_logs_action", "action"),
        Index("idx_audit_logs_created_at", "created_at"),
    )

    # FK → users.id (NULL autorisé : on ne sait pas toujours qui fait l'action, ex. sync)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    # FK → clubs.id — obligatoire car tous les logs sont rattachés à un club (isolation)
    # Note: dans la version actuelle MVP, le club est toujours connu au moment de la journalisation
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    # Type d'action (LOGIN, CREATION, MODIFICATION, SUPPRESSION, VALIDATION, etc.)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # Type de ressource concernée (USER, PLAYER, MATCH, TRAINING_SESSION, etc.)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # ID de la ressource concernée, si applicable
    resource_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    # Résultat de l'action : SUCCESS, FAILURE, DENIED, WARNING (VARCHAR(30) par SCHEMA_SQL.md §12.1)
    resultat: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    # Contexte additionnel au format JSONB (détails d'erreur, données sensibles non stockées, etc.)
    contexte: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # Adresse IP du client (INET pour PostgreSQL, stocké nativement)
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
