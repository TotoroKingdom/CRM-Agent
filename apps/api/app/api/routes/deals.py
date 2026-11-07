from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status

from app.api.deps import get_service
from app.api.errors import NOT_FOUND_RESPONSES, VALIDATION_RESPONSES
from app.schemas import (
    DealCreate,
    DealListResponse,
    DealResponseEnvelope,
    DealUpdate,
)
from app.services.crm import CrmService

router = APIRouter(prefix="/api/deals", tags=["deals"])


@router.get("", response_model=DealListResponse, responses=VALIDATION_RESPONSES)
def list_deals(
    service: Annotated[CrmService, Depends(get_service)],
    lead_id: Annotated[str | None, Query(alias="leadId")] = None,
) -> DealListResponse:
    return DealListResponse(data=service.list_deals(lead_id))


@router.post(
    "",
    response_model=DealResponseEnvelope,
    status_code=status.HTTP_201_CREATED,
    responses={**NOT_FOUND_RESPONSES, **VALIDATION_RESPONSES},
)
def create_deal(
    payload: DealCreate,
    service: Annotated[CrmService, Depends(get_service)],
) -> DealResponseEnvelope:
    return DealResponseEnvelope(data=service.create_deal(payload))


@router.patch(
    "/{deal_id}",
    response_model=DealResponseEnvelope,
    responses={**NOT_FOUND_RESPONSES, **VALIDATION_RESPONSES},
)
def update_deal(
    payload: DealUpdate,
    deal_id: Annotated[str, Path()],
    service: Annotated[CrmService, Depends(get_service)],
) -> DealResponseEnvelope:
    return DealResponseEnvelope(data=service.update_deal(deal_id, payload))
