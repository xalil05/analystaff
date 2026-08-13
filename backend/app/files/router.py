"""Endpoints du module fichiers."""
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_club_member, require_permission
from app.core.database import get_db
from app.files import service as file_service
from app.files.schemas import FileUploadResponse, UploadedFileResponse
from app.users.models import User

router = APIRouter(tags=["files"])


@router.post("/{club_id}/files", response_model=FileUploadResponse, status_code=201)
async def upload_file(
    club_id: int,
    file: UploadFile = File(...),
    context_type: Optional[str] = Form(None),
    context_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("IMPORTER_SEANCE_DU_JOUR")),
):
    """
    Upload la séance du jour (PDF, TXT, DOCX, JPEG, PNG — 10 Mo max).
    RÈGLE : le fichier est traité comme contenu non fiable. L'analyse IA
    est soumise à validation par le coach avant réutilisation.
    """
    record, suggestion, message = await file_service.upload_file(
        db, club_id, user, file, context_type, context_id
    )
    return FileUploadResponse(
        file=UploadedFileResponse.model_validate(record),
        suggestion=suggestion,
        analysis_message=message,
    )


@router.get("/{club_id}/files", response_model=list[UploadedFileResponse])
async def list_files(
    club_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await file_service.list_files(db, club_id)


@router.get("/{club_id}/files/{file_id}", response_model=UploadedFileResponse)
async def get_file(
    club_id: int,
    file_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await file_service.get_file(db, club_id, file_id)