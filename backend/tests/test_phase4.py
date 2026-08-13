"""Tests Phase 4 : isolation par club et permissions joueurs."""
import pytest
from sqlalchemy import select

from app.clubs.models import Club
from app.core.enums import ClubLevel, StaffMemberStatut
from app.core.security import hash_password
from app.players.models import Player
from app.roles.models import Role, StaffMember
from app.users.models import User


async def _make_user(db, email: str) -> User:
    user = User(email=email, password_hash=hash_password("password123"), nom="Test")
    db.add(user)
    await db.commit()
    return user


async def _make_club_with_coach(db, nom: str, coach_email: str) -> tuple[Club, User]:
    club = Club(nom=nom, niveau=ClubLevel.amateur)
    db.add(club)
    await db.flush()
    coach = await _make_user(db, coach_email)
    role = (await db.execute(select(Role).where(Role.code == "HEAD_COACH"))).scalar_one()
    db.add(StaffMember(user_id=coach.id, club_id=club.id, role_id=role.id, statut=StaffMemberStatut.actif))
    await db.commit()
    return club, coach


@pytest.mark.asyncio
async def test_create_club_makes_creator_head_coach(db, client):
    await _make_user(db, "creator@test.com")
    login = await client.post(
        "/api/v1/auth/login", json={"email": "creator@test.com", "password": "password123"}
    )
    token = login.json()["access_token"]

    response = await client.post(
        "/api/v1/clubs",
        json={"nom": "Mon Club", "niveau": "amateur"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    club_id = response.json()["id"]

    # Le créateur voit son club dans la liste.
    my_clubs = await client.get(
        "/api/v1/clubs", headers={"Authorization": f"Bearer {token}"}
    )
    assert any(c["id"] == club_id for c in my_clubs.json())


@pytest.mark.asyncio
async def test_player_isolation_between_clubs(db, client):
    """ISOLATION : un coach ne peut pas voir les joueurs d'un autre club."""
    club_a, _ = await _make_club_with_coach(db, "Club A", "coach_a@test.com")
    club_b, _ = await _make_club_with_coach(db, "Club B", "coach_b@test.com")

    # Joueur dans le club A.
    db.add(Player(club_id=club_a.id, nom="Joueur A"))
    await db.commit()
    player_a = (
        await db.execute(select(Player).where(Player.nom == "Joueur A"))
    ).scalar_one()

    # Le coach B se connecte et tente d'accéder au joueur du club A.
    login = await client.post(
        "/api/v1/auth/login", json={"email": "coach_b@test.com", "password": "password123"}
    )
    token_b = login.json()["access_token"]

    response = await client.get(
        f"/api/v1/clubs/{club_a.id}/players/{player_a.id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    # Refusé : le coach B n'est pas membre du club A.
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_intendant_cannot_create_player(db, client):
    """PERMISSION : un intendant sans permission GERER_JOUEURS ne peut pas créer de joueur."""
    club, _ = await _make_club_with_coach(db, "Club C", "coach_c@test.com")
    intendant = await _make_user(db, "intendant_c@test.com")
    role = (await db.execute(select(Role).where(Role.code == "INTENDANT"))).scalar_one()
    db.add(StaffMember(user_id=intendant.id, club_id=club.id, role_id=role.id, statut=StaffMemberStatut.actif))
    await db.commit()

    login = await client.post(
        "/api/v1/auth/login", json={"email": "intendant_c@test.com", "password": "password123"}
    )
    token = login.json()["access_token"]

    response = await client.post(
        f"/api/v1/clubs/{club.id}/players",
        json={"nom": "Nouveau Joueur"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_coach_can_create_player(db, client):
    """PERMISSION : le coach principal (GERER_JOUEURS) peut créer un joueur."""
    club, _ = await _make_club_with_coach(db, "Club D", "coach_d@test.com")

    login = await client.post(
        "/api/v1/auth/login", json={"email": "coach_d@test.com", "password": "password123"}
    )
    token = login.json()["access_token"]

    response = await client.post(
        f"/api/v1/clubs/{club.id}/players",
        json={"nom": "Nouveau Joueur", "poste": "Attaquant", "numero": 9},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    assert response.json()["nom"] == "Nouveau Joueur"