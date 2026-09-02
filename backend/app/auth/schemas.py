"""Schémas Pydantic du module authentification."""
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    nom: str
    prenom: str | None


class MeResponse(UserResponse):
    """Réponse enrichie pour GET /me avec contexte club (MVP)."""
    club_id: int | None = None
    club_nom: str | None = None
    is_multi_club: bool = False


class RegisterRequest(BaseModel):
    """Inscription avec création automatique d'un club (MVP)."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    nom: str = Field(min_length=1, max_length=100)
    prenom: str | None = Field(default=None, max_length=100)
    club_nom: str | None = Field(default=None, max_length=150)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse