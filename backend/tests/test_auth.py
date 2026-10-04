"""Tests du flow d'authentification (login, refresh, logout, me)."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.auth.models import RefreshToken
from app.auth.service import register_user_with_club
from app.core.security import hash_password
from app.main import app
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


def _client(
    ip: str | None,
    port: int = 51234,
    raise_app_exceptions: bool = True,
) -> AsyncClient:
    """
    Client HTTP dont on contrôle l'IP source exposée par `request.client.host`.

    Le fixture `client` de conftest fige 127.0.0.1 : on construit notre propre
    transport pour injecter une IP arbitraire. `ip=None` reproduit l'absence
    d'information client (scope ASGI "client": None).
    """
    transport = ASGITransport(
        app=app,
        client=None if ip is None else (ip, port),
        raise_app_exceptions=raise_app_exceptions,
    )
    return AsyncClient(transport=transport, base_url="http://test")


def _email_slug(ip: str) -> str:
    """Transforme une IP en partie locale d'email valide et unique."""
    return ip.replace(".", "-").replace(":", "-")


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


# ============================================================
# Ticket #6 — couverture du type PostgreSQL INET (refresh_tokens.ip_address)
#
# Le type INET est posé côté modèle (app/auth/models.py). Ces tests verrouillent
# le comportement observable via l'API : ce qui est écrit, ce qui est refusé et
# ce qui est toléré.
#
# Note : la colonne est annotée Mapped[Optional[str]] mais SQLAlchemy la
# re-hydrate en ipaddress.IPv4Address / IPv6Address (result processor du type
# INET). Les assertions comparent donc via str() pour rester agnostiques.
# ============================================================


async def _refresh_tokens_of(db, user: User) -> list[RefreshToken]:
    """Refresh tokens d'un utilisateur, du plus récent au plus ancien."""
    stmt = (
        select(RefreshToken)
        .where(RefreshToken.user_id == user.id)
        .order_by(RefreshToken.id.desc())
    )
    return list((await db.execute(stmt)).scalars().all())


@pytest.mark.asyncio
@pytest.mark.parametrize("ip", ["203.0.113.42", "10.0.0.1", "2001:db8::1"])
async def test_login_persists_valid_ip_as_inet(db, ip):
    """Cas 1 : une IP valide (v4 ou v6) est acceptée et persistée par l'INET."""
    email = f"inet_valid_{_email_slug(ip)}@test.com"
    user = await _create_user(db, email, club_nom=f"Club INET {_email_slug(ip)}")

    async with _client(ip) as http:
        response = await http.post(
            "/api/v1/auth/login", json={"email": email, "password": "password123"}
        )

    assert response.status_code == 200, response.text
    tokens = await _refresh_tokens_of(db, user)
    assert len(tokens) == 1
    # L'IP est bien enregistrée, et relue comme une adresse IP (pas une chaîne).
    assert tokens[0].ip_address is not None
    assert str(tokens[0].ip_address) == ip


@pytest.mark.asyncio
@pytest.mark.xfail(
    strict=True,
    reason=(
        "BUG PRODUCTION connu (#6) : une IP malformée fait échouer le flush "
        "avec un DBAPIError (asyncpg DataError, SQLSTATE 22000) que rien "
        "n'attrape — l'API renvoie 500 au lieu de 422/400. "
        "Levée à app/auth/service.py:55 (await db.flush()), sans handler dans "
        "app/main.py. Test volontairement attendu-échec STRICT : le corriger "
        "rend ce test XPASS (suite rouge) et impose de retirer ce marqueur."
    ),
)
async def test_login_with_malformed_ip_returns_client_error_not_500(db):
    """
    Cas 2 : une IP invalide doit être rejetée proprement (4xx), jamais en 500,
    et rien ne doit être écrit en base.
    """
    email = "inet_invalid@test.com"
    user = await _create_user(db, email, club_nom="Club INET invalide")

    # raise_app_exceptions=False pour observer le vrai status code renvoyé
    # au client (500 généré par le ServerErrorMiddleware de Starlette).
    async with _client("999.999.999.999", raise_app_exceptions=False) as http:
        response = await http.post(
            "/api/v1/auth/login", json={"email": email, "password": "password123"}
        )

    assert response.status_code != 500, (
        f"IP invalide traitée en erreur serveur : {response.status_code} "
        f"{response.text!r}"
    )
    assert response.status_code in (400, 422), response.text
    # Aucun refresh token ne doit subsister après un refus.
    assert await _refresh_tokens_of(db, user) == []


@pytest.mark.asyncio
async def test_login_without_client_stores_null_ip(db):
    """Cas 3 : sans information client, ip_address reste NULL (nullable=True)."""
    email = "inet_null@test.com"
    user = await _create_user(db, email, club_nom="Club INET null")

    async with _client(None) as http:
        response = await http.post(
            "/api/v1/auth/login", json={"email": email, "password": "password123"}
        )

    assert response.status_code == 200, response.text
    tokens = await _refresh_tokens_of(db, user)
    assert len(tokens) == 1
    assert tokens[0].ip_address is None
