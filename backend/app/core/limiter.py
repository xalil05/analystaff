"""Configuration du Rate Limiting avec SlowAPI (Conforme ZG-4)."""
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

# ZG-1 : Pas de Redis en V0. On utilise le stockage en mémoire (MemoryStorage).
# Cela suffit pour un monolithe à instance unique (serveur Dell).
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
    default_limits=[]
)

def get_club_id_key(request: Request) -> str:
    """
    Génère une clé de rate limiting basée sur l'ID du club.
    Priorité : paramètre de chemin 'club_id' > request.state.club_id > fallback IP.
    """
    # 1. Essayer de récupérer depuis les paramètres de chemin (ex: /clubs/{club_id}/ai/...)
    path_params = request.path_params
    if "club_id" in path_params:
        return f"club:{path_params['club_id']}"
    
    # 2. Essayer de récupérer depuis le state (injecté par une dépendance d'auth/club)
    if hasattr(request.state, "club_id"):
        return f"club:{request.state.club_id}"
    
    # 3. Fallback de sécurité sur l'IP si le club_id est introuvable
    return f"ip:{get_remote_address(request)}"