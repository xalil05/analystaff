"""Configuration du Rate Limiting avec SlowAPI (Conforme ZG-4)."""
from datetime import date, datetime, timezone

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

# ZG-1 : Pas de Redis en V0. On utilise le stockage en mémoire (MemoryStorage).
# Cela suffit pour un monolithe à instance unique (serveur Dell).
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
    default_limits=[]
)

# Quota IA : 100 appels par club et par jour (SPECIFICATIONS_IA §11.2).
IA_DAILY_QUOTA = 100

# Portée du quota IA. Elle DOIT être constante : sans `scope`, slowapi indexe
# le compteur par URL. Comme la route IA contient {action_key}, le club
# obtenait 100 appels par action et par jour (900/jour avec les 9 actions),
# au lieu de 100 appels par jour.
IA_DAILY_SCOPE = "ia:daily"


def utc_today() -> date:
    """Jour UTC courant. Isolé pour que les tests puissent figer la date."""
    return datetime.now(timezone.utc).date()


def resolve_club_id(request: Request) -> int | None:
    """
    club_id de la requête : paramètre de chemin, sinon request.state renseigné
    par la dépendance d'auth, sinon None.

    Le router IA est monté sans {club_id} (MVP, voir main.py) : c'est
    `get_current_club` qui renseigne request.state, et il s'exécute avant le
    contrôle de quota puisque FastAPI résout les dépendances avant d'appeler
    l'endpoint. Un club illisible ne doit jamais faire échouer la requête.
    """
    club_id = request.path_params.get(
        "club_id", getattr(request.state, "club_id", None)
    )
    if club_id is None:
        return None
    try:
        return int(club_id)
    except (TypeError, ValueError):
        return None


def ai_daily_quota_key(request: Request) -> str:
    """
    Clé du compteur quotidien IA : club + jour UTC.

    Le jour UTC fait partie de la clé, donc à 00:00 UTC la clé change et le
    club repart à zéro : le quota est journalier et calé sur UTC, pas une
    fenêtre de 24h ouverte au premier appel de la journée. MemoryStorage purge
    les clés expirées, la clé de la veille ne s'accumule pas.
    """
    jour = utc_today().isoformat()
    club_id = resolve_club_id(request)
    if club_id is None:
        # Club non résolu : impossible d'attribuer le compteur à un club,
        # on isole par IP plutôt que de mutualiser le quota de clubs distincts.
        return f"club:inconnu:{get_remote_address(request)}:{jour}"
    return f"club:{club_id}:{jour}"
