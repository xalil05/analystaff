"""Logique métier d'authentification."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import RefreshToken
from app.core.config import get_settings
from app.core.errors import AuthenticationError
from app.core.security import verify_password
from app.users.models import User

settings = get_settings()


def _hash_refresh_token(token: str) -> str:
    """Hache un refresh token (SHA-256). Jamais stocké en clair."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    """Vérifie les identifiants. Retourne l'utilisateur ou lève AuthenticationError."""
    stmt = select(User).where(User.email == email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if user is None or not verify_password(password, user.password_hash):
        # SÉCURITÉ : message volontairement générique pour ne pas révéler
        # si l'email existe (protection contre l'énumération de comptes).
        raise AuthenticationError("Email ou mot de passe incorrect.")
    if not user.is_active:
        raise AuthenticationError("Ce compte est désactivé.")
    return user


async def issue_refresh_token(
    db: AsyncSession, user: User, user_agent: str | None, ip_address: str | None
) -> str:
    """Crée un refresh token, stocke son hash en base et retourne le token brut."""
    raw_token = secrets.token_urlsafe(64)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    refresh = RefreshToken(
        user_id=user.id,
        token_hash=_hash_refresh_token(raw_token),
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(refresh)
    await db.flush()
    return raw_token


async def validate_refresh_token(db: AsyncSession, raw_token: str) -> RefreshToken:
    """Valide un refresh token. Retourne l'objet ou lève AuthenticationError."""
    token_hash = _hash_refresh_token(raw_token)
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    refresh = (await db.execute(stmt)).scalar_one_or_none()

    if refresh is None:
        raise AuthenticationError("Session invalide.")
    if refresh.revoked_at is not None:
        raise AuthenticationError("Session révoquée.")
    if refresh.expires_at < datetime.now(timezone.utc):
        raise AuthenticationError("Session expirée.")
    return refresh


async def revoke_refresh_token(db: AsyncSession, raw_token: str) -> None:
    """Révoque un refresh token (logout). Idempotent."""
    token_hash = _hash_refresh_token(raw_token)
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    refresh = (await db.execute(stmt)).scalar_one_or_none()
    if refresh is not None and refresh.revoked_at is None:
        refresh.revoked_at = datetime.now(timezone.utc)
        await db.flush()