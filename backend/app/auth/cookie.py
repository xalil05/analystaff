"""Gestion du cookie de refresh token."""
from fastapi import Response

from app.core.config import get_settings

settings = get_settings()

REFRESH_COOKIE_NAME = "refresh_token"
# Cookie restreint aux endpoints d'authentification uniquement.
REFRESH_COOKIE_PATH = "/api/v1/auth"


def set_refresh_cookie(response: Response, token: str, max_age: int) -> None:
    """
    SÉCURITÉ (voir STANDARDS §12.1) :
    - httpOnly : non accessible en JavaScript (anti-XSS) ;
    - Secure : transmis uniquement en HTTPS (actif en production) ;
    - SameSite=Strict : anti-CSRF ;
    - path restreint : envoyé uniquement vers /api/v1/auth.
    """
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="strict",
        max_age=max_age,
        path=REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    """Supprime le cookie de refresh (logout)."""
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)