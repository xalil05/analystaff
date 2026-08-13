"""Construction du contexte injecté dans le prompt."""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clubs.models import Club
from app.core.enums import MatchStatut, SubstitutionMotif
from app.matches.models import Match, Substitution
from app.players.models import PhysicalProfile, Player
from app.training.models import TrainingSession

NOT_SPECIFIED = "non spécifié"


async def build_context(db: AsyncSession, club_id: int) -> dict[str, str]:
    """
    Construit le contexte pour le prompt.
    SÉCURITÉ : les données sont déjà isolées par club_id. Le filtrage fin par
    permission utilisateur est effectué en amont (voir SPECIFICATIONS_IA §5).
    """
    club = await db.get(Club, club_id)
    context: dict[str, str] = {
        "club_name": club.nom,
        "club_level": club.niveau.value,
    }

    now = datetime.now(timezone.utc)

    # Prochain match
    next_match = (
        await db.execute(
            select(Match)
            .where(Match.club_id == club_id)
            .where(Match.date_match > now)
            .where(Match.statut == MatchStatut.programme)
            .order_by(Match.date_match)
            .limit(1)
        )
    ).scalars().first()
    context["next_match_info"] = (
        f"contre {next_match.adversaire} le {next_match.date_match:%d/%m/%Y}"
        if next_match
        else NOT_SPECIFIED
    )

    # Dernières séances
    sessions = (
        await db.execute(
            select(TrainingSession)
            .where(TrainingSession.club_id == club_id)
            .order_by(TrainingSession.date_seance.desc())
            .limit(5)
        )
    ).scalars().all()
    context["recent_sessions_summary"] = (
        "; ".join(f"{s.date_seance:%d/%m} ({s.statut.value})" for s in sessions)
        if sessions
        else NOT_SPECIFIED
    )

    # Derniers matchs
    matches = (
        await db.execute(
            select(Match)
            .where(Match.club_id == club_id)
            .order_by(Match.date_match.desc())
            .limit(5)
        )
    ).scalars().all()
    context["recent_matches_summary"] = (
        "; ".join(
            f"{m.date_match:%d/%m} vs {m.adversaire}"
            + (f" {m.score_equipe}-{m.score_adversaire}" if m.score_equipe is not None else "")
            for m in matches
        )
        if matches
        else NOT_SPECIFIED
    )

    # Charge de travail (top 5)
    workload_rows = (
        await db.execute(
            select(Player.nom, PhysicalProfile.charge_travail)
            .join(PhysicalProfile, PhysicalProfile.player_id == Player.id)
            .where(Player.club_id == club_id)
            .where(PhysicalProfile.charge_travail.is_not(None))
            .order_by(PhysicalProfile.charge_travail.desc())
            .limit(5)
        )
    ).all()
    context["recent_workload_summary"] = (
        "; ".join(f"{nom} : {charge}" for nom, charge in workload_rows)
        if workload_rows
        else NOT_SPECIFIED
    )

    # Signaux de fatigue (remplacements pour fatigue)
    fatigue_rows = (
        await db.execute(
            select(Player.nom)
            .join(Substitution, Substitution.player_out_id == Player.id)
            .join(Match, Match.id == Substitution.match_id)
            .where(Match.club_id == club_id)
            .where(Substitution.motif == SubstitutionMotif.fatigue)
        )
    ).scalars().all()
    context["fatigue_signals"] = (
        ", ".join(sorted(set(fatigue_rows))) if fatigue_rows else NOT_SPECIFIED
    )

    return context


def format_template(template_content: str, context: dict[str, str]) -> str:
    """Injecte le contexte. Les variables manquantes deviennent « non spécifié »."""

    class _SafeDict(dict):
        def __missing__(self, key):  # noqa: ANN001
            return NOT_SPECIFIED

    return template_content.format_map(_SafeDict(context))