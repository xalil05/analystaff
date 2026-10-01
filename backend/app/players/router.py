"""Endpoints du module joueurs."""
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_club_member, require_permission
from app.core.database import get_db
from app.core.enums import PlayerStatut
from app.players import service as player_service
from app.players.importer import parse_csv
from app.players.schemas import (
    ImportLigneRejetee,
    ImportPlayersResponse,
    MedicalRecordCreate,
    MedicalRecordResponse,
    PhysicalProfileResponse,
    PhysicalProfileUpdate,
    PlayerCreate,
    PlayerResponse,
    PlayerUpdate,
)
from app.users.models import User

router = APIRouter(tags=["players"])

#: Un effectif de club tient largement sous cette taille. Au-delà, le fichier
#: est suspect (mauvais séparateur, export d'un autre outil).
_TAILLE_MAX = 2 * 1024 * 1024  # 2 Mo


@router.post("/{club_id}/players", response_model=PlayerResponse, status_code=201)
async def create_player(
    club_id: int,
    body: PlayerCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("GERER_JOUEURS")),
):
    return await player_service.create_player(db, club_id, body, user.id)


@router.post(
    "/{club_id}/players/import",
    response_model=ImportPlayersResponse,
    status_code=201,
)
async def import_players(
    club_id: int,
    fichier: UploadFile = File(..., description="CSV d'effectif"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("GERER_JOUEURS")),
):
    """
    Importe un effectif depuis un CSV.

    Le format de référence est template_import_joueurs.csv (virgule ou
    point-virgule, dates JJ/MM/AAAA). Les lignes invalides sont signalées
    ligne par ligne et n'empêchent pas le reste de l'import ; l'insertion
    elle-même est atomique.

    Répond 201 même avec des rejets : un fichier partiellement invalide est un
    résultat normal, pas une erreur HTTP.
    """
    contenu = await fichier.read()
    if len(contenu) > _TAILLE_MAX:
        raise HTTPException(
            status_code=413,
            detail=f"Fichier trop volumineux ({len(contenu)} octets, max {_TAILLE_MAX}).",
        )

    # Décodage tolérant : un CSV exporté par un tableur est souvent en
    # Windows-1252. Un fichier illisible est rejeté proprement plutôt que
    # de remonter une UnicodeDecodeError.
    try:
        texte = contenu.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            texte = contenu.decode("latin-1")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400, detail="Fichier illisible (encodage inconnu)."
            )

    resultat = parse_csv(texte)

    # Une colonne « Nom » absente signifie qu'on n'a pas compris le fichier :
    # c'est une erreur, pas un import vide.
    if not resultat.acceptes and len(resultat.rejetes) == 1 and not resultat.colonnes_ignorees:
        unique = resultat.rejetes[0]
        if unique.ligne == 1 and "Nom" in unique.raison:
            raise HTTPException(status_code=400, detail=unique.raison)

    await player_service.import_players(db, club_id, resultat.acceptes, user.id)

    return ImportPlayersResponse(
        importes=len(resultat.acceptes),
        rejetes=[
            ImportLigneRejetee(ligne=r.ligne, nom=r.nom, raison=r.raison)
            for r in resultat.rejetes
        ],
        colonnes_ignorees=resultat.colonnes_ignorees,
        colonnes_inconnues=resultat.colonnes_inconnues,
    )


@router.get("/{club_id}/players", response_model=list[PlayerResponse])
async def list_players(
    club_id: int,
    statut: PlayerStatut | None = None,
    team_id: int | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await player_service.list_players(db, club_id, statut, team_id, page, limit)


@router.get("/{club_id}/players/{player_id}", response_model=PlayerResponse)
async def get_player(
    club_id: int,
    player_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await player_service.get_player(db, club_id, player_id)


@router.patch("/{club_id}/players/{player_id}", response_model=PlayerResponse)
async def update_player(
    club_id: int,
    player_id: int,
    body: PlayerUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("GERER_JOUEURS")),
):
    player = await player_service.get_player(db, club_id, player_id)
    return await player_service.update_player(db, player, body, user.id)


@router.delete("/{club_id}/players/{player_id}", status_code=204)
async def archive_player(
    club_id: int,
    player_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("GERER_JOUEURS")),
):
    player = await player_service.get_player(db, club_id, player_id)
    await player_service.archive_player(db, player, user.id)


@router.get("/{club_id}/players/{player_id}/physical", response_model=PhysicalProfileResponse)
async def get_physical(
    club_id: int,
    player_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("VOIR_DONNEES_PHYSIQUES")),
):
    await player_service.get_player(db, club_id, player_id)
    profile = await player_service.get_physical_profile(db, player_id)
    if profile is None:
        return PhysicalProfileResponse(
            player_id=player_id, taille_cm=None, poids_kg=None, imc=None, charge_travail=None
        )
    return profile


@router.put("/{club_id}/players/{player_id}/physical", response_model=PhysicalProfileResponse)
async def update_physical(
    club_id: int,
    player_id: int,
    body: PhysicalProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("ECRIRE_DONNEES_PHYSIQUES")),
):
    await player_service.get_player(db, club_id, player_id)
    return await player_service.upsert_physical_profile(db, player_id, body, user.id)


@router.get("/{club_id}/players/{player_id}/medical", response_model=list[MedicalRecordResponse])
async def list_medical(
    club_id: int,
    player_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("VOIR_DONNEES_MEDICALES")),
):
    await player_service.get_player(db, club_id, player_id)
    return await player_service.list_medical_records(db, player_id)


@router.post(
    "/{club_id}/players/{player_id}/medical", response_model=MedicalRecordResponse, status_code=201
)
async def add_medical(
    club_id: int,
    player_id: int,
    body: MedicalRecordCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("ECRIRE_DONNEES_MEDICALES")),
):
    await player_service.get_player(db, club_id, player_id)
    return await player_service.add_medical_record(db, player_id, body, user.id)