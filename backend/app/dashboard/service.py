"""Logique d'agrégation du tableau de bord et de la synthèse."""
from datetime import datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from unittest import result

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clubs.models import Club
from app.core.enums import Pilier, PlayerStatut, SubstitutionMotif
from app.core.errors import NotFoundError
from app.dashboard.schemas import (
    DashboardOverview,
    HistoryEntry,
    PlayerHistoryResponse,
    PreMatchSummary,
    RadarResponse,
)
from app.evaluations.models import Evaluation, MatchEvaluationPillar
from app.matches.models import Match, Substitution
from app.players.models import PhysicalProfile, Player
from app.training.models import TrainingSession

STATUT_VALIDEE = "validee"


async def get_overview(db: AsyncSession, club_id: int) -> DashboardOverview:
    """Vue d'ensemble du club : compteurs et dernier match."""
    player_count = (
        await db.execute(
            select(func.count(Player.id))
            .where(Player.club_id == club_id)
            .where(Player.is_archived.is_(False))
        )
    ).scalar_one()

    match_count = (
        await db.execute(select(func.count(Match.id)).where(Match.club_id == club_id))
    ).scalar_one()

    training_count = (
        await db.execute(
            select(func.count(TrainingSession.id)).where(TrainingSession.club_id == club_id)
        )
    ).scalar_one()

    last_match = (
        await db.execute(
            select(Match)
            .where(Match.club_id == club_id)
            .order_by(Match.date_match.desc())
            .limit(1)
        )
    ).scalars().first()

    last_score = None
    if last_match is not None and last_match.score_equipe is not None:
        last_score = f"{last_match.score_equipe}-{last_match.score_adversaire}"

    return DashboardOverview(
        player_count=player_count,
        match_count=match_count,
        training_session_count=training_count,
        last_match_adversaire=last_match.adversaire if last_match else None,
        last_match_date=last_match.date_match if last_match else None,
        last_match_score=last_score,
    )


async def get_player_radar(
    db: AsyncSession, club_id: int, player_id: int, limit: int = 5
) -> RadarResponse:
    """
    Radar des 4 piliers sur les N dernières évaluations VALIDÉES.
    RÈGLE : seules les évaluations validées par le coach sont agrégées.
    """
    await _ensure_player(db, club_id, player_id)

    # 1. IDs des N dernières évaluations validées du joueur.
    evaluation_ids = (
        await db.execute(
            select(Evaluation.id)
            .where(Evaluation.player_id == player_id)
            .where(Evaluation.statut == STATUT_VALIDEE)
            .order_by(Evaluation.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()

    if not evaluation_ids:
        return RadarResponse(player_id=player_id, matches_analyzed=0)

    # 2. Agrégation des notes par pilier.
    result = await db.execute(
    select(MatchEvaluationPillar.pilier, func.avg(MatchEvaluationPillar.note))
    .where(MatchEvaluationPillar.evaluation_id.in_(evaluation_ids))
    .group_by(MatchEvaluationPillar.pilier)
    )
    pillar_rows = result.all()

    radar = {pilier: None for pilier in Pilier}
    for pilier, avg in pillar_rows:
        radar[pilier] = Decimal(avg).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)

    # 3. Note globale moyenne.
    avg_globale = (
        await db.execute(
            select(func.avg(Evaluation.note_globale)).where(Evaluation.id.in_(evaluation_ids))
        )
    ).scalar_one()

    return RadarResponse(
        player_id=player_id,
        matches_analyzed=len(evaluation_ids),
        physique=radar[Pilier.physique],
        technique=radar[Pilier.technique],
        tactique=radar[Pilier.tactique],
        mental=radar[Pilier.mental],
        note_globale_moyenne=(
            Decimal(avg_globale).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
            if avg_globale is not None
            else None
        ),
    )


async def get_player_history(
    db: AsyncSession, club_id: int, player_id: int
) -> PlayerHistoryResponse:
    """Historique des notes globales d'un joueur, trié par date de match."""
    await _ensure_player(db, club_id, player_id)

    result = await db.execute(
    select(Evaluation, Match)
    .join(Match, Match.id == Evaluation.match_id)
    .where(Evaluation.player_id == player_id)
    .where(Evaluation.statut == STATUT_VALIDEE)
    .where(Match.club_id == club_id)
    .order_by(Match.date_match.desc())
    )
    rows = result.all()

    entries = [
        HistoryEntry(
            evaluation_id=evaluation.id,
            match_id=match.id,
            date_match=match.date_match,
            adversaire=match.adversaire,
            note_globale=evaluation.note_globale,
        )
        for evaluation, match in rows
    ]
    return PlayerHistoryResponse(player_id=player_id, entries=entries)


async def get_pre_match_summary(
    db: AsyncSession, club_id: int, match_id: int
) -> PreMatchSummary:
    """
    Synthèse avant-match : disponibilité, charges, signaux de fatigue,
    moyenne des notes récentes.
    """
    match = (
        await db.execute(select(Match).where(Match.id == match_id).where(Match.club_id == club_id))
    ).scalar_one_or_none()
    if match is None:
        raise NotFoundError("Ce match n'existe pas.")

    now = datetime.now(timezone.utc)
    month_ago = now - timedelta(days=30)

    # Disponibilité des joueurs.
    available = (
        await db.execute(
            select(func.count(Player.id))
            .where(Player.club_id == club_id)
            .where(Player.statut == PlayerStatut.actif)
            .where(Player.is_archived.is_(False))
        )
    ).scalar_one()

    injured = (
        await db.execute(
            select(func.count(Player.id))
            .where(Player.club_id == club_id)
            .where(Player.statut == PlayerStatut.blesse)
        )
    ).scalar_one()

    suspended = (
        await db.execute(
            select(func.count(Player.id))
            .where(Player.club_id == club_id)
            .where(Player.statut == PlayerStatut.suspendu)
        )
    ).scalar_one()

    # Top charges de travail.
    result = await db.execute(
    select(Player.nom, PhysicalProfile.charge_travail)
    .join(PhysicalProfile, PhysicalProfile.player_id == Player.id)
    .where(Player.club_id == club_id)
    .where(PhysicalProfile.charge_travail.is_not(None))
    .order_by(PhysicalProfile.charge_travail.desc())
    .limit(5)
    )
    workload_rows = result.all()
    top_workload = [{"nom": nom, "charge": str(charge)} for nom, charge in workload_rows]

    # Signaux de fatigue (remplacements pour fatigue sur les 30 derniers jours).
    result = await db.execute(
    select(Player.nom)
    .join(Substitution, Substitution.player_out_id == Player.id)
    .join(Match, Match.id == Substitution.match_id)
    .where(Match.club_id == club_id)
    .where(Substitution.motif == SubstitutionMotif.fatigue)
    .where(Match.date_match >= month_ago)
    )
    fatigue_rows = result.scalars().all()
    
    fatigue_signals = sorted(set(fatigue_rows))

    # Moyenne des notes récentes.
    recent_avg = (
        await db.execute(
            select(func.avg(Evaluation.note_globale))
            .join(Match, Match.id == Evaluation.match_id)
            .where(Match.club_id == club_id)
            .where(Evaluation.statut == STATUT_VALIDEE)
            .where(Match.date_match >= month_ago)
        )
    ).scalar_one()

    return PreMatchSummary(
        match_id=match.id,
        adversaire=match.adversaire,
        date_match=match.date_match,
        available_player_count=available,
        injured_player_count=injured,
        suspended_player_count=suspended,
        top_workload=top_workload,
        fatigue_signals=fatigue_signals,
        recent_avg_note=(
            Decimal(recent_avg).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
            if recent_avg is not None
            else None
        ),
    )


async def get_player_export_data(
    db: AsyncSession, club_id: int, player_id: int, include_physical: bool, include_medical: bool
) -> dict:
    """
    Prépare les données du profil joueur pour l'export PDF.
    SÉCURITÉ : les sections physiques/médicales ne sont incluses que si
    l'utilisateur en a la permission (vérifié dans le router).
    """
    player = await _ensure_player(db, club_id, player_id)

    radar = await get_player_radar(db, club_id, player_id)
    history = await get_player_history(db, club_id, player_id)

    data = {
        "identite": {
            "nom": player.nom,
            "prenom": player.prenom,
            "poste": player.poste,
            "numero": player.numero,
        },
        "sportif": {
            "radar": radar,
            "history": history.entries,
        },
        "physique": None,
        "medical": None,
    }

    if include_physical:
        profile = (
            await db.execute(
                select(PhysicalProfile).where(PhysicalProfile.player_id == player_id)
            )
        ).scalar_one_or_none()
        if profile is not None:
            data["physique"] = {
                "taille_cm": profile.taille_cm,
                "poids_kg": profile.poids_kg,
                "imc": profile.imc,
                "charge_travail": profile.charge_travail,
            }

    # NOTE : les données médicales ne sont pas incluses dans le PDF V0
    # pour rester simple. À ajouter si besoin. Voir registre.
    return data


async def get_match_export_data(db: AsyncSession, club_id: int, match_id: int) -> dict:
    """Prépare les données de la synthèse match pour l'export PDF."""
    match = (
        await db.execute(select(Match).where(Match.id == match_id).where(Match.club_id == club_id))
    ).scalar_one_or_none()
    if match is None:
        raise NotFoundError("Ce match n'existe pas.")

    score = (
        f"{match.score_equipe}-{match.score_adversaire}"
        if match.score_equipe is not None
        else "non renseigné"
    )

    return {
        "adversaire": match.adversaire,
        "date_match": match.date_match,
        "competition": match.competition,
        "score": score,
        "statut": match.statut.value,
    }


async def _ensure_player(db: AsyncSession, club_id: int, player_id: int) -> Player:
    """SÉCURITÉ : vérifie l'appartenance du joueur au club (anti-IDOR)."""
    player = (
        await db.execute(
            select(Player).where(Player.id == player_id).where(Player.club_id == club_id)
        )
    ).scalar_one_or_none()
    if player is None:
        raise NotFoundError("Ce joueur n'existe pas.")
    return player