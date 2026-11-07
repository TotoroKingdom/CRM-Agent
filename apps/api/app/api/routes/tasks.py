from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status

from app.api.deps import get_service
from app.api.errors import NOT_FOUND_RESPONSES, VALIDATION_RESPONSES
from app.schemas import (
    TaskCreate,
    TaskFilter,
    TaskListResponse,
    TaskResponseEnvelope,
    TaskUpdate,
)
from app.services.crm import CrmService

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=TaskListResponse, responses=VALIDATION_RESPONSES)
def list_tasks(
    service: Annotated[CrmService, Depends(get_service)],
    filter_value: Annotated[TaskFilter, Query(alias="filter")] = TaskFilter.ALL,
) -> TaskListResponse:
    return TaskListResponse(data=service.list_tasks(filter_value))


@router.post(
    "",
    response_model=TaskResponseEnvelope,
    status_code=status.HTTP_201_CREATED,
    responses={**NOT_FOUND_RESPONSES, **VALIDATION_RESPONSES},
)
def create_task(
    payload: TaskCreate,
    service: Annotated[CrmService, Depends(get_service)],
) -> TaskResponseEnvelope:
    return TaskResponseEnvelope(data=service.create_task(payload))


@router.patch(
    "/{task_id}",
    response_model=TaskResponseEnvelope,
    responses={**NOT_FOUND_RESPONSES, **VALIDATION_RESPONSES},
)
def update_task(
    payload: TaskUpdate,
    task_id: Annotated[str, Path()],
    service: Annotated[CrmService, Depends(get_service)],
) -> TaskResponseEnvelope:
    return TaskResponseEnvelope(data=service.update_task(task_id, payload))
