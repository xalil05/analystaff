"""
Données de référence (seed).

Insère les rôles, permissions, associations niveau -> rôles, permissions par
défaut et formations prédéfinies, conformément à SCHEMA_SQL.md §16 et
MATRICE_PERMISSIONS_ET_REGLES_METIER.md §2.

Le script est idempotent : il ne crée pas de doublons s'il est exécuté
plusieurs fois.

Usage :
    python -m app.core.seed
"""
import asyncio
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.ai.models import AiTemplate
from app.core.database import AsyncSessionLocal
from app.core.enums import ClubLevel
from app.core.logging import get_logger
from app.matches.models import Formation
from app.roles.models import Permission, Role, RolePermission, RolesAvailableByLevel

logger = get_logger(__name__)

# Chemin du system prompt central (source de référence : backend/ai/system_prompt.md).
# Résolu depuis ce fichier (app/core/seed.py -> parents[2] = backend/).
SYSTEM_PROMPT_FILE = Path(__file__).resolve().parents[2] / "ai" / "system_prompt.md"


# --- Rôles par défaut (SCHEMA_SQL.md §16.1) ---
ROLES = [
    {"code": "HEAD_COACH", "label": "Coach principal", "levels": ["amateur", "semi_pro", "pro"]},
    {"code": "ASSISTANT_COACH", "label": "Adjoint", "levels": ["amateur", "semi_pro", "pro"]},
    {"code": "GOALKEEPER_COACH", "label": "Coach des gardiens", "levels": ["semi_pro", "pro"]},
    {"code": "FITNESS_COACH", "label": "Préparateur physique", "levels": ["semi_pro", "pro"]},
    {"code": "VIDEO_ANALYST", "label": "Analyste vidéo", "levels": ["semi_pro", "pro"]},
    {"code": "MEDICAL_STAFF", "label": "Staff médical", "levels": ["semi_pro", "pro"]},
    {"code": "DATA_SCIENTIST", "label": "Data scientist / Analyste performance", "levels": ["pro"]},
    {"code": "SCOUT", "label": "Scout", "levels": ["pro"]},
    {"code": "INTENDANT", "label": "Dirigeant / Intendant", "levels": ["amateur", "semi_pro", "pro"]},
    {"code": "KIT_MANAGER", "label": "Kit manager", "levels": ["pro"]},
]


# --- Permissions (MATRICE_PERMISSIONS_ET_REGLES_METIER.md §2) ---
PERMISSIONS = [
    {"code": "VOIR_DONNEES_PHYSIQUES", "label": "Voir les données physiques"},
    {"code": "ECRIRE_DONNEES_PHYSIQUES", "label": "Modifier les données physiques"},
    {"code": "VOIR_DONNEES_MEDICALES", "label": "Voir les données médicales"},
    {"code": "ECRIRE_DONNEES_MEDICALES", "label": "Modifier les données médicales"},
    {"code": "CREER_SEANCE_ENTRAINEMENT", "label": "Créer une séance d'entraînement"},
    {"code": "MODIFIER_SEANCE_ENTRAINEMENT", "label": "Modifier une séance d'entraînement"},
    {"code": "EVALUER_ENTRAINEMENT", "label": "Évaluer un entraînement"},
    {"code": "CREER_PLAN_TRAVAIL", "label": "Créer un plan de travail"},
    {"code": "MODIFIER_PLAN_TRAVAIL", "label": "Modifier un plan de travail"},
    {"code": "CREER_MATCH", "label": "Créer un match"},
    {"code": "MODIFIER_MATCH", "label": "Modifier un match"},
    {"code": "VALIDER_COMPOSITION", "label": "Valider une composition"},
    {"code": "PREPARER_COMPOSITION", "label": "Préparer une composition"},
    {"code": "VALIDER_EVALUATION_MATCH", "label": "Valider une évaluation de match"},
    {"code": "UTILISER_ASSISTANT_IA", "label": "Utiliser l'assistant IA"},
    {"code": "IMPORTER_SEANCE_DU_JOUR", "label": "Importer la séance du jour"},
    {"code": "GERER_STAFF", "label": "Gérer le staff"},
    {"code": "GERER_PERMISSIONS", "label": "Gérer les permissions"},
    {"code": "GERER_PARAMETRES_CLUB", "label": "Gérer les paramètres du club"},
    {"code": "CONSULTER_AUDIT", "label": "Consulter l'audit"},
    {"code": "GERER_JOUEURS", "label": "Gérer les joueurs (effectif)"},
]


# --- Permissions par défaut par rôle ---
# RÈGLE MÉTIER : le coach principal a une supervision totale → toutes les
# permissions. Les autres rôles ne reçoivent que les permissions clairement
# établies comme "par défaut" dans la matrice. Le reste est accordé par
# exception individuelle par le coach (table user_permissions).
HEAD_COACH_PERMISSIONS = [p["code"] for p in PERMISSIONS]
FITNESS_COACH_PERMISSIONS = [
    "VOIR_DONNEES_PHYSIQUES",
    "ECRIRE_DONNEES_PHYSIQUES",
    "CREER_SEANCE_ENTRAINEMENT",
    "MODIFIER_SEANCE_ENTRAINEMENT",
    "EVALUER_ENTRAINEMENT",
    "CREER_PLAN_TRAVAIL",
    "MODIFIER_PLAN_TRAVAIL",
    "UTILISER_ASSISTANT_IA",
]
MEDICAL_STAFF_PERMISSIONS = [
    "VOIR_DONNEES_MEDICALES",
    "ECRIRE_DONNEES_MEDICALES",
]
ROLE_DEFAULT_PERMISSIONS = {
    "HEAD_COACH": HEAD_COACH_PERMISSIONS,
    "FITNESS_COACH": FITNESS_COACH_PERMISSIONS,
    "MEDICAL_STAFF": MEDICAL_STAFF_PERMISSIONS,
}


# --- Formations prédéfinies (SCHEMA_SQL.md §16.3) ---
FORMATIONS = ["4-4-2", "4-3-3", "4-2-3-1", "4-1-4-1", "3-5-2", "3-4-3", "5-3-2", "5-4-1"]

# --- Templates de prompts IA versionnés (ZG-7) ---
# Les variables {xxx} sont injectées par le context_builder.
# Les absentes deviennent "non spécifié" grâce à _SafeDict.
AI_TEMPLATES = {
    "SUGGEST_TRAINING_SESSION": (
        "Propose une séance d'entraînement adaptée au contexte.\n"
        "Contexte :\n"
        "- Niveau du club : {club_level}\n"
        "- Prochain match : {next_match_info}\n"
        "- Charge de travail récente : {recent_workload_summary}\n"
        "- Signaux de fatigue : {fatigue_signals}\n"
        "- Dernières séances : {recent_sessions_summary}\n"
        "Réponds en JSON avec les champs : objective, intensity, duration_minutes, "
        "exercises (liste d'objets avec name et description), target_players, reasoning.\n"
        "Ne pas imposer de décision. Adapter au niveau du club."
    ),
    "SUGGEST_LINEUP": (
        "Propose une composition d'équipe pour le prochain match.\n"
        "Contexte :\n"
        "- Prochain match : {next_match_info}\n"
        "- Derniers matchs : {recent_matches_summary}\n"
        "- Charge de travail : {recent_workload_summary}\n"
        "- Signaux de fatigue : {fatigue_signals}\n"
        "Réponds en JSON avec les champs : formation, starting_players "
        "(liste d'objets avec player_id, position, position_x, position_y), "
        "substitutes, players_to_watch, reasoning.\n"
        "Le coach reste le seul décideur. Signaler les joueurs à risque sans imposer."
    ),
    "ANALYZE_FATIGUE": (
        "Analyse les signaux de fatigue des joueurs.\n"
        "Contexte :\n"
        "- Charge de travail : {recent_workload_summary}\n"
        "- Signaux de fatigue : {fatigue_signals}\n"
        "- Derniers matchs : {recent_matches_summary}\n"
        "Réponds en JSON avec les champs : players_at_risk (liste d'objets avec "
        "player_id, risk_level, reason, recommendation), recommendations, summary.\n"
        "Ne pas diagnostiquer médicalement. Signaler des tendances, pas des certitudes."
    ),
    "SUMMARIZE_WEEK": (
        "Résume la semaine écoulée pour le staff.\n"
        "Contexte :\n"
        "- Dernières séances : {recent_sessions_summary}\n"
        "- Derniers matchs : {recent_matches_summary}\n"
        "- Charge de travail : {recent_workload_summary}\n"
        "Réponds en JSON avec les champs : highlights, concerns, player_performances, "
        "recommendations, summary.\n"
        "Rester factuel. Ne pas extrapoler au-delà des données fournies."
    ),
    "ADAPT_WORKLOAD": (
        "Suggère des ajustements de charge de travail.\n"
        "Contexte :\n"
        "- Charge de travail : {recent_workload_summary}\n"
        "- Signaux de fatigue : {fatigue_signals}\n"
        "- Prochain match : {next_match_info}\n"
        "Réponds en JSON avec les champs : adjustments (liste d'objets avec player_id, "
        "current_workload, suggested_workload, reason), global_recommendation, reasoning.\n"
        "Proposer des ajustements progressifs. Tenir compte du calendrier."
    ),
    "PREPARE_PRE_MATCH": (
        "Prépare une synthèse avant-match.\n"
        "Contexte :\n"
        "- Prochain match : {next_match_info}\n"
        "- Charge de travail : {recent_workload_summary}\n"
        "- Signaux de fatigue : {fatigue_signals}\n"
        "- Dernières séances : {recent_sessions_summary}\n"
        "Réponds en JSON avec les champs : match_context, team_readiness, key_players, "
        "tactical_considerations, recommendations, summary.\n"
        "Rester factuel. Ne pas inventer d'informations sur l'adversaire."
    ),
    "ORGANIZE_WEEK": (
        "Suggère une organisation de la semaine.\n"
        "Contexte :\n"
        "- Prochain match : {next_match_info}\n"
        "- Charge de travail : {recent_workload_summary}\n"
        "- Dernières séances : {recent_sessions_summary}\n"
        "Réponds en JSON avec les champs : weekly_structure (liste d'objets avec day, "
        "activity, focus), focus_areas, rest_recommendations, reasoning.\n"
        "Tenir compte de la charge cumulée. Adapter au niveau du club."
    ),
    "BALANCE_WORKLOAD": (
        "Suggère un équilibrage de la charge de travail entre les joueurs.\n"
        "Contexte :\n"
        "- Charge de travail : {recent_workload_summary}\n"
        "Réponds en JSON avec les champs : overloaded_players, underloaded_players "
        "(listes d'objets avec player_id, current_load, recommendation), "
        "balance_suggestions, reasoning.\n"
        "Signaler les écarts sans dramatiser."
    ),
    "PARSE_UPLOADED_SESSION": (
        "Analyse un document de séance d'entraînement et extrais des informations "
        "structurées. Document : {uploaded_file_content}. Réponds en JSON avec les "
        "champs : objectives, intensity, duration_minutes, work_types, players_concerned, "
        "exercises, planned_workload, remarks, confidence.\n"
        "Ne pas inventer d'informations absentes du document."
    ),
}


async def seed_roles(session: AsyncSession) -> dict[str, int]:
    """Insère les rôles s'ils n'existent pas. Retourne code -> id."""
    role_ids: dict[str, int] = {}
    for role_def in ROLES:
        existing = await session.scalar(select(Role).where(Role.code == role_def["code"]))
        if existing is None:
            role = Role(code=role_def["code"], label=role_def["label"])
            session.add(role)
            await session.flush()
            role_ids[role_def["code"]] = role.id
        else:
            role_ids[role_def["code"]] = existing.id
    return role_ids


async def seed_permissions(session: AsyncSession) -> dict[str, int]:
    """Insère les permissions si elles n'existent pas. Retourne code -> id."""
    perm_ids: dict[str, int] = {}
    for perm_def in PERMISSIONS:
        existing = await session.scalar(
            select(Permission).where(Permission.code == perm_def["code"])
        )
        if existing is None:
            perm = Permission(code=perm_def["code"], label=perm_def["label"])
            session.add(perm)
            await session.flush()
            perm_ids[perm_def["code"]] = perm.id
        else:
            perm_ids[perm_def["code"]] = existing.id
    return perm_ids


async def seed_roles_available_by_level(
    session: AsyncSession, role_ids: dict[str, int]
) -> None:
    """Associe chaque rôle aux niveaux de club qui peuvent l'activer."""
    for role_def in ROLES:
        for level in role_def["levels"]:
            exists = await session.scalar(
                select(RolesAvailableByLevel).where(
                    RolesAvailableByLevel.club_level == ClubLevel(level),
                    RolesAvailableByLevel.role_id == role_ids[role_def["code"]],
                )
            )
            if exists is None:
                session.add(
                    RolesAvailableByLevel(
                        club_level=ClubLevel(level),
                        role_id=role_ids[role_def["code"]],
                    )
                )


async def seed_role_permissions(
    session: AsyncSession, role_ids: dict[str, int], perm_ids: dict[str, int]
) -> None:
    """Attribue les permissions par défaut aux rôles."""
    for role_code, perm_codes in ROLE_DEFAULT_PERMISSIONS.items():
        for perm_code in perm_codes:
            exists = await session.scalar(
                select(RolePermission).where(
                    RolePermission.role_id == role_ids[role_code],
                    RolePermission.permission_id == perm_ids[perm_code],
                )
            )
            if exists is None:
                session.add(
                    RolePermission(
                        role_id=role_ids[role_code],
                        permission_id=perm_ids[perm_code],
                    )
                )


async def seed_formations(session: AsyncSession) -> None:
    """Insère les formations prédéfinies."""
    for code in FORMATIONS:
        existing = await session.scalar(select(Formation).where(Formation.code == code))
        if existing is None:
            session.add(Formation(code=code, label=code, is_preset=True))

async def seed_ai_templates(session: AsyncSession) -> None:
    """
    Insère les templates de prompts IA (version 1) s'ils n'existent pas.
    Idempotent : ne crée pas de doublons si exécuté plusieurs fois.
    """
    for action_key, content in AI_TEMPLATES.items():
        existing = await session.scalar(
            select(AiTemplate)
            .where(AiTemplate.action_key == action_key)
            .where(AiTemplate.version == 1)
        )
        if existing is None:
            session.add(
                AiTemplate(
                    action_key=action_key,
                    version=1,
                    template_content=content,
                    is_active=True,
                )
            )

async def seed_system_prompt(session: AsyncSession) -> None:
    """Insère le system prompt central (action_key='__SYSTEM_PROMPT__', SPECIFICATIONS_IA §4.0).

    Source de référence : backend/ai/system_prompt.md. Idempotent : ne crée
    pas de doublon si la version 1 existe déjà.
    """
    if not SYSTEM_PROMPT_FILE.exists():
        logger.warning("system_prompt.md introuvable : %s — seed du socle IA ignoré.", SYSTEM_PROMPT_FILE)
        return
    content = SYSTEM_PROMPT_FILE.read_text(encoding="utf-8").strip()
    existing = await session.scalar(
        select(AiTemplate)
        .where(AiTemplate.action_key == "__SYSTEM_PROMPT__")
        .where(AiTemplate.version == 1)
    )
    if existing is None:
        session.add(
            AiTemplate(
                action_key="__SYSTEM_PROMPT__",
                version=1,
                template_content=content,
                is_active=True,
            )
        )
        logger.info("System prompt central seedé (action_key=__SYSTEM_PROMPT__, v1).")

async def run_seed() -> None:
    """Exécute le seed complet dans une seule transaction."""
    async with AsyncSessionLocal() as session:
        role_ids = await seed_roles(session)
        perm_ids = await seed_permissions(session)
        await seed_roles_available_by_level(session, role_ids)
        await seed_role_permissions(session, role_ids, perm_ids)
        await seed_formations(session)
        await seed_ai_templates(session) 
        await seed_system_prompt(session)
        await session.commit()
    logger.info("Seed terminé : rôles, permissions, niveaux, formations et templates IA insérés.")


if __name__ == "__main__":
    asyncio.run(run_seed())