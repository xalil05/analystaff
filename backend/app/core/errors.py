"""
Erreurs standardisées d'Analystaff.

Toute erreur métier hérite de AnalystaffError et produit une réponse
JSON uniforme : { "error_code": "...", "message": "..." }.
Voir STANDARDS_DEVELOPPEMENT.md §8.
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse


class AnalystaffError(Exception):
    """Erreur de base d'Analystaff."""

    error_code: str = "INTERNAL_ERROR"
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR

    def __init__(self, message: str, error_code: str | None = None) -> None:
        self.message = message
        if error_code is not None:
            self.error_code = error_code
        super().__init__(message)


class AuthenticationError(AnalystaffError):
    error_code = "AUTHENTICATION_FAILED"
    status_code = status.HTTP_401_UNAUTHORIZED


class PermissionDeniedError(AnalystaffError):
    error_code = "PERMISSION_DENIED"
    status_code = status.HTTP_403_FORBIDDEN


class NotFoundError(AnalystaffError):
    error_code = "NOT_FOUND"
    status_code = status.HTTP_404_NOT_FOUND


class ValidationError(AnalystaffError):
    error_code = "VALIDATION_ERROR"
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT


class ConflictError(AnalystaffError):
    error_code = "CONFLICT"
    status_code = status.HTTP_409_CONFLICT


def _error_payload(error_code: str, message: str) -> dict:
    return {"error_code": error_code, "message": message}


async def analystaff_error_handler(
    request: Request, exc: AnalystaffError
) -> JSONResponse:
    """Handler FastAPI commun à toutes les erreurs AnalystaffError."""
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_payload(exc.error_code, exc.message),
    )