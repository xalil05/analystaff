"""Endpoints du module planification."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_club_member, require_permission
from app.core.database import get_db
from app.planning import service as planning_service
from app.planning.schemas import (
    WorkPlanCreate,
    WorkPlanDetailResponse,
    WorkPlanItemCreate,
    WorkPlanItemResponse,
    WorkPlanResponse,
    WorkPlanUpdate,
)
from app.users.models import User

router = APIRouter(tags=["planning"])


@router.post("/{club_id}/planning/work-plans", response_model=WorkPlanResponse, status_code=201)
async def create_work_plan(
    club_id: int,
    body: WorkPlanCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("CREER_PLAN_TRAVAIL")),
):
    return await planning_service.create_work_plan(db, club_id, body, user.id)


@router.get("/{club_id}/planning/work-plans", response_model=list[WorkPlanResponse])
async def list_work_plans(
    club_id: int,
    team_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    return await planning_service.list_work_plans(db, club_id, team_id)


@router.get("/{club_id}/planning/work-plans/{plan_id}", response_model=WorkPlanDetailResponse)
async def get_work_plan(
    club_id: int,
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    _membership=Depends(require_club_member),
):
    plan = await planning_service.get_work_plan(db, club_id, plan_id)
    items = await planning_service.get_work_plan_items(db, plan.id)
    response = WorkPlanDetailResponse.model_validate(plan)
    response.items = [WorkPlanItemResponse.model_validate(i) for i in items]
    return response


@router.patch("/{club_id}/planning/work-plans/{plan_id}", response_model=WorkPlanResponse)
async def update_work_plan(
    club_id: int,
    plan_id: int,
    body: WorkPlanUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("MODIFIER_PLAN_TRAVAIL")),
):
    plan = await planning_service.get_work_plan(db, club_id, plan_id)
    return await planning_service.update_work_plan(db, plan, body, user.id)


@router.post(
    "/{club_id}/planning/work-plans/{plan_id}/items",
    response_model=WorkPlanItemResponse,
    status_code=201,
)
async def add_work_plan_item(
    club_id: int,
    plan_id: int,
    body: WorkPlanItemCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_permission("MODIFIER_PLAN_TRAVAIL")),
):
    plan = await planning_service.get_work_plan(db, club_id, plan_id)
    return await planning_service.add_work_plan_item(db, club_id, plan, body)