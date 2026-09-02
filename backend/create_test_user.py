import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import get_settings
from app.core.security import hash_password
from app.users.models import User
from app.clubs.models import Club
from app.roles.models import Role, StaffMember

settings = get_settings()

async def main():
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 1. Récupérer ou créer le club
        result = await session.execute(select(Club).where(Club.nom == "Club Test Pilote"))
        club = result.scalars().first()
        if not club:
            club = Club(nom="Club Test Pilote", niveau="amateur", timezone="Africa/Dakar")
            session.add(club)
            await session.flush()

        # 2. Récupérer le rôle HEAD_COACH
        result = await session.execute(select(Role).where(Role.code == "HEAD_COACH"))
        role = result.scalars().first()
        if not role:
            print("❌ Erreur: Le rôle HEAD_COACH n'existe pas. Lance d'abord le seed complet.")
            return

        # 3. Créer l'utilisateur de test
        result = await session.execute(select(User).where(User.email == "test@analystaff.com"))
        user = result.scalars().first()
        
        if not user:
            hashed_password = hash_password("password123")
            user = User(
                email="test@analystaff.com",
                password_hash=hashed_password,
                nom="Test",
                prenom="User",
                is_active=True
            )
            session.add(user)
            await session.flush()

        # 4. Lier l'utilisateur au club
        result = await session.execute(
            select(StaffMember).where(
                (StaffMember.user_id == user.id) & (StaffMember.club_id == club.id)
            )
        )
        if not result.scalars().first():
            staff = StaffMember(
                user_id=user.id,
                club_id=club.id,
                role_id=role.id,
                statut="actif"
            )
            session.add(staff)

        await session.commit()
        print(f"✅ Utilisateur créé avec succès !")
        print(f"   Email: test@analystaff.com")
        print(f"   Mot de passe: password123")
        print(f"   Club ID: {club.id}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
