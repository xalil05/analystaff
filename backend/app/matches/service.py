"""
Logique métier du module matchs et plateau tactique.
"""
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clubs.models import Season
from app.core.enums import LineupStatut, MatchStatut
from app.core.errors import ConflictError, NotFoundError, PermissionDeniedError, ValidationError
from app.matches.models import Formation, LineupPlayer, Match, MatchTacticalSetup, Substitution
from app.matches.schemas import MatchCreate, MatchUpdate, SubstitutionCreate, TacticalSetupSave
from app.players.models import Player
from app.teams.models import Team

# RÈGLE MÉTIER : une équipe de football compte 11 joueurs sur le terrain.
STARTERS_COUNT = 11


async def create_match(
    db: AsyncSession,
    club_id: int,
    data: MatchCreate,
    created_by: int,
    *,
    commit: bool = True,
) -> Match:
    """Crée un match. En mode pilote, team_id et season_id sont auto-gérés.
    Le commit est effectué par défaut ; passez commit=False si le router
    veut gérer la validation de session.
    """
    from app.core.config import get_settings

    settings = get_settings()

    # --- Saison : auto-injectée si désactivée ---
    if settings.enable_seasons:
        season = (
            await db.execute(
                select(Season).where(Season.id == data.season_id).where(Season.club_id == club_id)
            )
        ).scalar_one_or_none()
        if season is None:
            raise ValidationError("Cette saison n'appartient pas au club.")
        season_id = data.season_id
    else:
        # Mode pilote : on récupère ou crée la saison active du club
        season_result = await db.execute(
            select(Season).where(Season.club_id == club_id).where(Season.is_active.is_(True))
        )
        season_row = season_result.scalar_one_or_none()
        if season_row is None:
            # Création automatique d'une saison par défaut
            from datetime import date

            today = date.today()
            default_season = Season(
                club_id=club_id,
                label=f"{today.year}-{today.year + 1}",
                date_debut=date(today.year, 1, 1),
                is_active=True,
            )
            db.add(default_season)
            await db.flush()
            season_id = default_season.id
        else:
            season_id = season_row.id

    # --- Équipe : NULL en mode pilote ---
    if settings.enable_multi_team:
        team = (
            await db.execute(
                select(Team).where(Team.id == data.team_id).where(Team.club_id == club_id)
            )
        ).scalar_one_or_none()
        if team is None:
            raise ValidationError("Cette équipe n'appartient pas au club.")
        team_id = data.team_id
    else:
        team_id = None  # Pilote : pas de catégorie

    # Si le score est déjà renseigné, le match est considéré comme terminé.
    statut: MatchStatut = (
        MatchStatut.termine
        if data.score_equipe is not None and data.score_adversaire is not None
        else MatchStatut.programme
    )

    match = Match(
        club_id=club_id,
        team_id=team_id,
        season_id=season_id,
        adversaire=data.adversaire,
        competition=data.competition,
        is_domicile=data.is_domicile,
        date_match=data.date_match,
        lieu=data.lieu,
        score_equipe=data.score_equipe,
        score_adversaire=data.score_adversaire,
        statut=statut,
        created_by=created_by,
    )
    db.add(match)
    if commit:
        await db.commit()
    return match


async def get_match(db: AsyncSession, club_id: int, match_id: int) -> Match:
    """SÉCURITÉ : isolation par club (anti-IDOR)."""
    stmt = select(Match).where(Match.id == match_id).where(Match.club_id == club_id)
    match = (await db.execute(stmt)).scalar_one_or_none()
    if match is None:
        raise NotFoundError("Ce match n'existe pas.")
    return match


async def list_matches(
    db: AsyncSession,
    club_id: int,
    team_id: int | None = None,
    season_id: int | None = None,
    statut: MatchStatut | None = None,
) -> list[Match]:
    stmt = select(Match).where(Match.club_id == club_id)
    if team_id is not None:
        stmt = stmt.where(Match.team_id == team_id)
    if season_id is not None:
        stmt = stmt.where(Match.season_id == season_id)
    if statut is not None:
        stmt = stmt.where(Match.statut == statut)
    stmt = stmt.order_by(Match.date_match.desc())
    return list((await db.execute(stmt)).scalars().all())


async def update_match(db: AsyncSession, match: Match, body: MatchUpdate, updated_by: int) -> Match:
    """Met à jour un match. Vérifie les règles métier selon le statut du match.
    Ne fait PAS de commit — le caller (router) doit le faire.
    """
    if match.statut == MatchStatut.archive:
        raise PermissionDeniedError("Un match archivé ne peut pas être modifié.")
    if match.statut == MatchStatut.termine and body.statut is None:
        # Seuls certains champs sont modifiables après un match terminé
        allowed = {"score_equipe", "score_adversaire", "statut"}
        if set(body.model_dump(exclude_unset=True).keys()) - allowed:
            raise PermissionDeniedError("Match terminé : modifications limitées.")
    if match.statut == MatchStatut.termine and body.lineup_data:
        raise PermissionDeniedError("Impossible de modifier la composition d'un match terminé.")
    for field in (
        "adversaire",
        "competition",
        "is_domicile",
        "date_match",
        "lieu",
        "score_equipe",
        "score_adversaire",
        "statut",
    ):
        value = getattr(body, field)
        if value is not None:
            setattr(match, field, value)
    match.updated_by = updated_by
    return match


async def get_tactical_setup(db: AsyncSession, match_id: int) -> MatchTacticalSetup | None:
    """Retourne la composition la plus récente d'un match, ou None."""
    stmt = (
        select(MatchTacticalSetup)
        .where(MatchTacticalSetup.match_id == match_id)
        .order_by(MatchTacticalSetup.created_at.desc())
    )
    return (await db.execute(stmt)).scalars().first()


async def get_setup_players(db: AsyncSession, setup_id: int) -> list[LineupPlayer]:
    stmt = select(LineupPlayer).where(LineupPlayer.match_tactical_setup_id == setup_id)
    return list((await db.execute(stmt)).scalars().all())


async def save_tactical_setup(
    db: AsyncSession, club_id: int, match: Match, data: TacticalSetupSave, user_id: int
) -> MatchTacticalSetup:
    """
    Sauvegarde (ou remplace) la composition complète du plateau tactique.

    RÈGLES MÉTIER :
    - La composition est sauvée en BROUILLON. Seule la validation explicite la fige.
    - Une composition validée ne peut plus être modifiée (verrouillée).
    - Les joueurs doivent appartenir au club, sans doublon.
    Ne fait PAS de commit — le caller (router) doit le faire.
    """
    existing = await get_tactical_setup(db, match.id)
    if existing is not None and existing.statut == LineupStatut.valide:
        raise ConflictError("La composition est validée et ne peut plus être modifiée.")

    # Validation : pas de doublon, et tous les joueurs appartiennent au club.
    player_ids = [p.player_id for p in data.players]
    if len(player_ids) != len(set(player_ids)):
        raise ValidationError("Un joueur ne peut pas apparaître deux fois dans la composition.")
    if player_ids:
        valid_ids = (
            await db.execute(
                select(Player.id).where(Player.id.in_(player_ids)).where(Player.club_id == club_id)
            )
        ).scalars().all()
        if len(valid_ids) != len(set(player_ids)):
            raise ValidationError("Certains joueurs n'appartiennent pas au club.")

    players = data.players
    if not any(p.is_goalkeeper for p in players if p.is_starting):
        raise ValidationError("La composition doit inclure au moins un gardien titulaire.")

    # Résolution de la formation : prédéfinie (formation_id) ou personnalisée (label).
    formation_id = None
    is_custom = False
    if data.formation_id is not None:
        formation = await db.get(Formation, data.formation_id)
        if formation is None:
            raise ValidationError("Formation inconnue.")
        formation_id = formation.id
    elif data.formation_label:
        is_custom = True

    if existing is None:
        setup = MatchTacticalSetup(
            match_id=match.id,
            formation_id=formation_id,
            formation_label=data.formation_label,
            is_custom=is_custom,
            statut=LineupStatut.brouillon,
            notes=data.notes,
            created_by=user_id,
        )
        db.add(setup)
        await db.flush()
    else:
        setup = existing
        setup.formation_id = formation_id
        setup.formation_label = data.formation_label
        setup.is_custom = is_custom
        setup.notes = data.notes
        # Une re-sauvegarde repasse la composition en brouillon.
        setup.statut = LineupStatut.brouillon
        setup.validated_by = None
        setup.validated_at = None
        # Remplacement complet des positions.
        await db.execute(
            delete(LineupPlayer).where(LineupPlayer.match_tactical_setup_id == setup.id)
        )
        await db.flush()

    for p in data.players:
        db.add(
            LineupPlayer(
                match_tactical_setup_id=setup.id,
                player_id=p.player_id,
                is_starting=p.is_starting,
                is_captain=p.is_captain,
                is_goalkeeper=p.is_goalkeeper,
                tactical_role=p.tactical_role,
                position_x=p.position_x,
                position_y=p.position_y,
                substitute_order=p.substitute_order,
            )
        )
    return setup


async def validate_tactical_setup(
    db: AsyncSession, setup: MatchTacticalSetup, user_id: int
) -> MatchTacticalSetup:
    """
    Validation explicite de la composition par le coach.

    RÈGLES MÉTIER (voir DECISIONS_FIGEES.md §10) :
    - exactement 11 titulaires ;
    - au moins un gardien titulaire ;
    - un seul capitaine.
    Ne fait PAS de commit — le caller (router) doit le faire.
    """
    players = await get_setup_players(db, setup.id)
    starters = [p for p in players if p.is_starting]

    if len(starters) != STARTERS_COUNT:
        raise ValidationError(
            f"La composition doit comporter exactement {STARTERS_COUNT} titulaires "
            f"(actuellement {len(starters)})."
        )
    if not any(p.is_goalkeeper for p in starters):
        raise ValidationError("La composition doit comporter au moins un gardien titulaire.")
    if sum(1 for p in starters if p.is_captain) > 1:
        raise ValidationError("Un seul capitaine est autorisé.")

    setup.statut = LineupStatut.valide
    setup.validated_by = user_id
    setup.validated_at = datetime.now(timezone.utc)
    return setup


async def add_substitution(
    db: AsyncSession, club_id: int, match: Match, data: SubstitutionCreate, user_id: int
) -> Substitution:
    """Enregistre un remplacement avec son motif (voir SCHEMA_SQL.md §7.5).
    Ne fait PAS de commit — le caller (router) doit le faire.
    """
    for player_id in (data.player_out_id, data.player_in_id):
        player = (
            await db.execute(
                select(Player).where(Player.id == player_id).where(Player.club_id == club_id)
            )
        ).scalar_one_or_none()
        if player is None:
            raise ValidationError("Un des joueurs n'appartient pas au club.")

    if data.player_out_id == data.player_in_id:
        raise ValidationError("Le joueur entrant et le joueur sortant doivent être différents.")

    substitution = Substitution(
        match_id=match.id,
        player_out_id=data.player_out_id,
        player_in_id=data.player_in_id,
        minute=data.minute,
        motif=data.motif,
        notes=data.notes,
        created_by=user_id,
    )
    db.add(substitution)
    return substitution


async def list_substitutions(db: AsyncSession, match_id: int) -> list[Substitution]:
    stmt = (
        select(Substitution)
        .where(Substitution.match_id == match_id)
        .order_by(Substitution.minute)
    )
    return list((await db.execute(stmt)).scalars().all())
