"""Tests Phase 5 : module IA (fallback, permissions, feedback)."""
from datetime import date

import pytest
from sqlalchemy import select

from app.ai.service import trigger_action
from app.clubs.models import Club
from app.core.enums import ClubLevel, StaffMemberStatut
from app.core.security import hash_password
from app.roles.models import Role, StaffMember
from app.users.models import User


async def _setup_club_with_coach(db, coach_email: str):
    """Crée un club avec un coach (MVP)."""
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
    """Crée un intendant pour un club."""
    user = User(email=email, password_hash=hash_password("password123"), nom="Intendant")
    db.add(user)
    await db.flush()
    role = (await db.execute(select(Role).where(Role.code == "INTENDANT"))).scalar_one()
    db.add(StaffMember(user_id=user.id, club_id=club.id, role_id=role.id, statut=StaffMemberStatut.actif))
    await db.commit()
    return user


async def _login(client, email: str) -> str:
    """Helper pour logger un utilisateur et retourner le token."""
    response = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "password123"}
    )
    return response.json()["access_token"]


# ============================================================
# TESTS AVEC ROUTES MVP (sans club_id)
# ============================================================

@pytest.mark.asyncio
async def test_analyze_fatigue_uses_fallback_without_api_key_mvp(db, client, monkeypatch):
    """ZG-8 : sans clé DeepSeek, le fallback dynamique prend le relais (MVP)."""
    club, coach = await _setup_club_with_coach(db, "coach_ai1@test.com")
    token = await _login(client, "coach_ai1@test.com")

    response = await client.post(
        "/api/v1/ai/actions/ANALYZE_FATIGUE",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["statut"] == "READY"
    assert "players_at_risk" in body["suggestion_content"]
    assert "summary" in body["suggestion_content"]


@pytest.mark.asyncio
async def test_summarize_week_fallback_mvp(db, client):
    """Test fallback semaine (MVP)."""
    club, coach = await _setup_club_with_coach(db, "coach_ai2@test.com")
    token = await _login(client, "coach_ai2@test.com")

    response = await client.post(
        "/api/v1/ai/actions/SUMMARIZE_WEEK",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    assert "summary" in response.json()["suggestion_content"]


@pytest.mark.asyncio
async def test_intendant_cannot_use_ai_mvp(db, client):
    """PERMISSION : un intendant sans UTILISER_ASSISTANT_IA est refusé (MVP)."""
    club, coach = await _setup_club_with_coach(db, "coach_ai3@test.com")
    await _setup_intendant(db, club, "intendant_ai@test.com")
    token = await _login(client, "intendant_ai@test.com")

    response = await client.post(
        "/api/v1/ai/actions/ANALYZE_FATIGUE",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_unknown_action_returns_404_mvp(db, client):
    """Test action inconnue (MVP)."""
    club, coach = await _setup_club_with_coach(db, "coach_ai4@test.com")
    token = await _login(client, "coach_ai4@test.com")

    response = await client.post(
        "/api/v1/ai/actions/ACTION_INCONNUE",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_feedback_updates_statut_mvp(db, client):
    """Test feedback (MVP)."""
    club, coach = await _setup_club_with_coach(db, "coach_ai5@test.com")
    token = await _login(client, "coach_ai5@test.com")

    created = await client.post(
        "/api/v1/ai/actions/SUMMARIZE_WEEK",
        headers={"Authorization": f"Bearer {token}"},
    )
    suggestion_id = created.json()["id"]

    feedback = await client.post(
        f"/api/v1/ai/suggestions/{suggestion_id}/feedback",
        json={"action": "accepted"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert feedback.status_code == 200
    assert feedback.json()["statut"] == "ACCEPTED"


@pytest.mark.asyncio
async def test_parse_uploaded_session_requires_file_content_mvp(db, client):
    """Test parse session sans fichier (MVP)."""
    club, coach = await _setup_club_with_coach(db, "coach_ai6@test.com")
    token = await _login(client, "coach_ai6@test.com")
    response = await client.post(
        "/api/v1/ai/actions/PARSE_UPLOADED_SESSION",
        headers={"Authorization": f"Bearer {token}"},
    )
    # L'action est disponible mais exige le contenu d'un fichier uploadé.
    assert response.status_code == 422


# ============================================================
# TESTS EXISTANTS (compatibilite)
# ============================================================

@pytest.mark.asyncio
async def test_trigger_action_charges_system_prompt_from_db(db, monkeypatch):
    """SPECIFICATIONS_IA §4.0 : le socle __SYSTEM_PROMPT__ (seedé) est transmis à DeepSeek."""
    club, coach = await _setup_club_with_coach(db, "coach_ai7@test.com")

    captured = {}

    async def fake_call_deepseek(user_prompt, timeout_seconds, system_prompt=None):
        captured["system_prompt"] = system_prompt
        captured["user_prompt"] = user_prompt
        return '{"summary": "ok", "highlights": [], "concerns": [], "player_performances": [], "recommendations": []}'

    monkeypatch.setattr("app.ai.service.call_deepseek", fake_call_deepseek)

    suggestion = await trigger_action(db, club.id, coach, "SUMMARIZE_WEEK")

    assert suggestion.statut.value == "READY"
    assert captured["system_prompt"] is not None
    assert "HORS_DOMAINE" in captured["system_prompt"]
    assert "Garde-fous" in captured["system_prompt"]
    # Le user_prompt = template d'action formaté + contexte injecté.
    assert "Résume la semaine écoulée" in captured["user_prompt"]
    assert "non spécifié" in captured["user_prompt"]
