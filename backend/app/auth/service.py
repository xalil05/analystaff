"""Logique métier d'authentification."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import RefreshToken
from app.clubs.models import Club
from app.clubs.schemas import ClubCreate
from app.clubs.service import create_club
from app.core.config import get_settings
from app.core.errors import AuthenticationError
from app.core.security import hash_password, verify_password
from app.roles.models import Role, StaffMember
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


async def register_user_with_club(
    db: AsyncSession,
    email: str,
    password: str,
    nom: str,
    prenom: str | None = None,
    club_nom: str | None = None,
) -> User:
    """
    Inscription avec création automatique d'un club (MVP).
    - Crée l'utilisateur
    - Crée un club (nom personnalisé ou "Mon Club" par défaut)
    - Assigne l'utilisateur comme HEAD_COACH du club
    """
    # 1. Créer l'utilisateur
    user = User(
        email=email,
        password_hash=hash_password(password),
        nom=nom,
        prenom=prenom,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # 2. Créer le club (nom personnalisé ou "Mon Club")
    club_name = club_nom.strip() if club_nom and club_nom.strip() else "Mon Club"
    club = await create_club(
        db,
        creator=user,
        club_in=ClubCreate(nom=club_name, niveau="amateur", timezone="Africa/Dakar"),
    )

    return user