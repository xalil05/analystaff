"""
Configuration centrale d'Analystaff.

Toutes les valeurs sensibles proviennent exclusivement des variables
d'environnement (jamais codées en dur, jamais commitées).
Voir .env.example pour la liste exhaustive.
"""
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Paramètres de l'application, chargés depuis l'environnement."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore", 
    )

    # --- Stockage objet MinIO (évolution de ZG-2 : stockage local via S3-compatible) ---
    minio_endpoint: str = Field(default="minio:9000")
    minio_access_key: str = Field(default="analystaff")
    minio_secret_key: str = Field(default="analystaff_minio_secret")
    minio_bucket: str = Field(default="analystaff-files")
    minio_secure: bool = Field(default=False)  

    # --- Application ---
    app_name: str = "Analystaff"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    timezone: str = "Africa/Dakar"

    # --- Base de données (ZG-3 : pool SQLAlchemy 10-20 connexions) ---
    database_url: str = Field(
        default="postgresql+asyncpg://analystaff:analystaff@localhost:5432/analystaff"
    )
    db_pool_size: int = Field(default=15, ge=1, le=50)
    db_max_overflow: int = Field(default=5, ge=0, le=20)
    db_pool_timeout: int = Field(default=30, ge=1)
    db_pool_recycle: int = Field(default=3600, ge=60)
    db_echo: bool = False

    # --- Sécurité / Auth (ZG-5 : refresh tokens en base) ---
    secret_key: str = Field(default="change-me-with-a-long-random-string")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=15, ge=1)
    refresh_token_expire_days: int = Field(default=7, ge=1, le=30)

    # --- CORS (restrictif : uniquement le frontend) ---
    cors_origins: list[str] = Field(default=["http://localhost:3000"])

    # --- Rate limiting (ZG-4) ---
    rate_limit_enabled: bool = True

    # --- Stockage fichiers (ZG-2 : local sur le serveur Dell) ---
    upload_dir: str = Field(default="./uploads")
    max_upload_size_mb: int = Field(default=10, ge=1, le=50)

    # --- IA (DeepSeek) ---
    deepseek_api_key: str = Field(default="")
    deepseek_base_url: str = Field(default="https://api.deepseek.com")
    deepseek_timeout_seconds: int = Field(default=30, ge=1)

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Retourne une instance unique et mise en cache des paramètres."""
    return Settings()