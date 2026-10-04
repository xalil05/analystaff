"""Tests Phase 5 : module IA (fallback, permissions, feedback, quota quotidien)."""
from datetime import date

import pytest
from fastapi import Request
from sqlalchemy import func, select

from app.ai.models import AiSuggestion
from app.ai.service import trigger_action
from app.clubs.models import Club
from app.core.enums import ClubLevel, StaffMemberStatut
from app.core.limiter import (
    IA_DAILY_QUOTA,
    ai_daily_quota_key,
    limiter,
    resolve_club_id,
)
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


def _requete_ia(club_id: int | None = None, **extra) -> Request:
    """Requête Starlette minimale pour tester la clé du quota sans le HTTP."""
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/ai/actions/ANALYZE_FATIGUE",
        "headers": [],
        "client": ("203.0.113.7", 4242),
        **extra,
    }
    request = Request(scope)
    if club_id is not None:
        request.state.club_id = club_id
    return request


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


# ============================================================
# QUOTA QUOTIDIEN IA (SPECIFICATIONS_IA §11.2 : 100 appels / club / jour)
# ============================================================

JOUR_UTC_FIGE = date(2026, 1, 15)


@pytest.fixture
def quota_ia(monkeypatch):
    """
    Active le rate limiting (conftest le désactive pour toute la suite) et fige
    le jour UTC, pour que la clé du compteur ne bascule pas en plein test.
    """
    monkeypatch.setattr("app.core.limiter.utc_today", lambda: JOUR_UTC_FIGE)
    etait_actif = limiter.enabled
    limiter.enabled = True
    limiter._storage.reset()
    yield
    limiter._storage.reset()
    limiter.enabled = etait_actif


async def _consommer_le_quota(client, token: str, action_key: str = "ANALYZE_FATIGUE") -> None:
    """Consomme les 100 appels autorisés du jour pour le club du token."""
    headers = {"Authorization": f"Bearer {token}"}
    for numero in range(1, IA_DAILY_QUOTA + 1):
        reponse = await client.post(f"/api/v1/ai/actions/{action_key}", headers=headers)
        assert reponse.status_code == 201, f"appel {numero} : {reponse.status_code}"


@pytest.mark.asyncio
async def test_quota_ia_101e_appel_returns_429(db, client, quota_ia):
    """Le 101e appel IA du jour renvoie un 429 exploitable, pas une 500."""
    club, coach = await _setup_club_with_coach(db, "coach_quota1@test.com")
    token = await _login(client, "coach_quota1@test.com")
    await _consommer_le_quota(client, token)

    reponse = await client.post(
        "/api/v1/ai/actions/ANALYZE_FATIGUE",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert reponse.status_code == 429
    corps = reponse.json()
    assert corps["error_code"] == "IA_QUOTA_EXCEEDED"
    assert f"{IA_DAILY_QUOTA} par jour" in corps["message"]
    assert "00:00 UTC" in corps["message"]
    # Le frontend affiche `detail`, le contrat AnalystaffError expose `message`.
    assert corps["detail"] == corps["message"]
    assert 0 < int(reponse.headers["Retry-After"]) <= 24 * 3600

    # Le quota bloque AVANT l'appel IA : aucune suggestion de plus en base.
    stockees = await db.scalar(
        select(func.count()).select_from(AiSuggestion).where(AiSuggestion.club_id == club.id)
    )
    assert stockees == IA_DAILY_QUOTA


@pytest.mark.asyncio
async def test_quota_ia_est_partage_entre_les_actions(db, client, quota_ia):
    """Le quota est par club et par jour, pas 100 appels par action."""
    club, coach = await _setup_club_with_coach(db, "coach_quota2@test.com")
    token = await _login(client, "coach_quota2@test.com")
    await _consommer_le_quota(client, token, action_key="ANALYZE_FATIGUE")

    autre_action = await client.post(
        "/api/v1/ai/actions/SUMMARIZE_WEEK",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert autre_action.status_code == 429
    assert autre_action.json()["error_code"] == "IA_QUOTA_EXCEEDED"


@pytest.mark.asyncio
async def test_quota_ia_est_compte_par_club(db, client, quota_ia):
    """Un club qui sature son quota ne bloque pas les autres clubs."""
    club_a, _ = await _setup_club_with_coach(db, "coach_quota3a@test.com")
    club_b, _ = await _setup_club_with_coach(db, "coach_quota3b@test.com")
    token_a = await _login(client, "coach_quota3a@test.com")
    await _consommer_le_quota(client, token_a)

    bloque = await client.post(
        "/api/v1/ai/actions/ANALYZE_FATIGUE",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert bloque.status_code == 429

    token_b = await _login(client, "coach_quota3b@test.com")
    libre = await client.post(
        "/api/v1/ai/actions/ANALYZE_FATIGUE",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert libre.status_code == 201


def test_quota_ia_repart_a_zero_le_lendemain_utc(monkeypatch):
    """La clé du compteur contient le jour UTC : remise à zéro à 00:00 UTC."""
    request = _requete_ia(club_id=42)

    monkeypatch.setattr("app.core.limiter.utc_today", lambda: date(2026, 1, 15))
    assert ai_daily_quota_key(request) == "club:42:2026-01-15"

    monkeypatch.setattr("app.core.limiter.utc_today", lambda: date(2026, 1, 16))
    assert ai_daily_quota_key(request) == "club:42:2026-01-16"
    # Un autre club a son propre compteur, le même jour.
    assert ai_daily_quota_key(_requete_ia(club_id=43)) == "club:43:2026-01-16"


def test_cle_quota_ia_resout_le_club_sans_echouer(monkeypatch):
    """Priorité au club_id du chemin, sinon request.state, sinon l'IP isolée."""
    monkeypatch.setattr("app.core.limiter.utc_today", lambda: JOUR_UTC_FIGE)

    assert resolve_club_id(_requete_ia(club_id=7, path_params={"club_id": "9"})) == 9
    assert resolve_club_id(_requete_ia(club_id=7)) == 7
    assert resolve_club_id(_requete_ia()) is None
    # Un club_id illisible ne doit pas faire échouer la requête.
    assert resolve_club_id(_requete_ia(path_params={"club_id": "peut-etre"})) is None
    assert ai_daily_quota_key(_requete_ia()) == "club:inconnu:203.0.113.7:2026-01-15"

