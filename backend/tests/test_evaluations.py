"""Tests Phase 4D : évaluations de match et calcul pondéré."""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.clubs.models import Club, Season, Team
from app.core.enums import ClubLevel, StaffMemberStatut
from app.core.security import hash_password
from app.evaluations.models import WeightingSnapshot
from app.players.models import Player
from app.roles.models import Role, StaffMember
from app.users.models import User


async def _setup_club(db, coach_email: str):
    club = Club(nom="Club Eval", niveau=ClubLevel.amateur)
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
    db.add(StaffMember(user_id=coach.id, club_id=club.id, role_id=role.id, statut=StaffMemberStatut.actif))
    await db.commit()
    return club, team, season


async def _login(client, email: str) -> str:
    response = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "password123"}
    )
    return response.json()["access_token"]


async def _create_match(client, token, club_id, team_id, season_id) -> int:
    response = await client.post(
        f"/api/v1/clubs/{club_id}/matches",
        json={
            "team_id": team_id,
            "season_id": season_id,
            "adversaire": "FC Test",
            "date_match": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.mark.asyncio
async def test_evaluation_uses_club_matrix(db, client):
    """Le calcul utilise la matrice du club : (40*8+30*6+20*7+10*9)/100 = 7.3."""
    club, team, season = await _setup_club(db, "coach_e1@test.com")
    token = await _login(client, "coach_e1@test.com")
    match_id = await _create_match(client, token, club.id, team.id, season.id)

    player = Player(club_id=club.id, nom="Joueur Matrice")
    db.add(player)
    await db.commit()

    # Matrice personnalisée pour les attaquants.
    matrix_resp = await client.put(
        f"/api/v1/clubs/{club.id}/evaluations/weighting-matrices/attaquant",
        json={"poids_physique": 40, "poids_technique": 30, "poids_tactique": 20, "poids_mental": 10},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert matrix_resp.status_code == 200

    eval_resp = await client.post(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/evaluations",
        json={
            "player_id": player.id,
            "poste_groupe": "attaquant",
            "pillars": [
                {"pilier": "physique", "note": 8},
                {"pilier": "technique", "note": 6},
                {"pilier": "tactique", "note": 7},
                {"pilier": "mental", "note": 9},
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert eval_resp.status_code == 201
    assert eval_resp.json()["note_globale"] == "7.3"
    assert eval_resp.json()["statut"] == "brouillon"


@pytest.mark.asyncio
async def test_evaluation_fallback_equal_weights(db, client):
    """Sans matrice club, fallback à poids égaux : (8+6)/2 = 7.0."""
    club, team, season = await _setup_club(db, "coach_e2@test.com")
    token = await _login(client, "coach_e2@test.com")
    match_id = await _create_match(client, token, club.id, team.id, season.id)

    player = Player(club_id=club.id, nom="Joueur Fallback")
    db.add(player)
    await db.commit()

    eval_resp = await client.post(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/evaluations",
        json={
            "player_id": player.id,
            "poste_groupe": "milieu",
            "pillars": [
                {"pilier": "physique", "note": 8},
                {"pilier": "technique", "note": 6},
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert eval_resp.status_code == 201
    # Évaluation partielle : renormalisation (25*8 + 25*6) / (25+25) = 7.0
    assert eval_resp.json()["note_globale"] == "7.0"


@pytest.mark.asyncio
async def test_snapshot_is_written(db, client):
    """RÈGLE : un snapshot de pondération est écrit (DECISIONS_FIGEES.md §14)."""
    club, team, season = await _setup_club(db, "coach_e3@test.com")
    token = await _login(client, "coach_e3@test.com")
    match_id = await _create_match(client, token, club.id, team.id, season.id)

    player = Player(club_id=club.id, nom="Joueur Snapshot")
    db.add(player)
    await db.commit()

    eval_resp = await client.post(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/evaluations",
        json={
            "player_id": player.id,
            "poste_groupe": "defenseur",
            "pillars": [{"pilier": "physique", "note": 7}],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    evaluation_id = eval_resp.json()["id"]

    snapshot = (
        await db.execute(
            select(WeightingSnapshot).where(WeightingSnapshot.evaluation_id == evaluation_id)
        )
    ).scalar_one()
    assert snapshot.poste_groupe.value == "defenseur"
    # Pilier noté -> poids utilisé ; pilier non noté -> 0.
    assert snapshot.poids_physique == Decimal("25")
    assert snapshot.poids_technique == Decimal("0")


@pytest.mark.asyncio
async def test_duplicate_evaluation_rejected(db, client):
    club, team, season = await _setup_club(db, "coach_e4@test.com")
    token = await _login(client, "coach_e4@test.com")
    match_id = await _create_match(client, token, club.id, team.id, season.id)

    player = Player(club_id=club.id, nom="Joueur Doublon")
    db.add(player)
    await db.commit()

    payload = {
        "player_id": player.id,
        "poste_groupe": "gardien",
        "pillars": [{"pilier": "mental", "note": 8}],
    }
    first = await client.post(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/evaluations",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert first.status_code == 201
    second = await client.post(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/evaluations",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_validate_then_lock(db, client):
    """Validation par le coach, puis verrouillage de l'évaluation."""
    club, team, season = await _setup_club(db, "coach_e5@test.com")
    token = await _login(client, "coach_e5@test.com")
    match_id = await _create_match(client, token, club.id, team.id, season.id)

    player = Player(club_id=club.id, nom="Joueur Valide")
    db.add(player)
    await db.commit()

    eval_resp = await client.post(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/evaluations",
        json={
            "player_id": player.id,
            "poste_groupe": "attaquant",
            "pillars": [{"pilier": "technique", "note": 9}],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    evaluation_id = eval_resp.json()["id"]

    validate = await client.post(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/evaluations/{evaluation_id}/validate",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert validate.status_code == 200
    assert validate.json()["statut"] == "validee"

    # Une évaluation validée ne peut plus être modifiée.
    patch = await client.patch(
        f"/api/v1/clubs/{club.id}/matches/{match_id}/evaluations/{evaluation_id}",
        json={"pillars": [{"pilier": "technique", "note": 5}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch.status_code == 409