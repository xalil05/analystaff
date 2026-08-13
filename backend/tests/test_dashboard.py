"""Tests Phase 7 : tableau de bord, synthèse et export PDF."""
from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.clubs.models import Club, Season, Team
from app.core.enums import ClubLevel, StaffMemberStatut
from app.core.security import hash_password
from app.evaluations.models import Evaluation, MatchEvaluationPillar, WeightingSnapshot
from app.matches.models import Match
from app.players.models import PhysicalProfile, Player
from app.roles.models import Role, StaffMember
from app.users.models import User
from decimal import Decimal


async def _setup_club(db, coach_email: str):
    club = Club(nom="Club Dashboard", niveau=ClubLevel.amateur)
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


async def _create_validated_evaluation(db, match_id, player_id, notes: dict):
    """Crée une évaluation validée avec des notes par pilier."""
    evaluation = Evaluation(
        match_id=match_id,
        player_id=player_id,
        note_globale=Decimal("7.0"),
        poids_physique_utilise=Decimal("25"),
        poids_technique_utilise=Decimal("25"),
        poids_tactique_utilise=Decimal("25"),
        poids_mental_utilise=Decimal("25"),
        statut="validee",
    )
    db.add(evaluation)
    await db.flush()
    for pilier, note in notes.items():
        db.add(MatchEvaluationPillar(evaluation_id=evaluation.id, pilier=pilier, note=note))
    db.add(
        WeightingSnapshot(
            evaluation_id=evaluation.id,
            poste_groupe="attaquant",
            poids_physique=Decimal("25"),
            poids_technique=Decimal("25"),
            poids_tactique=Decimal("25"),
            poids_mental=Decimal("25"),
        )
    )
    await db.commit()
    return evaluation


@pytest.mark.asyncio
async def test_overview(db, client):
    club, team, season = await _setup_club(db, "coach_d1@test.com")
    token = await _login(client, "coach_d1@test.com")

    db.add(Player(club_id=club.id, nom="Joueur 1"))
    await db.commit()

    response = await client.get(
        f"/api/v1/clubs/{club.id}/dashboard/overview",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["player_count"] == 1


@pytest.mark.asyncio
async def test_radar_aggregates_validated_evaluations(db, client):
    """Le radar agrège les piliers des évaluations validées."""
    club, team, season = await _setup_club(db, "coach_d2@test.com")
    token = await _login(client, "coach_d2@test.com")

    player = Player(club_id=club.id, nom="Joueur Radar")
    db.add(player)
    await db.flush()

    match = Match(
        club_id=club.id,
        team_id=team.id,
        season_id=season.id,
        adversaire="FC Test",
        date_match=datetime.now(timezone.utc),
    )
    db.add(match)
    await db.commit()

    await _create_validated_evaluation(
        db, match.id, player.id, {"physique": 8, "technique": 6, "tactique": 7, "mental": 9}
    )

    response = await client.get(
        f"/api/v1/clubs/{club.id}/dashboard/players/{player.id}/radar",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["matches_analyzed"] == 1
    assert body["physique"] == "8.0"
    assert body["technique"] == "6.0"


@pytest.mark.asyncio
async def test_radar_excludes_draft_evaluations(db, client):
    """RÈGLE : les évaluations en brouillon ne sont pas agrégées."""
    club, team, season = await _setup_club(db, "coach_d3@test.com")
    token = await _login(client, "coach_d3@test.com")

    player = Player(club_id=club.id, nom="Joueur Brouillon")
    db.add(player)
    await db.flush()

    match = Match(
        club_id=club.id,
        team_id=team.id,
        season_id=season.id,
        adversaire="FC Test",
        date_match=datetime.now(timezone.utc),
    )
    db.add(match)
    await db.commit()

    # Évaluation en BROUILLON.
    db.add(
        Evaluation(
            match_id=match.id,
            player_id=player.id,
            note_globale=Decimal("5.0"),
            statut="brouillon",
        )
    )
    await db.commit()

    response = await client.get(
        f"/api/v1/clubs/{club.id}/dashboard/players/{player.id}/radar",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["matches_analyzed"] == 0


@pytest.mark.asyncio
async def test_history_returns_validated_evaluations(db, client):
    club, team, season = await _setup_club(db, "coach_d4@test.com")
    token = await _login(client, "coach_d4@test.com")

    player = Player(club_id=club.id, nom="Joueur Historique")
    db.add(player)
    await db.flush()

    match = Match(
        club_id=club.id,
        team_id=team.id,
        season_id=season.id,
        adversaire="FC Test",
        date_match=datetime.now(timezone.utc),
    )
    db.add(match)
    await db.commit()

    await _create_validated_evaluation(db, match.id, player.id, {"technique": 8})

    response = await client.get(
        f"/api/v1/clubs/{club.id}/dashboard/players/{player.id}/history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["entries"]) == 1
    assert body["entries"][0]["adversaire"] == "FC Test"


@pytest.mark.asyncio
async def test_pre_match_summary(db, client):
    club, team, season = await _setup_club(db, "coach_d5@test.com")
    token = await _login(client, "coach_d5@test.com")

    match = Match(
        club_id=club.id,
        team_id=team.id,
        season_id=season.id,
        adversaire="FC Adverse",
        date_match=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.add(match)
    await db.commit()

    response = await client.get(
        f"/api/v1/clubs/{club.id}/dashboard/matches/{match.id}/pre-match",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["adversaire"] == "FC Adverse"
    assert "available_player_count" in body
    assert "fatigue_signals" in body


@pytest.mark.asyncio
async def test_player_pdf_export(db, client):
    """L'export PDF retourne un document PDF valide."""
    club, team, season = await _setup_club(db, "coach_d6@test.com")
    token = await _login(client, "coach_d6@test.com")

    player = Player(club_id=club.id, nom="Joueur PDF")
    db.add(player)
    await db.commit()

    response = await client.get(
        f"/api/v1/clubs/{club.id}/dashboard/players/{player.id}/export-pdf",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    # Signature PDF.
    assert response.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_pdf_excludes_physical_without_permission(db, client):
    """SÉCURITÉ : sans VOIR_DONNEES_PHYSIQUES, la section physique est absente du PDF."""
    club, team, season = await _setup_club(db, "coach_d7@test.com")
    # Créer un intendant (sans permission physique).
    intendant = User(email="intendant_d@test.com", password_hash=hash_password("password123"), nom="Intendant")
    db.add(intendant)
    await db.flush()
    role = (await db.execute(select(Role).where(Role.code == "INTENDANT"))).scalar_one()
    db.add(StaffMember(user_id=intendant.id, club_id=club.id, role_id=role.id, statut=StaffMemberStatut.actif))
    await db.commit()

    player = Player(club_id=club.id, nom="Joueur PDF2")
    db.add(player)
    await db.flush()
    db.add(PhysicalProfile(player_id=player.id, taille_cm=Decimal("180"), poids_kg=Decimal("75")))
    await db.commit()

    token = await _login(client, "intendant_d@test.com")
    response = await client.get(
        f"/api/v1/clubs/{club.id}/dashboard/players/{player.id}/export-pdf",
        headers={"Authorization": f"Bearer {token}"},
    )
    # L'intendant est membre du club : il peut exporter, mais sans section physique.
    assert response.status_code == 200
    content = response.content.decode("latin-1", errors="ignore")
    assert "Taille" not in content