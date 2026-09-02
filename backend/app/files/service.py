"""Logique métier du module fichiers."""
import uuid
from typing import Optional

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai import service as ai_service
from app.ai.models import AiSuggestion
from app.core.config import get_settings
from app.core.enums import FileType
from app.core.errors import NotFoundError, ValidationError
from app.files.models import UploadedFile
from app.files.parsers import extract_text
from app.files.storage import storage
from app.roles.service import has_permission
from app.users.models import User

settings = get_settings()

# Types autorisés : extension(s) acceptée(s) + MIME attendu.
# RÈGLE : formats acceptés PDF, TXT, DOCX, JPEG, PNG (DECISIONS_FIGEES §13).
ALLOWED_TYPES: dict[FileType, dict] = {
    FileType.pdf: {"exts": {".pdf"}, "mime": "application/pdf"},
    FileType.txt: {"exts": {".txt"}, "mime": "text/plain"},
    FileType.docx: {
        "exts": {".docx"},
        "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    FileType.jpeg: {"exts": {".jpg", ".jpeg"}, "mime": "image/jpeg"},
    FileType.png: {"exts": {".png"}, "mime": "image/png"},
}


def _detect_file_type(filename: str, content_type: str | None) -> FileType:
    """
    Détecte le type à partir de l'extension et du MIME.
    NOTE HONNÊTE : la validation par magic number (signature binaire) serait
    plus robuste ; pour le V0 on se base sur extension + MIME. Voir ROADMAP.
    """
    lower = filename.lower()
    for file_type, spec in ALLOWED_TYPES.items():
        if any(lower.endswith(ext) for ext in spec["exts"]):
            # Si un MIME est fourni et n'est pas générique, on vérifie la cohérence.
            if content_type and content_type != "application/octet-stream":
                if content_type != spec["mime"]:
                    raise ValidationError(
                        f"Le type MIME {content_type} ne correspond pas à l'extension du fichier."
                    )
            return file_type
    raise ValidationError(
        "Format de fichier non autorisé. Formats acceptés : PDF, TXT, DOCX, JPEG, PNG."
    )


async def upload_file(
    db: AsyncSession,
    club_id: int,
    user: User,
    upload_file: UploadFile,
    context_type: Optional[str],
    context_id: Optional[int],
) -> tuple[UploadedFile, Optional["AiSuggestion"], Optional[str]]:
    """
    Orchestre l'upload complet :
    1. lecture + validation (taille, format) ;
    2. stockage objet (MinIO) avec une clé sécurisée ;
    3. enregistrement des métadonnées ;
    4. analyse IA (PARSE_UPLOADED_SESSION) si le contenu est exploitable.

    Retourne (fichier, suggestion, message d'analyse).
    """
    data = await upload_file.read()

    # Validation de la taille (10 Mo par défaut).
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise ValidationError(
            f"Le fichier dépasse la taille maximale de {settings.max_upload_size_mb} Mo."
        )

    # Validation du format.
    file_type = _detect_file_type(upload_file.filename or "", upload_file.content_type)

    # Clé sécurisée : préfixe club (organisation) + UUID (pas de nom d'origine).
    ext = next(
        e
        for ft, spec in ALLOWED_TYPES.items()
        if ft == file_type
        for e in spec["exts"]
        if (upload_file.filename or "").lower().endswith(e)
    )
    key = f"{club_id}/{uuid.uuid4().hex}{ext}"

    # Stockage objet.
    await storage.ensure_bucket()
    await storage.save(key, data, ALLOWED_TYPES[file_type]["mime"])

    # Enregistrement en base.
    record = UploadedFile(
        club_id=club_id,
        uploaded_by=user.id,
        file_name=upload_file.filename or "sans_nom",
        file_path=key,
        file_type=file_type,
        file_size=len(data),
        context_type=context_type,
        context_id=context_id,
        is_analyzed=False,
    )
    db.add(record)
    await db.commit()

    # Analyse IA si possible.
    suggestion: Optional[dict] = None
    message: Optional[str] = None

    text = await extract_text(file_type.value, data)
    if text is None:
        message = (
            "Le fichier a été enregistré. L'analyse automatique des images "
            "n'est pas disponible dans cette version."
        )
        return record, suggestion, message

    if not text.strip():
        message = "Le fichier a été enregistré, mais aucun texte exploitable n'a été détecté."
        return record, suggestion, message

    # L'analyse nécessite UTILISER_ASSISTANT_IA (en plus d'IMPORTER_SEANCE_DU_JOUR déjà vérifié).
    if not await has_permission(db, user.id, club_id, "UTILISER_ASSISTANT_IA"):
        message = "Le fichier a été enregistré. L'analyse IA nécessite la permission assistant IA."
        return record, suggestion, message

    try:
        suggestion_obj = await ai_service.trigger_action(
            db,
            club_id,
            user,
            "PARSE_UPLOADED_SESSION",
            extra_context={"uploaded_file_content": text},
        )
        suggestion = suggestion_obj
        record.is_analyzed = True
        await db.commit()
        message = "Le fichier a été analysé. La suggestion est soumise à votre validation."
    except Exception:  # noqa: BLE001 - l'analyse échoue proprement sans bloquer l'upload
        message = "Le fichier a été enregistré. L'analyse automatique a échoué."

    return record, suggestion, message


async def list_files(db: AsyncSession, club_id: int) -> list[UploadedFile]:
    stmt = (
        select(UploadedFile)
        .where(UploadedFile.club_id == club_id)
        .order_by(UploadedFile.created_at.desc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_file(db: AsyncSession, club_id: int, file_id: int) -> UploadedFile:
    """SÉCURITÉ : isolation par club (anti-IDOR)."""
    stmt = select(UploadedFile).where(
        UploadedFile.id == file_id, UploadedFile.club_id == club_id
    )
    record = (await db.execute(stmt)).scalar_one_or_none()
    if record is None:
        raise NotFoundError("Ce fichier n'existe pas.")
    return record