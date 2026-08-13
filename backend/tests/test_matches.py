"""Tests Phase 4B : matchs et plateau tactique."""
from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.clubs.models import Club, Season, Team
from app.core.enums import ClubLevel, StaffMemberStatut
from app.core.security import hash_password
from app.players.models import Player
from app.roles.models import Role, StaffMember
from app.users.models import User


async def _setup_club(db, coach_email: str):
    """Crée un club amateur avec une équipe, une saison et un coach HEAD_COACH."""
    club = Club(nom="Club Match", niveau=ClubLevel.amateur)
    db.add(club)
    await db.flush()

    team = Team(club_id=club.id, nom="Équipe A")
    db.add(team)
    await db.flush()

    season = Season(club_id=club.id, label="2026-2027", date_debut=date(2026, 8, 1), is_active=True)
    db.add(season)
    await db.flush()

    coach = User(email=coach_email, password_hash=hash_password("password123"), nom="Coach")
    db.add(coach)
    await db.flush()

    role = (await db.execute(select(Role).where(Role.code == "HEAD_COACH"))).scalar_one()
    db.add(
        StaffMember(user_id=coach.id, club_id=club.id, role_id=role.id, statut=StaffMemberStatut.actif)
    )
    await db.commit()
    return club, team, season


async def _login(client, email: str) -> str:
    response = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "password123"}
    )
    return response.json()["access_token"]


async def _create_match(client, token: str, club_id: int, team_id: int, season_id: int) -> int:
    response = await client.post(
        f"/api/v1/clubs/{club_id}/matches",
        json={
            "team_id": team_id,
            "season_id": season_id,
            "adversaire": "FC Adverse",
            "date_match": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.mark.asyncio
async def test_create_match_is_programme(db, client):
    club, team, season = await _setup_club(db, "coach_m1@test.com")
    token = await _login(client, "coach_m1@test.com")
    match_id = await _create_match(client, token, club.id, team.id, season.id)

    response = await client.get(
        f"/api/v1/clubs/{club.id}/matches/{match_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["statut"] == "programme"


@pytest.mark.asyncio
async def test_tactical_setup_full_flow(db, client):
    """Sauvegarde d'une composition de 11 joueurs puis validation par le coach."""
    club, team, season = await _setup_club(db, "coach_m2@test.com")
    token = await _login(client, "coach_m2@test.com")
    match_id = await _create_match(client, token, club.id, team.id, season.id)

    # 11 joueurs, dont un gardien et un capitaine.
    players_payload = []
    for i in range(11):
        player = Player(club_id=club.id, nom=f"Joueur {i}")
        db.add(player)
        await db.flush()
        players_payload.append(
            {
                "player_id": player.id,
                "is_starting": True,
                "is_goalkeeper": i == 0,
                "is_captain": i == 1,
                "position_x": 50,
                "position_y": 10 + i,
            }
        )
    await db.commit()

    save = await client.put(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/tactical-setup",
        json={"formation_label": "4-3-3", "players": players_payload},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert save.status_code == 200
    assert save.json()["statut"] == "brouillon"

    validate = await client.post(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/tactical-setup/validate",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert validate.status_code == 200
    assert validate.json()["statut"] == "valide"
    assert validate.json()["validated_by"] is not None


@pytest.mark.asyncio
async def test_validate_fails_without_11_starters(db, client):
    """RÈGLE MÉTIER : la validation exige exactement 11 titulaires."""
    club, team, season = await _setup_club(db, "coach_m3@test.com")
    token = await _login(client, "coach_m3@test.com")
    match_id = await _create_match(client, token, club.id, team.id, season.id)

    # Seulement 5 joueurs.
    players_payload = []
    for i in range(5):
        player = Player(club_id=club.id, nom=f"Joueur {i}")
        db.add(player)
        await db.flush()
        players_payload.append({"player_id": player.id, "is_starting": True, "is_goalkeeper": i == 0})
    await db.commit()

    await client.put(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/tactical-setup",
        json={"players": players_payload},
        headers={"Authorization": f"Bearer {token}"},
    )

    validate = await client.post(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/tactical-setup/validate",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert validate.status_code == 422


@pytest.mark.asyncio
async def test_validated_setup_is_locked(db, client):
    """RÈGLE MÉTIER : une composition validée ne peut plus être modifiée."""
    club, team, season = await _setup_club(db, "coach_m4@test.com")
    token = await _login(client, "coach_m4@test.com")
    match_id = await _create_match(client, token, club.id, team.id, season.id)

    players_payload = []
    for i in range(11):
        player = Player(club_id=club.id, nom=f"Joueur {i}")
        db.add(player)
        await db.flush()
        players_payload.append({"player_id": player.id, "is_starting": True, "is_goalkeeper": i == 0})
    await db.commit()

    await client.put(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/tactical-setup",
        json={"players": players_payload},
        headers={"Authorization": f"Bearer {token}"},
    )

    await client.post(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/tactical-setup/validate",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Tentative de modification après validation.
    re_save = await client.put(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/tactical-setup",
        json={"players": players_payload},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert re_save.status_code == 409


@pytest.mark.asyncio
async def test_substitution(db, client):
    club, team, season = await _setup_club(db, "coach_m5@test.com")
    token = await _login(client, "coach_m5@test.com")
    match_id = await _create_match(client, token, club.id, team.id, season.id)

    out_player = Player(club_id=club.id, nom="Sortant")
    in_player = Player(club_id=club.id, nom="Entrant")
    db.add_all([out_player, in_player])
    await db.commit()

    response = await client.post(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/substitutions",
        json={
            "player_out_id": out_player.id,
            "player_in_id": in_player.id,
            "minute": 65,
            "motif": "fatigue",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    assert response.json()["motif"] == "fatigue"