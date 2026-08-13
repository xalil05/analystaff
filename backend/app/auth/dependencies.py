"""Dépendances d'authentification et d'autorisation."""
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import decode_access_token
from app.core.database import get_db
from app.core.errors import AuthenticationError, PermissionDeniedError
from app.roles.services import has_permission
from app.users.models import User
from app.roles.models import StaffMember
from app.roles.services import get_active_membership


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

def require_permission(permission_code: str):
    """
    Fabrique de dépendance vérifiant qu'un utilisateur possède une permission
    pour un club donné. Le club_id doit être un paramètre de la route.

    Usage :
        @router.get("/clubs/{club_id}/players")
        async def list_players(user=Depends(require_permission("VOIR_JOUEURS"))): ...
    """

    async def dependency(
        club_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        # SÉCURITÉ : vérification systématique côté backend.
        # Jamais confiance au frontend seul (voir STANDARDS §12.1).
        if not await has_permission(db, current_user.id, club_id, permission_code):
            raise PermissionDeniedError("Vous n'avez pas accès à cette ressource.")
        return current_user

    return dependency