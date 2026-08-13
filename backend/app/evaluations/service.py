"""Logique métier des évaluations de match et du calcul pondéré."""
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import Pilier, PosteGroupe
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.evaluations.models import (
    Evaluation,
    MatchEvaluationPillar,
    WeightingMatrix,
    WeightingSnapshot,
)
from app.evaluations.schemas import EvaluationCreate, EvaluationUpdate, WeightingMatrixUpsert
from app.matches.models import Match
from app.players.models import Player

STATUT_BROUILLON = "brouillon"
STATUT_VALIDEE = "validee"

# FALLBACK système : à défaut de matrice club, poids égaux (25 % chacun).
# NOTE HONNÊTE : les valeurs par défaut exactes ne sont pas figées dans les docs.
DEFAULT_WEIGHT = Decimal("25")


def _default_weights() -> dict[Pilier, Decimal]:
    return {pilier: DEFAULT_WEIGHT for pilier in Pilier}


async def get_weighting_matrix(
    db: AsyncSession, club_id: int, poste_groupe: PosteGroupe
) -> WeightingMatrix | None:
    stmt = (
        select(WeightingMatrix)
        .where(WeightingMatrix.club_id == club_id)
        .where(WeightingMatrix.poste_groupe == poste_groupe)
        .where(WeightingMatrix.is_active.is_(True))
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_effective_weights(
    db: AsyncSession, club_id: int, poste_groupe: PosteGroupe
) -> dict[Pilier, Decimal]:
    """Retourne la matrice du club, ou le fallback à poids égaux."""
    matrix = await get_weighting_matrix(db, club_id, poste_groupe)
    if matrix is None:
        return _default_weights()
    return {
        Pilier.physique: matrix.poids_physique,
        Pilier.technique: matrix.poids_technique,
        Pilier.tactique: matrix.poids_tactique,
        Pilier.mental: matrix.poids_mental,
    }


async def upsert_weighting_matrix(
    db: AsyncSession, club_id: int, poste_groupe: PosteGroupe, data: WeightingMatrixUpsert, updated_by: int
) -> WeightingMatrix:
    """Crée ou met à jour la matrice d'un groupe de poste pour un club."""
    matrix = (
        await db.execute(
            select(WeightingMatrix)
            .where(WeightingMatrix.club_id == club_id)
            .where(WeightingMatrix.poste_groupe == poste_groupe)
        )
    ).scalar_one_or_none()

    if matrix is None:
        matrix = WeightingMatrix(club_id=club_id, poste_groupe=poste_groupe)
        db.add(matrix)
        

    matrix.poids_physique = data.poids_physique
    matrix.poids_technique = data.poids_technique
    matrix.poids_tactique = data.poids_tactique
    matrix.poids_mental = data.poids_mental
    matrix.is_active = True
    matrix.updated_by = updated_by
    await db.commit()
    return matrix


async def list_weighting_matrices(db: AsyncSession, club_id: int) -> list[WeightingMatrix]:
    stmt = (
        select(WeightingMatrix)
        .where(WeightingMatrix.club_id == club_id)
        .where(WeightingMatrix.is_active.is_(True))
    )
    return list((await db.execute(stmt)).scalars().all())


def compute_note_globale(
    scored: dict[Pilier, int], weights: dict[Pilier, Decimal]
) -> Decimal:
    """
    Moyenne pondérée sur les piliers renseignés, avec renormalisation.

    RÈGLE : une évaluation peut être partielle. Le calcul porte uniquement sur
    les piliers notés, en renormalisant par la somme de leurs poids.
    """
    total_weight = sum(weights[p] for p in scored)
    if total_weight <= 0:
        raise ValidationError("Impossible de calculer la note : somme des poids nulle.")
    weighted_sum = sum(weights[p] * Decimal(note) for p, note in scored.items())
    return (weighted_sum / total_weight).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def _used_weights(scored: dict[Pilier, int], weights: dict[Pilier, Decimal]) -> dict[Pilier, Decimal]:
    """
    Poids effectivement utilisés : poids de la matrice pour les piliers notés,
    0 pour les piliers non notés. Garantit qu'un recalcul depuis le snapshot
    redonne exactement la note_globale.
    """
    return {pilier: (weights[pilier] if pilier in scored else Decimal("0")) for pilier in Pilier}


async def create_evaluation(
    db: AsyncSession, club_id: int, match: Match, data: EvaluationCreate, created_by: int
) -> Evaluation:
    """
    Crée une évaluation, calcule la note globale et écrit le snapshot de pondération.

    RÈGLES MÉTIER :
    - une seule évaluation par joueur et par match ;
    - le joueur doit appartenir au club ;
    - la note est calculée avec la matrice du club (ou le fallback à poids égaux) ;
    - un snapshot des poids utilisés est écrit (DECISIONS_FIGEES.md §14).
    """
    player = (
        await db.execute(
            select(Player).where(Player.id == data.player_id).where(Player.club_id == club_id)
        )
    ).scalar_one_or_none()
    if player is None:
        raise ValidationError("Ce joueur n'appartient pas au club.")

    existing = (
        await db.execute(
            select(Evaluation)
            .where(Evaluation.match_id == match.id)
            .where(Evaluation.player_id == data.player_id)
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise ConflictError("Ce joueur a déjà une évaluation pour ce match.")

    weights = await get_effective_weights(db, club_id, data.poste_groupe)
    scored = {p.pilier: p.note for p in data.pillars}
    used = _used_weights(scored, weights)
    note_globale = compute_note_globale(scored, weights)

    now = datetime.now(timezone.utc)
    evaluation = Evaluation(
        match_id=match.id,
        player_id=data.player_id,
        note_globale=note_globale,
        poids_physique_utilise=used[Pilier.physique],
        poids_technique_utilise=used[Pilier.technique],
        poids_tactique_utilise=used[Pilier.tactique],
        poids_mental_utilise=used[Pilier.mental],
        statut=STATUT_BROUILLON,
        saisie_hors_ligne=data.saisie_hors_ligne,
        synchronisee=True,
        contexte_saisie=data.contexte_saisie,
        date_saisie_reelle=data.date_saisie_reelle or now,
        date_creation_en_base=now,
        created_by=created_by,
    )
    db.add(evaluation)
    await db.flush()

    for p in data.pillars:
        db.add(MatchEvaluationPillar(evaluation_id=evaluation.id, pilier=p.pilier, note=p.note))

    # Snapshot de pondération (audit).
    db.add(
        WeightingSnapshot(
            evaluation_id=evaluation.id,
            poste_groupe=data.poste_groupe,
            poids_physique=used[Pilier.physique],
            poids_technique=used[Pilier.technique],
            poids_tactique=used[Pilier.tactique],
            poids_mental=used[Pilier.mental],
        )
    )
    await db.commit()
    return evaluation


async def get_evaluation(db: AsyncSession, club_id: int, match_id: int, evaluation_id: int) -> Evaluation:
    """SÉCURITÉ : isolation par club via le match."""
    stmt = (
        select(Evaluation)
        .join(Match, Match.id == Evaluation.match_id)
        .where(Evaluation.id == evaluation_id)
        .where(Evaluation.match_id == match_id)
        .where(Match.club_id == club_id)
    )
    evaluation = (await db.execute(stmt)).scalar_one_or_none()
    if evaluation is None:
        raise NotFoundError("Cette évaluation n'existe pas.")
    return evaluation


async def list_match_evaluations(db: AsyncSession, match_id: int) -> list[Evaluation]:
    stmt = select(Evaluation).where(Evaluation.match_id == match_id)
    return list((await db.execute(stmt)).scalars().all())


async def get_evaluation_pillars(db: AsyncSession, evaluation_id: int) -> list[MatchEvaluationPillar]:
    stmt = select(MatchEvaluationPillar).where(MatchEvaluationPillar.evaluation_id == evaluation_id)
    return list((await db.execute(stmt)).scalars().all())


async def get_evaluation_snapshot(db: AsyncSession, evaluation_id: int) -> WeightingSnapshot | None:
    stmt = select(WeightingSnapshot).where(WeightingSnapshot.evaluation_id == evaluation_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def update_evaluation(
    db: AsyncSession, evaluation: Evaluation, data: EvaluationUpdate, updated_by: int
) -> Evaluation:
    """
    Modifie une évaluation en BROUILLON.

    RÈGLE MÉTIER (DECISIONS_FIGEES.md §14) : les poids utilisés sont figés à la
    création. La modification recalcule la note avec les MÊMES poids (ceux du
    snapshot), jamais avec une matrice qui aurait changé entre-temps.
    """
    if evaluation.statut != STATUT_BROUILLON:
        raise ConflictError("Une évaluation validée ne peut plus être modifiée.")

    # Poids figés depuis le snapshot (ou les colonnes poids_*_utilise).
    weights = {
        Pilier.physique: evaluation.poids_physique_utilise or Decimal("0"),
        Pilier.technique: evaluation.poids_technique_utilise or Decimal("0"),
        Pilier.tactique: evaluation.poids_tactique_utilise or Decimal("0"),
        Pilier.mental: evaluation.poids_mental_utilise or Decimal("0"),
    }

    scored = {p.pilier: p.note for p in data.pillars}
    evaluation.note_globale = compute_note_globale(scored, weights)

    # Remplacement des piliers.
    await db.execute(
        delete(MatchEvaluationPillar).where(MatchEvaluationPillar.evaluation_id == evaluation.id)
    )
    await db.flush()
    for p in data.pillars:
        db.add(MatchEvaluationPillar(evaluation_id=evaluation.id, pilier=p.pilier, note=p.note))

    evaluation.updated_by = updated_by
    await db.commit()
    return evaluation


async def validate_evaluation(db: AsyncSession, evaluation: Evaluation, user_id: int) -> Evaluation:
    """Validation explicite par le coach. FIGE l'évaluation."""
    if evaluation.statut == STATUT_VALIDEE:
        raise ConflictError("Cette évaluation est déjà validée.")
    pillars = await get_evaluation_pillars(db, evaluation.id)
    if not pillars:
        raise ValidationError("Impossible de valider une évaluation sans note de pilier.")
    evaluation.statut = STATUT_VALIDEE
    evaluation.updated_by = user_id
    await db.commit()
    return evaluation