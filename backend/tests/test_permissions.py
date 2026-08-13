"""Tests de la logique de permissions (RBAC dynamique) et d'isolation par club."""
import pytest
from sqlalchemy import select

from app.clubs.models import Club
from app.core.enums import ClubLevel, StaffMemberStatut
from app.core.security import hash_password
from app.roles.models import Role, StaffMember
from app.roles.services import get_user_permissions, has_permission
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