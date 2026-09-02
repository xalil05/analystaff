"""Tests du flow d'authentification (login, refresh, logout, me)."""
import pytest

from app.auth.service import register_user_with_club
from app.core.security import hash_password
from app.users.models import User


async def _create_user(db, email: str, club_nom: str = "Mon Club Test") -> User:
    """Crée un utilisateur avec un club (MVP)."""
    return await register_user_with_club(
        db,
        email=email,
        password="password123",
        nom="Test",
        prenom="User",
        club_nom=club_nom,
    )


@pytest.mark.asyncio
async def test_login_success_sets_cookie_and_returns_token(db, client):
    await _create_user(db, "login_ok@test.com")
    response = await client.post(
        "/api/v1/auth/login", json={"email": "login_ok@test.com", "password": "password123"}
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "login_ok@test.com"
    # Le cookie de refresh doit être présent.
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(db, client):
    await _create_user(db, "login_bad@test.com")
    response = await client.post(
        "/api/v1/auth/login", json={"email": "login_bad@test.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_authentication(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_with_valid_token(db, client):
    await _create_user(db, "me_ok@test.com", club_nom="Club Me")
    login = await client.post(
        "/api/v1/auth/login", json={"email": "me_ok@test.com", "password": "password123"}
    )
    access_token = login.json()["access_token"]
    response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "me_ok@test.com"
    # MVP : /me retourne aussi le club
    assert body["club_id"] is not None
    assert body["club_nom"] == "Club Me"
    assert body["is_multi_club"] is False


@pytest.mark.asyncio
async def test_refresh_flow(db, client):
    await _create_user(db, "refresh_ok@test.com")
    await client.post(
        "/api/v1/auth/login", json={"email": "refresh_ok@test.com", "password": "password123"}
    )
    # Le client httpx conserve le cookie de refresh entre les requêtes.
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_logout_revokes_refresh_token(db, client):
    await _create_user(db, "logout_ok@test.com")
    await client.post(
        "/api/v1/auth/login", json={"email": "logout_ok@test.com", "password": "password123"}
    )
    logout = await client.post("/api/v1/auth/logout")
    assert logout.status_code == 200

    # Après logout, le refresh token est révoqué : le refresh doit échouer.
    refresh = await client.post("/api/v1/auth/refresh")
    assert refresh.status_code == 401
