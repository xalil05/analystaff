"""Endpoints du tableau de bord et de la synthèse (lecture seule)."""
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_club_member
from app.core.database import get_db
from app.dashboard import pdf as dashboard_pdf
from app.dashboard import service as dashboard_service
from app.dashboard.schemas import (
    DashboardOverview,
    PlayerHistoryResponse,
    PreMatchSummary,
    RadarResponse,
)
from app.roles.models import StaffMember
from app.roles.services import has_permission

router = APIRouter(tags=["dashboard"])


@router.get("/{club_id}/dashboard/overview", response_model=DashboardOverview)
async def get_overview(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await dashboard_service.get_overview(db, club_id)


@router.get(
    "/{club_id}/dashboard/players/{player_id}/radar", response_model=RadarResponse
)
async def get_player_radar(
    club_id: int,
    player_id: int,
    limit: int = Query(default=5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await dashboard_service.get_player_radar(db, club_id, player_id, limit)


@router.get(
    "/{club_id}/dashboard/players/{player_id}/history", response_model=PlayerHistoryResponse
)
async def get_player_history(
    club_id: int,
    player_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await dashboard_service.get_player_history(db, club_id, player_id)


@router.get(
    "/{club_id}/dashboard/matches/{match_id}/pre-match", response_model=PreMatchSummary
)
async def get_pre_match_summary(
    club_id: int,
    match_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await dashboard_service.get_pre_match_summary(db, club_id, match_id)


@router.get("/{club_id}/dashboard/players/{player_id}/export-pdf")
async def export_player_pdf(
    club_id: int,
    player_id: int,
    db: AsyncSession = Depends(get_db),
    user: StaffMember = Depends(require_club_member),
):
    """
    Export PDF du profil joueur.
    SÉCURITÉ : les données physiques ne sont incluses que si l'utilisateur
    a la permission VOIR_DONNEES_PHYSIQUES.
    """
    include_physical = await has_permission(db, user.id, club_id, "VOIR_DONNEES_PHYSIQUES")
    include_medical = await has_permission(db, user.id, club_id, "VOIR_DONNEES_MEDICALES")

    data = await dashboard_service.get_player_export_data(
        db, club_id, player_id, include_physical, include_medical
    )
    pdf_bytes = dashboard_pdf.generate_player_pdf(data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="joueur_{player_id}.pdf"'},
    )


@router.get("/{club_id}/dashboard/matches/{match_id}/export-pdf")
async def export_match_pdf(
    club_id: int,
    match_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    """Export PDF de la synthèse match."""
    data = await dashboard_service.get_match_export_data(db, club_id, match_id)
    pdf_bytes = dashboard_pdf.generate_match_pdf(data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="match_{match_id}.pdf"'},
    )