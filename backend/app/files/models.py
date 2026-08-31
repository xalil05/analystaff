"""Modèles du domaine fichiers uploadés (voir SCHEMA_SQL.md §11)."""
from typing import Optional

from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import FileType, sa_enum
from app.core.mixins import CreatedAtMixin, BigIntIdentityMixin


class UploadedFile(Base, BigIntIdentityMixin, CreatedAtMixin):
    """
    Fichier uploadé par le coach ou un membre autorisé.
    SÉCURITÉ : le file_path est une clé vers le stockage objet (jamais le
    contenu brut en base). L'accès est contrôlé par club_id.
    """

    __tablename__ = "uploaded_files"

    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), nullable=False, index=True)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[FileType] = mapped_column(sa_enum(FileType, "file_type"), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    context_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    context_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    is_analyzed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)