from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_service
from app.api.errors import VALIDATION_RESPONSES
from app.schemas import DashboardResponseEnvelope
from app.services.crm import CrmService

router = APIRouter(tags=["dashboard"])


@router.get(
    "/api/dashboard",
    response_model=DashboardResponseEnvelope,
    responses=VALIDATION_RESPONSES,
)
def get_dashboard(
    service: Annotated[CrmService, Depends(get_service)],
) -> DashboardResponseEnvelope:
    return DashboardResponseEnvelope(data=service.get_dashboard())
