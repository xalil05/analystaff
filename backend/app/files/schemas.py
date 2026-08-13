"""Schémas Pydantic du module fichiers."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.ai.schemas import AiSuggestionResponse
from app.core.enums import FileType


class UploadedFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    club_id: int
    uploaded_by: int
    file_name: str
    file_type: FileType
    file_size: int
    context_type: Optional[str]
    context_id: Optional[int]
    is_analyzed: bool
    created_at: datetime


class FileUploadResponse(BaseModel):
    """Réponse d'upload : métadonnées du fichier + suggestion IA si analysé."""

    file: UploadedFileResponse
    suggestion: Optional[AiSuggestionResponse] = None
    analysis_message: Optional[str] = None