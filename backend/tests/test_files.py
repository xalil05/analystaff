"""Tests Phase 6 : upload de fichiers (validation, isolation, permissions)."""
import pytest
from sqlalchemy import select

from app.clubs.models import Club
from app.core.enums import ClubLevel, StaffMemberStatut
from app.core.security import hash_password
from app.files.models import UploadedFile
from app.roles.models import Role, StaffMember
from app.users.models import User


async def _setup_club_with_coach(db, coach_email: str):
    club = Club(nom="Club Files", niveau=ClubLevel.amateur)
    db.add(club)
    await db.flush()
    coach = User(email=coach_email, password_hash=hash_password("password123"), nom="Coach")
    db.add(coach)
    await db.flush()
    role = (await db.execute(select(Role).where(Role.code == "HEAD_COACH"))).scalar_one()
    db.add(
        StaffMember(user_id=coach.id, club_id=club.id, role_id=role.id, statut=StaffMemberStatut.actif)
    )
    await db.commit()
    return club, coach


async def _setup_intendant(db, club, email: str):
    user = User(email=email, password_hash=hash_password("password123"), nom="Intendant")
    db.add(user)
    await db.flush()
    role = (await db.execute(select(Role).where(Role.code == "INTENDANT"))).scalar_one()
    db.add(
        StaffMember(user_id=user.id, club_id=club.id, role_id=role.id, statut=StaffMemberStatut.actif)
    )
    await db.commit()
    return user


async def _login(client, email: str) -> str:
    response = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "password123"}
    )
    return response.json()["access_token"]


@pytest.fixture
def mock_storage(monkeypatch):
    """
    Mock le stockage MinIO pour les tests : on ne dépend pas d'un vrai MinIO.
    NOTE HONNÊTE : l'intégration réelle avec MinIO devra être testée manuellement
    avant le pilote. Voir ROADMAP.
    """
    saved: dict[str, bytes] = {}

    async def fake_ensure_bucket() -> None:
        return None

    async def fake_save(key: str, data: bytes, content_type: str) -> None:
        saved[key] = data

    async def fake_read(key: str) -> bytes:
        return saved[key]

    monkeypatch.setattr("app.files.service.storage.ensure_bucket", fake_ensure_bucket)
    monkeypatch.setattr("app.files.service.storage.save", fake_save)
    monkeypatch.setattr("app.files.service.storage.read", fake_read)
    return saved


@pytest.mark.asyncio
async def test_upload_txt_succeeds(db, client, mock_storage):
    club, coach = await _setup_club_with_coach(db, "coach_f1@test.com")
    token = await _login(client, "coach_f1@test.com")

    response = await client.post(
        f"/api/v1/clubs/{club.id}/files",
        files={"file": ("seance.txt", "Séance endurance - 60 minutes", "text/plain")},
        data={"context_type": "seance"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["file"]["file_type"] == "txt"
    assert body["file"]["is_analyzed"] in (True, False)
    # Le fichier a bien été "stocké" (mock).
    assert len(mock_storage) == 1


@pytest.mark.asyncio
async def test_upload_disallowed_format_rejected(db, client, mock_storage):
    club, coach = await _setup_club_with_coach(db, "coach_f2@test.com")
    token = await _login(client, "coach_f2@test.com")

    response = await client.post(
        f"/api/v1/clubs/{club.id}/files",
        files={"file": ("script.exe", b"malicious", "application/octet-stream")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_upload_too_large_rejected(db, client, mock_storage, monkeypatch):
    club, coach = await _setup_club_with_coach(db, "coach_f3@test.com")
    token = await _login(client, "coach_f3@test.com")

    # Simule un fichier de 11 Mo (> 10 Mo max).
    large = b"x" * (11 * 1024 * 1024)
    response = await client.post(
        f"/api/v1/clubs/{club.id}/files",
        files={"file": ("big.txt", large, "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_intendant_cannot_upload(db, client, mock_storage):
    """PERMISSION : IMPORTER_SEANCE_DU_JOUR est requis."""
    club, coach = await _setup_club_with_coach(db, "coach_f4@test.com")
    await _setup_intendant(db, club, "intendant_f@test.com")
    token = await _login(client, "intendant_f@test.com")

    response = await client.post(
        f"/api/v1/clubs/{club.id}/files",
        files={"file": ("seance.txt", b"contenu", "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_file_isolation_between_clubs(db, client, mock_storage):
    """ISOLATION : un coach B ne peut pas voir un fichier du club A."""
    club_a, _ = await _setup_club_with_coach(db, "coach_fa@test.com")
    club_b, _ = await _setup_club_with_coach(db, "coach_fb@test.com")

    db.add(
        UploadedFile(
            club_id=club_a.id,
            uploaded_by=1,
            file_name="secret.txt",
            file_path=f"{club_a.id}/abc.txt",
            file_type="txt",
            file_size=10,
        )
    )
    await db.commit()
    file_a = (await db.execute(select(UploadedFile).where(UploadedFile.club_id == club_a.id))).scalar_one()
    token_b = await _login(client, "coach_fb@test.com")
    response = await client.get(
        f"/api/v1/clubs/{club_a.id}/files/{file_a.id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    # Le coach B n'est pas membre du club A.
    assert response.status_code == 403