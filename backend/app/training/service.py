"""Logique métier du module entraînement."""
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clubs.models import Season, Team
from app.core.enums import Assiduite, TrainingStatut
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.players.models import PhysicalProfile, Player
from app.training.models import TrainingEvaluation, TrainingEvaluationPillar, TrainingSession
from app.training.schemas import TrainingEvaluationCreate, TrainingSessionCreate, TrainingSessionUpdate

# RÈGLE MÉTIER : transitions de statut autorisées pour une séance.
# planifiee -> realisee (séance effectuée) ou annulee (annulation tracée).
# realisee et annulee sont des états terminaux.
VALID_TRANSITIONS = {
    TrainingStatut.planifiee: {TrainingStatut.realisee, TrainingStatut.annulee},
    TrainingStatut.realisee: set(),
    TrainingStatut.annulee: set(),
}


def _validate_transition(current: TrainingStatut, target: TrainingStatut) -> None:
    if target not in VALID_TRANSITIONS.get(current, set()):
        raise ValidationError(
            f"Transition de statut invalide : {current.value} -> {target.value}."
        )


async def create_session(
    db: AsyncSession, club_id: int, data: TrainingSessionCreate, created_by: int
) -> TrainingSession:
    """Crée une séance. Vérifie que l'équipe et la saison appartiennent au club."""
    team = (
        await db.execute(select(Team).where(Team.id == data.team_id).where(Team.club_id == club_id))
    ).scalar_one_or_none()
    if team is None:
        raise ValidationError("Cette équipe n'appartient pas au club.")
    season = (
        await db.execute(
            select(Season).where(Season.id == data.season_id).where(Season.club_id == club_id)
        )
    ).scalar_one_or_none()
    if season is None:
        raise ValidationError("Cette saison n'appartient pas au club.")

    session = TrainingSession(
        club_id=club_id,
        team_id=data.team_id,
        season_id=data.season_id,
        date_seance=data.date_seance,
        lieu=data.lieu,
        objectifs=data.objectifs,
        exercices=data.exercices,
        charge_prevue=data.charge_prevue,
        statut=TrainingStatut.planifiee,
        created_by=created_by,
    )
    db.add(session)
    await db.commit()
    return session


async def get_session(db: AsyncSession, club_id: int, session_id: int) -> TrainingSession:
    """SÉCURITÉ : isolation par club (anti-IDOR)."""
    stmt = (
        select(TrainingSession)
        .where(TrainingSession.id == session_id)
        .where(TrainingSession.club_id == club_id)
    )
    session = (await db.execute(stmt)).scalar_one_or_none()
    if session is None:
        raise NotFoundError("Cette séance n'existe pas.")
    return session


async def list_sessions(
    db: AsyncSession,
    club_id: int,
    team_id: int | None = None,
    statut: TrainingStatut | None = None,
) -> list[TrainingSession]:
    stmt = select(TrainingSession).where(TrainingSession.club_id == club_id)
    if team_id is not None:
        stmt = stmt.where(TrainingSession.team_id == team_id)
    if statut is not None:
        stmt = stmt.where(TrainingSession.statut == statut)
    stmt = stmt.order_by(TrainingSession.date_seance.desc())
    return list((await db.execute(stmt)).scalars().all())


async def update_session(
    db: AsyncSession, session: TrainingSession, data: TrainingSessionUpdate, updated_by: int
) -> TrainingSession:
    if data.statut is not None and data.statut != session.statut:
        _validate_transition(session.statut, data.statut)
        session.statut = data.statut
    for field in ("date_seance", "lieu", "objectifs", "exercices", "charge_prevue"):
        value = getattr(data, field)
        if value is not None:
            setattr(session, field, value)
    session.updated_by = updated_by
    await db.commit()
    return session


async def cancel_session(db: AsyncSession, session: TrainingSession, updated_by: int) -> TrainingSession:
    """
    RÈGLE MÉTIER (matrice §5.4) : l'annulation laisse une trace.
    Pas de suppression silencieuse — le statut passe à « annulee ».
    """
    _validate_transition(session.statut, TrainingStatut.annulee)
    session.statut = TrainingStatut.annulee
    session.updated_by = updated_by
    await db.commit()
    return session


async def _update_workload(db: AsyncSession, player_id: int, rpe: int) -> None:
    """
    RÈGLE MÉTIER (DECISIONS_FIGEES.md §8) : la charge de travail est alimentée
    en continu par les évaluations d'entraînement.

    NOTE HONNÊTE : la formule exacte n'est pas figée dans les documents.
    On accumule ici la charge perçue (RPE) par séance. Voir ROADMAP.
    """
    profile = (
        await db.execute(select(PhysicalProfile).where(PhysicalProfile.player_id == player_id))
    ).scalar_one_or_none()
    if profile is None:
        profile = PhysicalProfile(player_id=player_id, charge_travail=Decimal("0"))
        db.add(profile)
        await db.flush()
    current = profile.charge_travail or Decimal("0")
    profile.charge_travail = current + Decimal(rpe)


async def create_evaluation(
    db: AsyncSession, club_id: int, session: TrainingSession, data: TrainingEvaluationCreate, created_by: int
) -> TrainingEvaluation:
    """
    Saisit une évaluation post-entraînement.

    RÈGLES MÉTIER :
    - impossible sur une séance annulée ;
    - une seule évaluation par joueur et par séance ;
    - auto-transition planifiee -> realisee à la première évaluation ;
    - la charge de travail est mise à jour via le RPE.
    """
    if session.statut == TrainingStatut.annulee:
        raise ValidationError("Impossible d'évaluer une séance annulée.")

    player = (
        await db.execute(
            select(Player).where(Player.id == data.player_id).where(Player.club_id == club_id)
        )
    ).scalar_one_or_none()
    if player is None:
        raise ValidationError("Ce joueur n'appartient pas au club.")

    # Un joueur absent ne peut pas avoir une charge perçue.
    if data.assiduite == Assiduite.absent and data.charge_percue_rpe is not None:
        raise ValidationError("Un joueur absent ne peut pas avoir une charge perçue (RPE).")

    existing = (
        await db.execute(
            select(TrainingEvaluation)
            .where(TrainingEvaluation.training_session_id == session.id)
            .where(TrainingEvaluation.player_id == data.player_id)
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise ConflictError("Ce joueur a déjà été évalué pour cette séance.")

    # Auto-transition : une séance évaluée est considérée comme réalisée.
    if session.statut == TrainingStatut.planifiee:
        session.statut = TrainingStatut.realisee

    now = datetime.now(timezone.utc)
    evaluation = TrainingEvaluation(
        training_session_id=session.id,
        player_id=data.player_id,
        assiduite=data.assiduite,
        charge_percue_rpe=data.charge_percue_rpe,
        saisie_hors_ligne=data.saisie_hors_ligne,
        # Dès que la donnée est en base, elle est par définition synchronisée.
        synchronisee=True,
        contexte_saisie=data.contexte_saisie,
        date_saisie_reelle=data.date_saisie_reelle or now,
        date_creation_en_base=now,
        created_by=created_by,
    )
    db.add(evaluation)
    await db.flush()

    for pillar in data.pillars:
        db.add(
            TrainingEvaluationPillar(
                training_evaluation_id=evaluation.id, pilier=pillar.pilier, note=pillar.note
            )
        )

    if data.charge_percue_rpe is not None:
        await _update_workload(db, data.player_id, data.charge_percue_rpe)

    await db.commit()
    return evaluation


async def get_evaluations_with_pillars(
    db: AsyncSession, session_id: int
) -> list[tuple[TrainingEvaluation, list[TrainingEvaluationPillar]]]:
    """Retourne les évaluations d'une séance avec leurs notes par pilier."""
    evaluations = list(
        (
            await db.execute(
                select(TrainingEvaluation).where(
                    TrainingEvaluation.training_session_id == session_id
                )
            )
        ).scalars().all()
    )
    result = []
    for evaluation in evaluations:
        pillars = list(
            (
                await db.execute(
                    select(TrainingEvaluationPillar).where(
                        TrainingEvaluationPillar.training_evaluation_id == evaluation.id
                    )
                )
            ).scalars().all()
        )
        result.append((evaluation, pillars))
    return result