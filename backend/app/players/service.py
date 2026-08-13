"""Logique métier du module joueurs."""
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.players.models import MedicalRecord, PhysicalProfile, Player
from app.players.schemas import (
    MedicalRecordCreate,
    PhysicalProfileUpdate,
    PlayerCreate,
    PlayerUpdate,
)


async def create_player(
    db: AsyncSession, club_id: int, player_in: PlayerCreate, created_by: int
) -> Player:
    player = Player(
        club_id=club_id,
        nom=player_in.nom,
        prenom=player_in.prenom,
        poste=player_in.poste,
        numero=player_in.numero,
        date_naissance=player_in.date_naissance,
        team_id=player_in.team_id,
        statut=player_in.statut,
        created_by=created_by,
    )
    db.add(player)
    await db.commit()
    return player


async def get_player(db: AsyncSession, club_id: int, player_id: int) -> Player:
    """
    SÉCURITÉ : vérifie l'isolation par club (anti-IDOR).
    Un joueur d'un autre club n'est jamais retourné.
    """
    stmt = (
        select(Player)
        .where(Player.id == player_id)
        .where(Player.club_id == club_id)
        .where(Player.is_archived.is_(False))
    )
    player = (await db.execute(stmt)).scalar_one_or_none()
    if player is None:
        raise NotFoundError("Ce joueur n'existe pas.")
    return player


async def list_players(
    db: AsyncSession,
    club_id: int,
    statut=None,
    team_id: int | None = None,
    page: int = 1,
    limit: int = 20,
) -> list[Player]:
    stmt = select(Player).where(Player.club_id == club_id).where(Player.is_archived.is_(False))
    if statut is not None:
        stmt = stmt.where(Player.statut == statut)
    if team_id is not None:
        stmt = stmt.where(Player.team_id == team_id)
    stmt = stmt.order_by(Player.nom).offset((page - 1) * limit).limit(limit)
    return list((await db.execute(stmt)).scalars().all())


async def update_player(
    db: AsyncSession, player: Player, player_in: PlayerUpdate, updated_by: int
) -> Player:
    for field in ("nom", "prenom", "poste", "numero", "date_naissance", "team_id", "statut"):
        value = getattr(player_in, field)
        if value is not None:
            setattr(player, field, value)
    player.updated_by = updated_by
    await db.commit()
    return player


async def archive_player(db: AsyncSession, player: Player, updated_by: int) -> None:
    """SÉCURITÉ : soft delete. Pas de suppression définitive (voir SCHEMA_SQL.md §1.5)."""
    player.is_archived = True
    player.updated_by = updated_by
    await db.commit()


def _compute_imc(taille_cm: Decimal, poids_kg: Decimal) -> Decimal:
    taille_m = taille_cm / Decimal(100)
    return (poids_kg / (taille_m * taille_m)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


async def get_physical_profile(db: AsyncSession, player_id: int) -> PhysicalProfile | None:
    stmt = select(PhysicalProfile).where(PhysicalProfile.player_id == player_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def upsert_physical_profile(
    db: AsyncSession, player_id: int, data: PhysicalProfileUpdate, updated_by: int
) -> PhysicalProfile:
    """
    Crée ou met à jour le profil physique. L'IMC est recalculé si taille et
    poids sont disponibles.
    """
    profile = await get_physical_profile(db, player_id)
    if profile is None:
        profile = PhysicalProfile(player_id=player_id)
        db.add(profile)
        await db.flush()
    if data.taille_cm is not None:
        profile.taille_cm = data.taille_cm
    if data.poids_kg is not None:
        profile.poids_kg = data.poids_kg
    if profile.taille_cm and profile.poids_kg:
        profile.imc = _compute_imc(profile.taille_cm, profile.poids_kg)
    profile.updated_by = updated_by
    await db.commit()
    return profile


async def list_medical_records(db: AsyncSession, player_id: int) -> list[MedicalRecord]:
    stmt = (
        select(MedicalRecord)
        .where(MedicalRecord.player_id == player_id)
        .order_by(MedicalRecord.created_at.desc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def add_medical_record(
    db: AsyncSession, player_id: int, data: MedicalRecordCreate, created_by: int
) -> MedicalRecord:
    """
    CDP : les données médicales sont sensibles. L'accès est contrôlé par la
    permission ECRIRE_DONNEES_MEDICALES (voir DECISIONS_FIGEES.md).
    """
    record = MedicalRecord(
        player_id=player_id,
        type=data.type,
        description=data.description,
        date_debut=data.date_debut,
        date_fin=data.date_fin,
        statut=data.statut,
        created_by=created_by,
    )
    db.add(record)
    await db.commit()
    return record