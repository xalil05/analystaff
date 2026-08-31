"""Modèles du domaine IA (voir SCHEMA_SQL.md §10)."""
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import AiSuggestionStatut, sa_enum
from app.core.mixins import CreatedAtMixin, TimestampMixin, BigIntIdentityMixin


class AiTemplate(Base, BigIntIdentityMixin, TimestampMixin):
    """Template de prompt versionné (ZG-7 : stocké en base)."""
    __tablename__ = "ai_templates"
    __table_args__ = (
        UniqueConstraint("action_key", "version", name="uq_ai_templates_action_version"),
    )
    action_key: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    template_content: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class AiSuggestion(Base, BigIntIdentityMixin, TimestampMixin):
    """Suggestion IA générée pour un utilisateur (voir SCHEMA_SQL.md §10.2)."""
    __tablename__ = "ai_suggestions"
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    action_key: Mapped[str] = mapped_column(String(50), nullable=False)
    template_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    contexte_utilise: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    suggestion_content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    statut: Mapped[AiSuggestionStatut] = mapped_column(
        sa_enum(AiSuggestionStatut, "ai_suggestion_statut"),
        nullable=False,
        default=AiSuggestionStatut.DRAFT,
        index=True,
    )
    pre_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class AiFeedback(Base, BigIntIdentityMixin, CreatedAtMixin):
    """Feedback du coach sur une suggestion (voir SCHEMA_SQL.md §10.3)."""
    __tablename__ = "ai_feedback"
    ai_suggestion_id: Mapped[int] = mapped_column(
        ForeignKey("ai_suggestions.id"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    modification_details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)