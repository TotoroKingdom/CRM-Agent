from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status

from app.api.deps import get_service
from app.api.errors import NOT_FOUND_RESPONSES, VALIDATION_RESPONSES
from app.schemas import (
    ActivityCreate,
    ActivityListResponse,
    ActivityResponseEnvelope,
    Channel,
    DeleteResponse,
    LeadCreate,
    LeadDetailsResponseEnvelope,
    LeadListResponse,
    LeadResponseEnvelope,
    LeadStatus,
    LeadUpdate,
)
from app.services.crm import CrmService

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("", response_model=LeadListResponse, responses=VALIDATION_RESPONSES)
def list_leads(
    service: Annotated[CrmService, Depends(get_service)],
    search: Annotated[str | None, Query(max_length=120)] = None,
    status_value: Annotated[LeadStatus | None, Query(alias="status")] = None,
    channel: Annotated[Channel | None, Query()] = None,
) -> LeadListResponse:
    return LeadListResponse(
        data=service.list_leads(
            search=search,
            status=status_value.value if status_value else None,
            channel=channel.value if channel else None,
        )
    )


@router.post(
    "",
    response_model=LeadResponseEnvelope,
    status_code=status.HTTP_201_CREATED,
    responses=VALIDATION_RESPONSES,
)
def create_lead(
    payload: LeadCreate,
    service: Annotated[CrmService, Depends(get_service)],
) -> LeadResponseEnvelope:
    return LeadResponseEnvelope(data=service.create_lead(payload))


@router.get(
    "/{lead_id}",
    response_model=LeadDetailsResponseEnvelope,
    responses={**NOT_FOUND_RESPONSES, **VALIDATION_RESPONSES},
)
def get_lead(
    lead_id: Annotated[str, Path()],
    service: Annotated[CrmService, Depends(get_service)],
) -> LeadDetailsResponseEnvelope:
    return LeadDetailsResponseEnvelope(data=service.get_lead(lead_id))


@router.patch(
    "/{lead_id}",
    response_model=LeadResponseEnvelope,
    responses={**NOT_FOUND_RESPONSES, **VALIDATION_RESPONSES},
)
def update_lead(
    payload: LeadUpdate,
    lead_id: Annotated[str, Path()],
    service: Annotated[CrmService, Depends(get_service)],
) -> LeadResponseEnvelope:
    return LeadResponseEnvelope(data=service.update_lead(lead_id, payload))


@router.delete(
    "/{lead_id}",
    response_model=DeleteResponse,
    responses={**NOT_FOUND_RESPONSES, **VALIDATION_RESPONSES},
)
def delete_lead(
    lead_id: Annotated[str, Path()],
    service: Annotated[CrmService, Depends(get_service)],
) -> DeleteResponse:
    service.delete_lead(lead_id)
    return DeleteResponse(data={"id": lead_id})


@router.get(
    "/{lead_id}/activities",
    response_model=ActivityListResponse,
    responses={**NOT_FOUND_RESPONSES, **VALIDATION_RESPONSES},
)
def list_activities(
    lead_id: Annotated[str, Path()],
    service: Annotated[CrmService, Depends(get_service)],
) -> ActivityListResponse:
    return ActivityListResponse(data=service.list_activities(lead_id))


@router.post(
    "/{lead_id}/activities",
    response_model=ActivityResponseEnvelope,
    status_code=status.HTTP_201_CREATED,
    responses={**NOT_FOUND_RESPONSES, **VALIDATION_RESPONSES},
)
def create_activity(
    payload: ActivityCreate,
    lead_id: Annotated[str, Path()],
    service: Annotated[CrmService, Depends(get_service)],
) -> ActivityResponseEnvelope:
    return ActivityResponseEnvelope(data=service.create_activity(lead_id, payload))
