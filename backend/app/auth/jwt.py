"""Utilitaires JWT pour les access tokens (ZG-5 : access token courte durée)."""
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import get_settings
from app.core.errors import AuthenticationError

settings = get_settings()


def create_access_token(user_id: int) -> str:
    """Crée un access token JWT courte durée (15 min par défaut)."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
        "type": "access",
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int:
    """
    Décode un access token et retourne le user_id.
    Lève AuthenticationError si le token est invalide, expiré ou falsifié.
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Le token a expiré.")
    except jwt.InvalidTokenError:
        raise AuthenticationError("Le token est invalide.")

    if payload.get("type") != "access":
        raise AuthenticationError("Le token est invalide.")
    try:
        return int(payload["sub"])
    except (KeyError, ValueError):
        raise AuthenticationError("Le token est invalide.")