"""Endpoints d'audit (lecture seule pour le coach)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_club_member, require_permission
from app.audit import services as audit_service
from app.audit.schemas import AuditLogResponse
from app.core.database import get_db

router = APIRouter(tags=["audit"])


@router.get("/{club_id}/audit/logs", response_model=list[AuditLogResponse])
async def list_logs(
    club_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("CONSULTER_AUDIT")),
):
    """Retourne les logs d'audit du club. Réservé au coach principal."""
    return await audit_service.list_audit_logs(db, club_id, limit, offset)