"""Logique métier du module planification."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clubs.models import Season, Team
from app.core.errors import NotFoundError, ValidationError
from app.planning.models import WorkPlan, WorkPlanItem
from app.planning.schemas import WorkPlanCreate, WorkPlanItemCreate, WorkPlanUpdate
from app.training.models import TrainingSession


async def create_work_plan(
    db: AsyncSession, club_id: int, data: WorkPlanCreate, created_by: int
) -> WorkPlan:
    """Crée un plan de travail. Vérifie équipe/saison et la cohérence des dates."""
    team = (
        await db.execute(select(Team).where(Team.id == data.team_id).where(Team.club_id == club_id))
    ).scalar_one_or_none()
    if team is None:
        raise ValidationError("Cette équipe n'appartient pas au club.")
    season = (
        await db.execute(
            select(Season).where(Season.id == data.season_id).where(Season.club_id == club_id)
        )
    ).scalar_one_or_none()
    if season is None:
        raise ValidationError("Cette saison n'appartient pas au club.")

    plan = WorkPlan(
        club_id=club_id,
        team_id=data.team_id,
        season_id=data.season_id,
        nom=data.nom,
        type=data.type,
        date_debut=data.date_debut,
        date_fin=data.date_fin,
        statut="actif",
        created_by=created_by,
    )
    db.add(plan)
    await db.commit()
    return plan


async def get_work_plan(db: AsyncSession, club_id: int, plan_id: int) -> WorkPlan:
    """SÉCURITÉ : isolation par club (anti-IDOR)."""
    stmt = select(WorkPlan).where(WorkPlan.id == plan_id).where(WorkPlan.club_id == club_id)
    plan = (await db.execute(stmt)).scalar_one_or_none()
    if plan is None:
        raise NotFoundError("Ce plan de travail n'existe pas.")
    return plan


async def get_work_plan_items(db: AsyncSession, plan_id: int) -> list[WorkPlanItem]:
    stmt = select(WorkPlanItem).where(WorkPlanItem.work_plan_id == plan_id).order_by(WorkPlanItem.ordre)
    return list((await db.execute(stmt)).scalars().all())


async def list_work_plans(db: AsyncSession, club_id: int, team_id: int | None = None) -> list[WorkPlan]:
    stmt = select(WorkPlan).where(WorkPlan.club_id == club_id)
    if team_id is not None:
        stmt = stmt.where(WorkPlan.team_id == team_id)
    stmt = stmt.order_by(WorkPlan.date_debut.desc())
    return list((await db.execute(stmt)).scalars().all())


async def update_work_plan(
    db: AsyncSession, plan: WorkPlan, data: WorkPlanUpdate, updated_by: int
) -> WorkPlan:
    for field in ("nom", "date_debut", "date_fin", "statut"):
        value = getattr(data, field)
        if value is not None:
            setattr(plan, field, value)
    # Cohérence des dates après mise à jour.
    if plan.date_fin < plan.date_debut:
        raise ValidationError("date_fin doit être postérieure ou égale à date_debut.")
    await db.commit()
    return plan


async def add_work_plan_item(
    db: AsyncSession, club_id: int, plan: WorkPlan, data: WorkPlanItemCreate
) -> WorkPlanItem:
    """Associe une séance (optionnel) à un plan de travail."""
    if data.training_session_id is not None:
        session = (
            await db.execute(
                select(TrainingSession)
                .where(TrainingSession.id == data.training_session_id)
                .where(TrainingSession.club_id == club_id)
            )
        ).scalar_one_or_none()
        if session is None:
            raise ValidationError("Cette séance n'appartient pas au club.")

    item = WorkPlanItem(
        work_plan_id=plan.id,
        training_session_id=data.training_session_id,
        ordre=data.ordre,
        objectifs=data.objectifs,
        statut_prevu=data.statut_prevu,
    )
    db.add(item)
    await db.commit()
    return item