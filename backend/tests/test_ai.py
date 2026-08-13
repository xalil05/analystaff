"""Tests Phase 5 : module IA (fallback, permissions, feedback)."""
from datetime import date

import pytest
from sqlalchemy import select

from app.clubs.models import Club
from app.core.enums import ClubLevel, StaffMemberStatut
from app.core.security import hash_password
from app.roles.models import Role, StaffMember
from app.users.models import User


async def _setup_club_with_coach(db, coach_email: str):
    club = Club(nom="Club IA", niveau=ClubLevel.amateur)
    db.add(club)
    await db.flush()
    coach = User(email=coach_email, password_hash=hash_password("password123"), nom="Coach")
    db.add(coach)
    await db.flush()
    role = (await db.execute(select(Role).where(Role.code == "HEAD_COACH"))).scalar_one()
    db.add(StaffMember(user_id=coach.id, club_id=club.id, role_id=role.id, statut=StaffMemberStatut.actif))
    await db.commit()
    return club, coach


async def _setup_intendant(db, club, email: str):
    user = User(email=email, password_hash=hash_password("password123"), nom="Intendant")
    db.add(user)
    await db.flush()
    role = (await db.execute(select(Role).where(Role.code == "INTENDANT"))).scalar_one()
    db.add(StaffMember(user_id=user.id, club_id=club.id, role_id=role.id, statut=StaffMemberStatut.actif))
    await db.commit()
    return user


async def _login(client, email: str) -> str:
    response = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "password123"}
    )
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_analyze_fatigue_uses_fallback_without_api_key(db, client, monkeypatch):
    """ZG-8 : sans clé DeepSeek, le fallback dynamique prend le relais."""
    club, coach = await _setup_club_with_coach(db, "coach_ai1@test.com")
    token = await _login(client, "coach_ai1@test.com")

    response = await client.post(
        f"/api/v1/clubs/{club.id}/ai/actions/ANALYZE_FATIGUE",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["statut"] == "READY"
    assert "players_at_risk" in body["suggestion_content"]
    assert "summary" in body["suggestion_content"]


@pytest.mark.asyncio
async def test_summarize_week_fallback(db, client):
    club, coach = await _setup_club_with_coach(db, "coach_ai2@test.com")
    token = await _login(client, "coach_ai2@test.com")

    response = await client.post(
        f"/api/v1/clubs/{club.id}/ai/actions/SUMMARIZE_WEEK",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    assert "summary" in response.json()["suggestion_content"]


@pytest.mark.asyncio
async def test_intendant_cannot_use_ai(db, client):
    """PERMISSION : un intendant sans UTILISER_ASSISTANT_IA est refusé."""
    club, coach = await _setup_club_with_coach(db, "coach_ai3@test.com")
    await _setup_intendant(db, club, "intendant_ai@test.com")
    token = await _login(client, "intendant_ai@test.com")

    response = await client.post(
        f"/api/v1/clubs/{club.id}/ai/actions/ANALYZE_FATIGUE",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_unknown_action_returns_404(db, client):
    club, coach = await _setup_club_with_coach(db, "coach_ai4@test.com")
    token = await _login(client, "coach_ai4@test.com")

    response = await client.post(
        f"/api/v1/clubs/{club.id}/ai/actions/ACTION_INCONNUE",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_feedback_updates_statut(db, client):
    club, coach = await _setup_club_with_coach(db, "coach_ai5@test.com")
    token = await _login(client, "coach_ai5@test.com")

    created = await client.post(
        f"/api/v1/clubs/{club.id}/ai/actions/SUMMARIZE_WEEK",
        headers={"Authorization": f"Bearer {token}"},
    )
    suggestion_id = created.json()["id"]

    feedback = await client.post(
        f"/api/v1/clubs/{club.id}/ai/suggestions/{suggestion_id}/feedback",
        json={"action": "accepted"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert feedback.status_code == 200
    assert feedback.json()["statut"] == "ACCEPTED"


@pytest.mark.asyncio
async def test_parse_uploaded_session_requires_file_content(db, client):
    club, coach = await _setup_club_with_coach(db, "coach_ai6@test.com")
    token = await _login(client, "coach_ai6@test.com")
    response = await client.post(
        f"/api/v1/clubs/{club.id}/ai/actions/PARSE_UPLOADED_SESSION",
        headers={"Authorization": f"Bearer {token}"},
    )
    # L'action est disponible mais exige le contenu d'un fichier uploadé.
    assert response.status_code == 422