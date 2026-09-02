"""Logique métier du module IA."""
import json
from datetime import datetime, timedelta, timezone

from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.actions import ACTIONS
from app.ai.context_builder import build_context, format_template
from app.ai.deepseek_client import DeepSeekUnavailableError, call_deepseek
from app.ai.models import AiFeedback, AiSuggestion, AiTemplate
from app.core.enums import AiSuggestionStatut, MatchStatut, StaffMemberStatut, TrainingStatut
from app.core.errors import ConflictError, NotFoundError, PermissionDeniedError, ValidationError
from app.matches.models import Match
from app.roles.models import Role, StaffMember
from app.roles.service import has_permission
from app.training.models import TrainingSession
from app.users.models import User


async def get_active_template(db: AsyncSession, action_key: str) -> AiTemplate | None:
    """Retourne le template actif le plus récent pour une action (ZG-7)."""
    stmt = (
        select(AiTemplate)
        .where(AiTemplate.action_key == action_key)
        .where(AiTemplate.is_active.is_(True))
        .order_by(AiTemplate.version.desc())
        .limit(1)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


SYSTEM_PROMPT_ACTION_KEY = "__SYSTEM_PROMPT__"


async def trigger_action(
    db: AsyncSession,
    club_id: int,
    user: User,
    action_key: str,
    pre_generated: bool = False,
    extra_context: dict | None = None,
) -> AiSuggestion:
    """
    Déclenche une action IA : vérifie les permissions, construit le contexte,
    appelle DeepSeek (ou le fallback), valide et stocke la suggestion.

    RÈGLE MÉTIER : l'IA suggère, jamais n'impose. La suggestion est stockée
    avec le statut READY ; le coach l'acceptera, la modifiera ou la rejettera.
    """
    action = ACTIONS.get(action_key)
    if action is None:
        raise NotFoundError("Action IA inconnue.")

    if action_key == "PARSE_UPLOADED_SESSION":
         if not extra_context or "uploaded_file_content" not in extra_context:
            raise ValidationError(
            "L'analyse de séance uploadée nécessite le module fichiers (à venir)."
        )

    # SÉCURITÉ : permissions supplémentaires vérifiées côté backend.
    for permission in action.additional_permissions:
        if not await has_permission(db, user.id, club_id, permission):
            raise PermissionDeniedError("Vous n'avez pas accès à cette ressource.")

    template = await get_active_template(db, action_key)
    if template is None:
        raise NotFoundError(f"Aucun template actif pour l'action {action_key}.")

    # Socle commun (SPECIFICATIONS_IA §4.0) : chargé depuis la base, versionné.
    system_template = await get_active_template(db, SYSTEM_PROMPT_ACTION_KEY)
    system_prompt = (
        system_template.template_content if system_template is not None else None
    )

    context = await build_context(db, club_id)
        # Fusion du contexte additionnel (ex. contenu de fichier uploadé).
    if extra_context:
        context.update(extra_context)
    user_prompt = format_template(template.template_content, context)

    suggestion_content: dict | None = None

    # 1) Tentative DeepSeek.
    try:
        raw = await call_deepseek(
            user_prompt, action.timeout_seconds, system_prompt=system_prompt
        )
        parsed = json.loads(raw)
        if action.response_model is not None:
            validated = action.response_model.model_validate(parsed)
            suggestion_content = validated.model_dump()
        else:
            suggestion_content = parsed
    except (DeepSeekUnavailableError, json.JSONDecodeError, PydanticValidationError):
        suggestion_content = None

    # 2) Fallback dynamique (ZG-8) si DeepSeek a échoué.
    if suggestion_content is None:
        if action.fallback is not None:
            suggestion_content = await action.fallback(db, club_id)
        else:
            raise ValidationError(
                "L'assistant IA est indisponible et aucune règle de secours n'existe "
                "pour cette action. Veuillez réessayer plus tard."
            )

    # Invalider les suggestions pré-générées précédentes (statut OUTDATED).
    if pre_generated:
        await _invalidate_pregenerated(db, club_id, action_key)

    suggestion = AiSuggestion(
        club_id=club_id,
        user_id=user.id,
        action_key=action_key,
        template_version=template.version,
        contexte_utilise=context,
        suggestion_content=suggestion_content,
        statut=AiSuggestionStatut.READY,
        pre_generated=pre_generated,
    )
    db.add(suggestion)
    await db.commit()
    return suggestion


async def _invalidate_pregenerated(db: AsyncSession, club_id: int, action_key: str) -> None:
    """RÈGLE : une nouvelle pré-génération rend les précédentes obsolètes."""
    stmt = (
        update(AiSuggestion)
        .where(AiSuggestion.club_id == club_id)
        .where(AiSuggestion.action_key == action_key)
        .where(AiSuggestion.pre_generated.is_(True))
        .where(AiSuggestion.statut == AiSuggestionStatut.READY)
        .values(statut=AiSuggestionStatut.OUTDATED)
    )
    await db.execute(stmt)


async def list_user_suggestions(
    db: AsyncSession, club_id: int, user_id: int, ready_only: bool = False
) -> list[AiSuggestion]:
    stmt = (
        select(AiSuggestion)
        .where(AiSuggestion.club_id == club_id)
        .where(AiSuggestion.user_id == user_id)
        .order_by(AiSuggestion.created_at.desc())
    )
    if ready_only:
        stmt = stmt.where(AiSuggestion.statut == AiSuggestionStatut.READY)
    return list((await db.execute(stmt)).scalars().all())


async def get_suggestion(db: AsyncSession, club_id: int, suggestion_id: int) -> AiSuggestion:
    """SÉCURITÉ : isolation par club."""
    stmt = (
        select(AiSuggestion)
        .where(AiSuggestion.id == suggestion_id)
        .where(AiSuggestion.club_id == club_id)
    )
    suggestion = (await db.execute(stmt)).scalar_one_or_none()
    if suggestion is None:
        raise NotFoundError("Cette suggestion n'existe pas.")
    return suggestion


async def record_feedback(
    db: AsyncSession, club_id: int, suggestion_id: int, user: User, action: str, details: dict | None
) -> AiSuggestion:
    """
    Stocke le feedback du coach et met à jour le statut de la suggestion.
    RÈGLE : le feedback est systématiquement stocké (voir DECISIONS_FIGEES.md §11).
    """
    suggestion = await get_suggestion(db, club_id, suggestion_id)

    # Seul le destinataire ou le coach principal peut donner un feedback.
    if suggestion.user_id != user.id:
        is_head_coach = (
            await db.execute(
                select(StaffMember)
                .join(Role, Role.id == StaffMember.role_id)
                .where(StaffMember.user_id == user.id)
                .where(StaffMember.club_id == club_id)
                .where(Role.code == "HEAD_COACH")
                .where(StaffMember.statut == StaffMemberStatut.actif)
            )
        ).scalar_one_or_none()
        if is_head_coach is None:
            raise PermissionDeniedError("Vous ne pouvez pas donner un feedback sur cette suggestion.")

    statut_map = {
        "accepted": AiSuggestionStatut.ACCEPTED,
        "modified": AiSuggestionStatut.MODIFIED,
        "rejected": AiSuggestionStatut.REJECTED,
    }
    suggestion.statut = statut_map[action]

    db.add(
        AiFeedback(
            ai_suggestion_id=suggestion.id,
            user_id=user.id,
            action=action,
            modification_details=details,
        )
    )
    await db.commit()
    return suggestion


async def mark_viewed(db: AsyncSession, club_id: int, suggestion_id: int) -> AiSuggestion:
    suggestion = await get_suggestion(db, club_id, suggestion_id)
    if suggestion.statut == AiSuggestionStatut.READY:
        suggestion.statut = AiSuggestionStatut.VIEWED
        await db.commit()
    return suggestion


# --- Pré-génération (ZG-6 : APScheduler) ---


async def _get_head_coach(db: AsyncSession, club_id: int) -> User | None:
    stmt = (
        select(User)
        .join(StaffMember, StaffMember.user_id == User.id)
        .join(Role, Role.id == StaffMember.role_id)
        .where(StaffMember.club_id == club_id)
        .where(Role.code == "HEAD_COACH")
        .where(StaffMember.statut == StaffMemberStatut.actif)
        .limit(1)
    )
    return (await db.execute(stmt)).scalars().first()


async def _safe_trigger(
    db: AsyncSession, club_id: int, user: User, action_key: str
) -> None:
    """Une pré-génération en échec ne doit pas bloquer les autres."""
    try:
        await trigger_action(db, club_id, user, action_key, pre_generated=True)
    except Exception:  # noqa: BLE001 - journalisé, non bloquant
        pass


async def run_pregeneration(db: AsyncSession) -> None:
    """
    Pré-génération planifiée (voir SPECIFICATIONS_IA §8.2).
    - Match dans 24-48h → SUGGEST_LINEUP + PREPARE_PRE_MATCH
    - Séance demain → SUGGEST_TRAINING_SESSION
    - Vendredi → SUMMARIZE_WEEK
    Les suggestions sont destinées au coach principal et affichées à l'ouverture.
    """
    now = datetime.now(timezone.utc)

    # Matchs dans les prochaines 48h.
    matches = (
        await db.execute(
            select(Match)
            .where(Match.date_match > now)
            .where(Match.date_match <= now + timedelta(hours=48))
            .where(Match.statut == MatchStatut.programme)
        )
    ).scalars().all()
    for club_id in {m.club_id for m in matches}:
        coach = await _get_head_coach(db, club_id)
        if coach is not None:
            for action_key in ("SUGGEST_LINEUP", "PREPARE_PRE_MATCH"):
                await _safe_trigger(db, club_id, coach, action_key)

    # Séances planifiées demain.
    tomorrow_start = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_end = tomorrow_start + timedelta(days=1)
    sessions = (
        await db.execute(
            select(TrainingSession)
            .where(TrainingSession.date_seance >= tomorrow_start)
            .where(TrainingSession.date_seance < tomorrow_end)
            .where(TrainingSession.statut == TrainingStatut.planifiee)
        )
    ).scalars().all()
    for club_id in {s.club_id for s in sessions}:
        coach = await _get_head_coach(db, club_id)
        if coach is not None:
            await _safe_trigger(db, club_id, coach, "SUGGEST_TRAINING_SESSION")

    # Synthèse de semaine le vendredi.
    if now.weekday() == 4:
        club_ids = (
            await db.execute(select(Match.club_id).distinct())
        ).scalars().all()
        for club_id in club_ids:
            coach = await _get_head_coach(db, club_id)
            if coach is not None:
                await _safe_trigger(db, club_id, coach, "SUMMARIZE_WEEK")