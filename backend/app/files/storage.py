"""
Abstraction du stockage de fichiers.
Conformément à ZG-2 (amendé) : la structure permet une migration vers un
autre backend objet (S3, volume local) sans réécriture du module.
"""
import asyncio
import io
from typing import Protocol

from minio import Minio

from app.core.config import get_settings

settings = get_settings()


class StorageBackend(Protocol):
    """Contrat minimal d'un backend de stockage objet."""

    async def ensure_bucket(self) -> None: ...

    async def save(self, key: str, data: bytes, content_type: str) -> None: ...

    async def read(self, key: str) -> bytes: ...


class MinIOStorage:
    """
    Implémentation MinIO (S3-compatible).
    Le client MinIO officiel est synchrone : on enrobe les appels bloquants
    dans asyncio.to_thread() pour ne pas bloquer l'event loop FastAPI.
    """

    def __init__(self) -> None:
        self._client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )

    def _ensure_bucket_sync(self) -> None:
        if not self._client.bucket_exists(settings.minio_bucket):
            self._client.make_bucket(settings.minio_bucket)

    async def ensure_bucket(self) -> None:
        await asyncio.to_thread(self._ensure_bucket_sync)

    def _save_sync(self, key: str, data: bytes, content_type: str) -> None:
        self._client.put_object(
            settings.minio_bucket,
            key,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )

    async def save(self, key: str, data: bytes, content_type: str) -> None:
        await asyncio.to_thread(self._save_sync, key, data, content_type)

    def _read_sync(self, key: str) -> bytes:
        response = self._client.get_object(settings.minio_bucket, key)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    async def read(self, key: str) -> bytes:
        return await asyncio.to_thread(self._read_sync, key)


# Instance unique utilisée par le service.
storage: StorageBackend = MinIOStorage()