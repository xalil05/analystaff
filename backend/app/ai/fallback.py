"""
Règles métier de fallback (ZG-8).

RÈGLE FONDAMENTALE : le fallback est DYNAMIQUE — il calcule à partir des
données réelles du club. Jamais de réponses statiques pré-écrites.
Le produit reste utilisable sans IA.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import MatchStatut, SubstitutionMotif, TrainingStatut
from app.matches.models import Match, MatchTacticalSetup, LineupPlayer, Substitution
from app.players.models import PhysicalProfile, Player
from app.training.models import TrainingSession


async def fallback_analyze_fatigue(db: AsyncSession, club_id: int) -> dict:
    """RÈGLE : 3+ remplacements pour fatigue → risque élevé ; 2 → modéré."""
    stmt = (
        select(Substitution.player_out_id, func.count(Substitution.id))
        .join(Match, Match.id == Substitution.match_id)
        .where(Match.club_id == club_id)
        .where(Substitution.motif == SubstitutionMotif.fatigue)
        .group_by(Substitution.player_out_id)
    )
    rows = (await db.execute(stmt)).all()

    players_at_risk = []
    for player_id, count in rows:
        if count >= 3:
            players_at_risk.append(
                {
                    "player_id": str(player_id),
                    "risk_level": "élevé",
                    "reason": f"{count} remplacements pour fatigue",
                    "recommendation": "Envisager une séance de récupération ou du repos.",
                }
            )
        elif count == 2:
            players_at_risk.append(
                {
                    "player_id": str(player_id),
                    "risk_level": "modéré",
                    "reason": f"{count} remplacements pour fatigue",
                    "recommendation": "Surveiller la charge de travail.",
                }
            )

    return {
        "players_at_risk": players_at_risk,
        "recommendations": ["Adapter la charge des joueurs signalés."],
        "summary": f"{len(players_at_risk)} joueur(s) présentent des signaux de fatigue.",
    }


async def fallback_summarize_week(db: AsyncSession, club_id: int) -> dict:
    """Synthèse mécanique de la semaine (7 derniers jours)."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    sessions_done = (
        await db.execute(
            select(func.count(TrainingSession.id))
            .where(TrainingSession.club_id == club_id)
            .where(TrainingSession.date_seance >= week_ago)
            .where(TrainingSession.statut == TrainingStatut.realisee)
        )
    ).scalar_one()

    sessions_cancelled = (
        await db.execute(
            select(func.count(TrainingSession.id))
            .where(TrainingSession.club_id == club_id)
            .where(TrainingSession.date_seance >= week_ago)
            .where(TrainingSession.statut == TrainingStatut.annulee)
        )
    ).scalar_one()

    matches_played = (
        await db.execute(
            select(func.count(Match.id))
            .where(Match.club_id == club_id)
            .where(Match.date_match >= week_ago)
            .where(Match.statut == MatchStatut.termine)
        )
    ).scalar_one()

    return {
        "highlights": [f"{sessions_done} séance(s) réalisée(s)."],
        "concerns": ([f"{sessions_cancelled} séance(s) annulée(s)."] if sessions_cancelled else []),
        "player_performances": [],
        "recommendations": [],
        "summary": f"Semaine : {sessions_done} séance(s) réalisée(s), {matches_played} match(s) joué(s).",
    }


async def fallback_balance_workload(db: AsyncSession, club_id: int) -> dict:
    """Équilibrage mécanique : charge > moyenne + écart → surcharge."""
    stmt = (
        select(PhysicalProfile.player_id, PhysicalProfile.charge_travail)
        .join(Player, Player.id == PhysicalProfile.player_id)
        .where(Player.club_id == club_id)
        .where(PhysicalProfile.charge_travail.is_not(None))
    )
    rows = (await db.execute(stmt)).all()
    if not rows:
        return {
            "overloaded_players": [],
            "underloaded_players": [],
            "balance_suggestions": [],
            "reasoning": "Aucune donnée de charge disponible.",
        }

    charges = [float(charge or 0) for _, charge in rows]
    average = sum(charges) / len(charges)

    overloaded, underloaded = [], []
    for player_id, charge in rows:
        value = float(charge or 0)
        if value > average * 1.3:
            overloaded.append(
                {"player_id": str(player_id), "current_load": str(value), "recommendation": "Réduire la charge."}
            )
        elif value < average * 0.7:
            underloaded.append(
                {"player_id": str(player_id), "current_load": str(value), "recommendation": "Augmenter la charge."}
            )

    return {
        "overloaded_players": overloaded,
        "underloaded_players": underloaded,
        "balance_suggestions": ["Rééquilibrer les charges entre les joueurs."],
        "reasoning": f"Charge moyenne : {average:.1f}.",
    }


async def fallback_suggest_lineup(db: AsyncSession, club_id: int) -> dict:
    """Reprend la dernière composition validée du club."""
    last_setup = (
        await db.execute(
            select(MatchTacticalSetup)
            .join(Match, Match.id == MatchTacticalSetup.match_id)
            .where(Match.club_id == club_id)
            .where(MatchTacticalSetup.statut == "valide")
            .order_by(MatchTacticalSetup.validated_at.desc())
            .limit(1)
        )
    ).scalars().first()

    if last_setup is None:
        return {
            "formation": "",
            "starting_players": [],
            "substitutes": [],
            "players_to_watch": [],
            "reasoning": "Aucune composition validée précédente à réutiliser.",
        }

    players = (
        await db.execute(
            select(LineupPlayer).where(LineupPlayer.match_tactical_setup_id == last_setup.id)
        )
    ).scalars().all()

    starting = [
        {
            "player_id": str(p.player_id),
            "position": "gardien" if p.is_goalkeeper else "",
            "position_x": float(p.position_x or 50),
            "position_y": float(p.position_y or 50),
        }
        for p in players
        if p.is_starting
    ]
    substitutes = [{"player_id": str(p.player_id)} for p in players if not p.is_starting]

    return {
        "formation": last_setup.formation_label or "",
        "starting_players": starting,
        "substitutes": substitutes,
        "players_to_watch": [],
        "reasoning": "Composition reprise du dernier match validé.",
    }

async def fallback_parse_uploaded(db: AsyncSession, club_id: int) -> dict:
    """Fallback : le fichier est stocké mais non analysé (voir SPECIFICATIONS_IA §3.5)."""
    return {
        "objectives": [],
        "intensity": None,
        "duration_minutes": None,
        "work_types": [],
        "players_concerned": [],
        "exercises": [],
        "planned_workload": None,
        "remarks": [
            "Le fichier a été enregistré. L'analyse automatique sera disponible ultérieurement."
        ],
        "confidence": "faible",
    }