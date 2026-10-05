"""Tests de la logique de permissions (RBAC dynamique) et d'isolation par club."""
import pytest
from sqlalchemy import select

from app.clubs.models import Club
from app.core.enums import ClubLevel, StaffMemberStatut
from app.core.errors import NotFoundError
from app.core.security import hash_password
from app.players.models import Player
from app.roles import staff_service
from app.roles.models import Role, StaffMember
from app.roles.service import get_user_permissions, has_permission
from app.users.models import User


async def _setup_membership(db, email: str, role_code: str, club_name: str, level: ClubLevel):
    """Crée un club, un utilisateur et une adhésion active. Retourne (user, club)."""
    club = Club(nom=club_name, niveau=level)
    db.add(club)
    await db.flush()

    user = User(email=email, password_hash=hash_password("password123"), nom="Test")
    db.add(user)
    await db.flush()

    role = (await db.execute(select(Role).where(Role.code == role_code))).scalar_one()
    db.add(
        StaffMember(
            user_id=user.id, club_id=club.id, role_id=role.id, statut=StaffMemberStatut.actif
        )
    )
    await db.commit()
    return user, club


@pytest.mark.asyncio
async def test_head_coach_has_full_supervision(db):
    """RÈGLE MÉTIER : le coach principal a une supervision totale."""
    user, club = await _setup_membership(
        db, "coach_head@test.com", "HEAD_COACH", "Club Head", ClubLevel.amateur
    )
    assert await has_permission(db, user.id, club.id, "VOIR_DONNEES_MEDICALES") is True
    assert await has_permission(db, user.id, club.id, "VOIR_DONNEES_PHYSIQUES") is True
    assert await has_permission(db, user.id, club.id, "GERER_PERMISSIONS") is True
    assert await has_permission(db, user.id, club.id, "CONSULTER_AUDIT") is True


@pytest.mark.asyncio
async def test_intendant_has_no_sensitive_permissions_by_default(db):
    """RÈGLE MÉTIER : un intendant n'a pas accès aux données sensibles par défaut."""
    user, club = await _setup_membership(
        db, "intendant@test.com", "INTENDANT", "Club Intendant", ClubLevel.amateur
    )
    assert await has_permission(db, user.id, club.id, "VOIR_DONNEES_MEDICALES") is False
    assert await has_permission(db, user.id, club.id, "VOIR_DONNEES_PHYSIQUES") is False
    assert await has_permission(db, user.id, club.id, "GERER_PERMISSIONS") is False


@pytest.mark.asyncio
async def test_fitness_coach_has_physical_but_not_medical(db):
    """RÈGLE MÉTIER : le préparateur physique a accès au physique, pas au médical."""
    user, club = await _setup_membership(
        db, "fitness@test.com", "FITNESS_COACH", "Club Fitness", ClubLevel.semi_pro
    )
    assert await has_permission(db, user.id, club.id, "VOIR_DONNEES_PHYSIQUES") is True
    assert await has_permission(db, user.id, club.id, "ECRIRE_DONNEES_PHYSIQUES") is True
    assert await has_permission(db, user.id, club.id, "VOIR_DONNEES_MEDICALES") is False


@pytest.mark.asyncio
async def test_no_membership_means_no_permission(db):
    """ISOLATION : un utilisateur sans adhésion au club n'a aucune permission."""
    club = Club(nom="Club Outsider", niveau=ClubLevel.amateur)
    db.add(club)
    await db.flush()

    outsider = User(
        email="outsider@test.com", password_hash=hash_password("password123"), nom="Outsider"
    )
    db.add(outsider)
    await db.commit()

    permissions = await get_user_permissions(db, outsider.id, club.id)
    assert permissions == set()


# ---------------------------------------------------------------------------
# Retrait par défaut d'une permission de rôle
#
# RÈGLE : DECISIONS_FIGEES.md §6 — « Le coach principal peut accorder ou
# retirer des permissions à une personne précise, au-delà de son rôle par
# défaut. » et MATRICE_PERMISSIONS_ET_REGLES_METIER.md §10.1 — « Retirer des
# permissions. »
#
# Conséquences testées ici :
#   - une permission absente du rôle est refusée tant que le coach ne l'a pas
#     accordée (MATRICE §1.1 « Variable ») ;
#   - l'accord individuel passe au-dessus du rôle ;
#   - le RETRAIT passe aussi au-dessus du rôle : une permission détenue par
#     défaut par le rôle peut être retirée à une personne précise ;
#   - le retrait est individuel, il ne modifie jamais le rôle lui-même.
# ---------------------------------------------------------------------------


async def _membership_of(db, user: User, club: Club) -> StaffMember:
    """Retourne l'adhésion d'un utilisateur dans un club."""
    return (
        await db.execute(
            select(StaffMember)
            .where(StaffMember.user_id == user.id)
            .where(StaffMember.club_id == club.id)
        )
    ).scalar_one()


async def _add_member(db, club: Club, email: str, role_code: str) -> User:
    """Ajoute un membre supplémentaire à un club déjà créé."""
    user = User(email=email, password_hash=hash_password("password123"), nom="Test")
    db.add(user)
    await db.flush()
    role = (await db.execute(select(Role).where(Role.code == role_code))).scalar_one()
    db.add(
        StaffMember(
            user_id=user.id, club_id=club.id, role_id=role.id, statut=StaffMemberStatut.actif
        )
    )
    await db.commit()
    return user


@pytest.mark.asyncio
async def test_permission_absente_du_role_refusee_tant_qu_elle_n_est_pas_accordee(db):
    """RÈGLE : « Variable » = refusée tant que le coach ne l'a pas accordée."""
    user, club = await _setup_membership(
        db, "med_variable@test.com", "MEDICAL_STAFF", "Club Variable", ClubLevel.semi_pro
    )
    assert await has_permission(db, user.id, club.id, "CREER_MATCH") is False


@pytest.mark.asyncio
async def test_accord_individuel_depasse_le_role_par_defaut(db):
    """RÈGLE : le coach accorde une permission que le rôle ne possède pas."""
    user, club = await _setup_membership(
        db, "med_accord@test.com", "MEDICAL_STAFF", "Club Accord", ClubLevel.semi_pro
    )
    member = await _membership_of(db, user, club)

    await staff_service.grant_permission(
        db, club.id, member.id, "CREER_MATCH", granted_by=member.user_id
    )

    assert await has_permission(db, user.id, club.id, "CREER_MATCH") is True


@pytest.mark.asyncio
async def test_retrait_prime_sur_le_defaut_du_role(db):
    """RÈGLE : retirer à une personne une permission que son rôle possède par défaut."""
    user, club = await _setup_membership(
        db, "prep_retrait@test.com", "FITNESS_COACH", "Club Retrait", ClubLevel.semi_pro
    )
    member = await _membership_of(db, user, club)
    # Le rôle FITNESS_COACH possède VOIR_DONNEES_PHYSIQUES par défaut.
    assert await has_permission(db, user.id, club.id, "VOIR_DONNEES_PHYSIQUES") is True

    await staff_service.revoke_permission(
        db, club.id, member.id, "VOIR_DONNEES_PHYSIQUES", revoked_by=member.user_id
    )

    assert await has_permission(db, user.id, club.id, "VOIR_DONNEES_PHYSIQUES") is False
    # Le retrait est ciblé : le reste du périmètre du rôle reste ouvert.
    assert await has_permission(db, user.id, club.id, "ECRIRE_DONNEES_PHYSIQUES") is True


@pytest.mark.asyncio
async def test_retrait_annule_un_accord_individuel(db):
    """RÈGLE : retirer une permission accordée par exception la rend refusée."""
    user, club = await _setup_membership(
        db, "med_reaccorde@test.com", "MEDICAL_STAFF", "Club Reaccorde", ClubLevel.semi_pro
    )
    member = await _membership_of(db, user, club)
    await staff_service.grant_permission(
        db, club.id, member.id, "CREER_MATCH", granted_by=member.user_id
    )
    assert await has_permission(db, user.id, club.id, "CREER_MATCH") is True

    await staff_service.revoke_permission(
        db, club.id, member.id, "CREER_MATCH", revoked_by=member.user_id
    )

    assert await has_permission(db, user.id, club.id, "CREER_MATCH") is False


@pytest.mark.asyncio
async def test_re_accord_apres_retrait_rend_la_permission(db):
    """RÈGLE : ré-accorder après un retrait lève le retrait et rouvre l'accès."""
    user, club = await _setup_membership(
        db, "prep_relift@test.com", "FITNESS_COACH", "Club Relift", ClubLevel.semi_pro
    )
    member = await _membership_of(db, user, club)
    await staff_service.revoke_permission(
        db, club.id, member.id, "VOIR_DONNEES_PHYSIQUES", revoked_by=member.user_id
    )
    assert await has_permission(db, user.id, club.id, "VOIR_DONNEES_PHYSIQUES") is False

    await staff_service.grant_permission(
        db, club.id, member.id, "VOIR_DONNEES_PHYSIQUES", granted_by=member.user_id
    )

    assert await has_permission(db, user.id, club.id, "VOIR_DONNEES_PHYSIQUES") is True


@pytest.mark.asyncio
async def test_retrait_est_individuel_et_ne_modifie_pas_le_role(db):
    """RÈGLE : le retrait porte sur une personne précise, jamais sur le rôle."""
    cible, club = await _setup_membership(
        db, "prep_cible@test.com", "FITNESS_COACH", "Club Individuel", ClubLevel.semi_pro
    )
    # Second préparateur physique, même club, même rôle.
    temoin = await _add_member(db, club, "prep_temoin@test.com", "FITNESS_COACH")

    cible_member = await _membership_of(db, cible, club)
    await staff_service.revoke_permission(
        db, club.id, cible_member.id, "VOIR_DONNEES_PHYSIQUES", revoked_by=cible_member.user_id
    )

    assert await has_permission(db, cible.id, club.id, "VOIR_DONNEES_PHYSIQUES") is False
    # Même rôle, autre personne : le retrait ne déborde pas.
    assert await has_permission(db, temoin.id, club.id, "VOIR_DONNEES_PHYSIQUES") is True


@pytest.mark.asyncio
async def test_retrait_ferme_une_route_protegee_par_require_permission(db, client):
    """RÈGLE : le retrait se voit sur une route réellement protégée (403)."""
    user, club = await _setup_membership(
        db, "prep_route@test.com", "FITNESS_COACH", "Club Route", ClubLevel.semi_pro
    )
    player = Player(club_id=club.id, nom="Joueur Physique")
    db.add(player)
    await db.commit()
    member = await _membership_of(db, user, club)
    url = f"/api/v1/clubs/{club.id}/players/{player.id}/physical"

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "prep_route@test.com", "password": "password123"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Avant le retrait : le rôle donne l'accès.
    assert (await client.get(url, headers=headers)).status_code == 200

    await staff_service.revoke_permission(
        db, club.id, member.id, "VOIR_DONNEES_PHYSIQUES", revoked_by=member.user_id
    )

    assert (await client.get(url, headers=headers)).status_code == 403


@pytest.mark.asyncio
async def test_retrait_inconnu_ou_hors_club_leve_not_found(db):
    """ISOLATION : on ne retire jamais une permission hors du club visé."""
    user, club = await _setup_membership(
        db, "prep_iso@test.com", "FITNESS_COACH", "Club Iso", ClubLevel.semi_pro
    )
    member = await _membership_of(db, user, club)
    autre_club = Club(nom="Club Autre", niveau=ClubLevel.semi_pro)
    db.add(autre_club)
    await db.commit()

    with pytest.raises(NotFoundError):
        await staff_service.revoke_permission(
            db, autre_club.id, member.id, "VOIR_DONNEES_PHYSIQUES", revoked_by=user.id
        )
    with pytest.raises(NotFoundError):
        await staff_service.revoke_permission(
            db, club.id, member.id, "PERMISSION_ABSENTE", revoked_by=user.id
        )


# ---------------------------------------------------------------------------
# Retrait d'un membre du club (DELETE /clubs/{id}/staff/{staff_member_id})
#
# RÈGLE : la suppression est une DÉSACTIVATION, pas une suppression physique.
# `staff_members` porte `statut` et `left_at` (SCHEMA_SQL.md §5.5) et le module
# `roles/service.py` ne résout les droits que sur une adhésion `actif` : c'est
# le statut qui ferme l'accès, pas la disparition de la ligne. La ligne reste
# donc, avec sa date de départ, et `user_permissions` garde la trace des
# décisions prises sur ce membre.
#
# Conséquences testées ici :
#   - le membre devient `parti` et `left_at` est horodaté ;
#   - la ligne est préservée (l'historique d'adhésion survit) ;
#   - le membre retiré perd tout accès au club, permissions de rôle comprises ;
#   - une suppression hors du club visé ou sur un membre inexistant lève
#     NotFoundError (404), jamais un 500 ;
#   - la suppression est idempotente : elle ne réécrit pas `left_at`.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_suppression_horodate_le_depart_sans_supprimer_la_ligne(db):
    """RÈGLE : supprimer = passer le membre à `parti`, pas effacer l'adhésion."""
    user, club = await _setup_membership(
        db, "coach_depart@test.com", "HEAD_COACH", "Club Depart", ClubLevel.amateur
    )
    member = await _membership_of(db, user, club)
    assert member.left_at is None

    reponse = await staff_service.delete_staff_member(db, club.id, member.id)

    assert reponse.statut == StaffMemberStatut.parti
    assert reponse.left_at is not None
    # L'adhésion reste en base : l'historique du club est préservé.
    assert await _membership_of(db, user, club) is not None


@pytest.mark.asyncio
async def test_membre_supprime_perdu_tout_acces_au_club(db):
    """RÈGLE : le membre retiré n'a plus aucune permission sur le club."""
    user, club = await _setup_membership(
        db, "coach_acces@test.com", "HEAD_COACH", "Club Acces", ClubLevel.amateur
    )
    temoin = await _add_member(db, club, "coach_acces_temoin@test.com", "HEAD_COACH")
    member = await _membership_of(db, user, club)
    assert await has_permission(db, user.id, club.id, "GERER_STAFF") is True

    await staff_service.delete_staff_member(db, club.id, member.id)

    assert await has_permission(db, user.id, club.id, "GERER_STAFF") is False
    # Le départ est individuel : le reste du staff n'est pas touché.
    assert await has_permission(db, temoin.id, club.id, "GERER_STAFF") is True


@pytest.mark.asyncio
async def test_suppression_inconnue_ou_hors_club_leve_not_found(db):
    """ISOLATION : on ne retire jamais un membre hors du club visé."""
    user, club = await _setup_membership(
        db, "coach_iso@test.com", "HEAD_COACH", "Club Iso Depart", ClubLevel.amateur
    )
    membre_du_club = await _membership_of(db, user, club)
    autre_club = Club(nom="Club Autre Iso", niveau=ClubLevel.amateur)
    db.add(autre_club)
    await db.flush()
    membre_ailleurs = await _add_member(db, autre_club, "coach_ailleurs@test.com", "HEAD_COACH")
    membre_ailleurs_id = (await _membership_of(db, membre_ailleurs, autre_club)).id
    await db.commit()

    # Membre existant mais appartenant à un autre club : 404, pas 500.
    with pytest.raises(NotFoundError):
        await staff_service.delete_staff_member(db, club.id, membre_ailleurs_id)

    # Membre inexistant : 404, pas 500.
    with pytest.raises(NotFoundError):
        await staff_service.delete_staff_member(db, club.id, membre_du_club.id + 100_000)

    # Le membre d'ailleurs est resté actif.
    assert await has_permission(db, membre_ailleurs.id, autre_club.id, "GERER_STAFF") is True


@pytest.mark.asyncio
async def test_suppression_est_idempotente(db):
    """RÈGLE : retirer deux fois ne réécrit pas la date de départ."""
    user, club = await _setup_membership(
        db, "coach_idem@test.com", "HEAD_COACH", "Club Idem", ClubLevel.amateur
    )
    membre = await _add_member(db, club, "coach_idem_cible@test.com", "INTENDANT")
    member_id = (await _membership_of(db, membre, club)).id

    premiere = await staff_service.delete_staff_member(db, club.id, member_id)
    seconde = await staff_service.delete_staff_member(db, club.id, member_id)

    assert seconde.statut == StaffMemberStatut.parti
    assert seconde.left_at == premiere.left_at


@pytest.mark.asyncio
async def test_route_delete_revoque_le_membre_et_renvoie_404_hors_club(db, client):
    """RÈGLE : la route répond 200 avec le membre parti, et 404 hors club."""
    user, club = await _setup_membership(
        db, "coach_route@test.com", "HEAD_COACH", "Club Route Depart", ClubLevel.amateur
    )
    cible = await _add_member(db, club, "coach_route_cible@test.com", "INTENDANT")
    member_id = (await _membership_of(db, cible, club)).id

    autre_club = Club(nom="Club Route Autre", niveau=ClubLevel.amateur)
    db.add(autre_club)
    await db.flush()
    membre_ailleurs = await _add_member(db, autre_club, "coach_route_ailleurs@test.com", "HEAD_COACH")
    membre_ailleurs_id = (await _membership_of(db, membre_ailleurs, autre_club)).id

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "coach_route@test.com", "password": "password123"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Membre d'un autre club : 404, pas 500.
    hors_club = await client.request(
        "DELETE", f"/api/v1/clubs/{club.id}/staff/{membre_ailleurs_id}",
        headers=headers, json={},
    )
    assert hors_club.status_code == 404
    assert hors_club.json()["error_code"] == "NOT_FOUND"

    # Membre du club : 200, le membre revient marqué `parti`.
    response = await client.request(
        "DELETE", f"/api/v1/clubs/{club.id}/staff/{member_id}", headers=headers, json={}
    )
    assert response.status_code == 200
    assert response.json()["statut"] == StaffMemberStatut.parti.value
    assert response.json()["left_at"] is not None