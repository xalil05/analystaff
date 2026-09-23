"""Schémas Pydantic du module audit."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    """Format de réponse des logs d'audit (lecture seule, coach principal)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    club_id: int
    action: str
    resource_type: str
    resource_id: Optional[int] = None
    resultat: Optional[str] = None
    contexte: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: datetime
