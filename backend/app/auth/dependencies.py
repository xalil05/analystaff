"""Dépendances d'authentification et d'autorisation."""
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import decode_access_token
from app.core.database import get_db
from app.core.errors import AuthenticationError, PermissionDeniedError, ValidationError
from app.roles.models import StaffMember
from app.roles.service import get_active_membership, get_user_memberships, has_permission
from app.users.models import User


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    """
    Décode l'access token JWT et retourne l'utilisateur actif.
    Lève AuthenticationError si le token est absent, invalide ou expiré.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise AuthenticationError("Authentification requise.")

    token = auth_header.split(" ", 1)[1]
    user_id = decode_access_token(token)

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise AuthenticationError("Utilisateur invalide.")
    return user


async def get_current_club(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> int:
    """
    Auto-resout le club_id pour le MVP.
    Stocke le club_id et club_nom dans request.state.
    """
    memberships = await get_user_memberships(db, current_user.id)

    if not memberships:
        raise ValidationError("Vous n'êtes assigné à aucun club.")

    request.state.club_id = memberships[0].club_id
    request.state.club_nom = memberships[0].club.nom if memberships[0].club else None

    return memberships[0].club_id


async def require_club_member(
    club_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StaffMember:
    """
    Vérifie que l'utilisateur est un membre actif du club.
    Retourne l'adhésion. Lève PermissionDeniedError sinon.
    """
    membership = await get_active_membership(db, current_user.id, club_id)
    if membership is None:
        raise PermissionDeniedError("Vous n'avez pas accès à ce club.")
    return membership


async def require_club_member_mvp(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StaffMember:
    """
    Vérifie l'appartenance au club MVP (auto-resolu depuis request.state).
    Doit être utilisée APRÈS get_current_club dans les routes MVP.
    """
    club_id = getattr(request.state, "club_id", None)
    if club_id is None:
        raise ValidationError("Club non déterminé. Veuillez vous reconnecter.")
    
    membership = await get_active_membership(db, current_user.id, club_id)
    if membership is None:
        raise PermissionDeniedError("Vous n'avez pas accès à ce club.")
    return membership


def require_permission(permission_code: str):
    """
    Fabrique de dépendance vérifiant qu'un utilisateur possède une permission
    pour un club donné.
    """
    async def dependency(
        club_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if not await has_permission(db, current_user.id, club_id, permission_code):
            raise PermissionDeniedError("Vous n'avez pas accès à cette ressource.")
        return current_user

    return dependency


def require_permission_mvp(permission_code: str):
    """
    Fabrique de dépendance pour le MVP.
    Le club_id est récupéré depuis request.state (injecté par get_current_club).
    """
    async def dependency(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        club_id = getattr(request.state, "club_id", None)
        if club_id is None:
            raise ValidationError("Club non déterminé. Veuillez vous reconnecter.")
        if not await has_permission(db, current_user.id, club_id, permission_code):
            raise PermissionDeniedError("Vous n'avez pas accès à cette ressource.")
        return current_user

    return dependency
