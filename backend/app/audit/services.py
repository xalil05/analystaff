"""Service d'audit — écriture et lecture des logs."""
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog


async def log_action(
    db: AsyncSession,
    *,
    user_id: int,
    club_id: int,
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    resultat: Optional[str] = None,
    contexte: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Journalise une action critique. Commit laissé au caller."""
    entry = AuditLog(
        user_id=user_id,
        club_id=club_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        resultat=resultat,
        contexte=contexte,
        ip_address=ip_address,
    )
    db.add(entry)
    return entry


async def list_audit_logs(
    db: AsyncSession,
    club_id: int,
    limit: int = 100,
    offset: int = 0,
) -> list[AuditLog]:
    """Liste les logs d'un club, du plus récent au plus ancien."""
    stmt = (
        select(AuditLog)
        .where(AuditLog.club_id == club_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
