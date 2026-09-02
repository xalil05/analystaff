"""Endpoints d'authentification (login, register, refresh, logout, me)."""
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import service as auth_service
from app.auth.cookie import REFRESH_COOKIE_NAME, clear_refresh_cookie, set_refresh_cookie
from app.auth.dependencies import get_current_club, get_current_user
from app.auth.jwt import create_access_token
from app.auth.schemas import LoginRequest, MeResponse, RegisterRequest, TokenResponse, UserResponse
from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import AuthenticationError
from app.core.limiter import limiter
from app.roles.service import get_user_memberships
from app.users.models import User

settings = get_settings()
router = APIRouter(tags=["auth"])

REFRESH_MAX_AGE = settings.refresh_token_expire_days * 24 * 3600


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authentifie un utilisateur et ouvre une session.
    Rate limité (5/min) contre le brute force (voir STANDARDS §12.1).
    """
    user = await auth_service.authenticate_user(db, body.email, body.password)

    access_token = create_access_token(user.id)
    raw_refresh = await auth_service.issue_refresh_token(
        db,
        user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    set_refresh_cookie(response, raw_refresh, REFRESH_MAX_AGE)
    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(user))


@router.post("/register", response_model=TokenResponse)
@limiter.limit("3/minute")
async def register(
    request: Request,
    response: Response,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Inscription avec création automatique d'un club (MVP).
    - Crée l'utilisateur
    - Crée un club (nom personnalisé ou "Mon Club" par défaut)
    - Assigne l'utilisateur comme HEAD_COACH
    """
    user = await auth_service.register_user_with_club(
        db,
        email=body.email,
        password=body.password,
        nom=body.nom,
        prenom=body.prenom,
        club_nom=body.club_nom,
    )

    access_token = create_access_token(user.id)
    raw_refresh = await auth_service.issue_refresh_token(
        db,
        user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    set_refresh_cookie(response, raw_refresh, REFRESH_MAX_AGE)
    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(user))


@router.post("/refresh")
async def refresh(request: Request, db: AsyncSession = Depends(get_db)):
    """Renouvelle l'access token à partir du refresh token (cookie httpOnly)."""
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_token:
        raise AuthenticationError("Session invalide.")

    refresh_obj = await auth_service.validate_refresh_token(db, raw_token)
    user = await db.get(User, refresh_obj.user_id)
    if user is None or not user.is_active:
        raise AuthenticationError("Compte invalide.")

    access_token = create_access_token(user.id)
    await db.commit()
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Révoque le refresh token (déconnexion)."""
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_token:
        await auth_service.revoke_refresh_token(db, raw_token)
        await db.commit()
    clear_refresh_cookie(response)
    return {"message": "Déconnecté."}


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retourne l'utilisateur actuellement connecté avec son contexte club (MVP).
    Auto-resout le club_id pour simplifier le frontend.
    """
    memberships = await get_user_memberships(db, current_user.id)
    primary = memberships[0] if memberships else None

    return MeResponse(
        **UserResponse.model_validate(current_user).model_dump(),
        club_id=primary.club_id if primary else None,
        club_nom=primary.club.nom if primary and primary.club else None,
        is_multi_club=len(memberships) > 1,
    )
