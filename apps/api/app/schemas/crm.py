from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from app.core.validation import (
    validate_iso_datetime,
    validate_optional_email,
    validate_optional_iso_datetime,
)
from app.schemas.enums import ActivityType, Channel, DealStage, LeadStatus, Priority


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="ignore",
    )


class InputModel(ApiModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="ignore",
        str_strip_whitespace=True,
    )


class LeadCreate(InputModel):
    name: str = Field(min_length=1, max_length=80)
    company: str = Field(min_length=1, max_length=120)
    email: str | None = Field(default=None, max_length=160)
    phone: str | None = Field(default=None, max_length=50)
    channel: Channel
    status: LeadStatus
    priority: Priority
    country: str | None = Field(default=None, max_length=80)
    note: str | None = Field(default=None, max_length=500)

    _email = field_validator("email")(validate_optional_email)


class LeadUpdate(InputModel):
    name: str | None = Field(default=None, max_length=80)
    company: str | None = Field(default=None, max_length=120)
    email: str | None = Field(default=None, max_length=160)
    phone: str | None = Field(default=None, max_length=50)
    channel: Channel | None = None
    status: LeadStatus | None = None
    priority: Priority | None = None
    country: str | None = Field(default=None, max_length=80)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("name", "company", "channel", "status", "priority", mode="before")
    @classmethod
    def reject_non_nullable(cls, value: object) -> object:
        if value is None:
            raise ValueError("该字段不能为 null")
        return value

    _email = field_validator("email")(validate_optional_email)


class DealCreate(InputModel):
    lead_id: str = Field(min_length=1)
    title: str = Field(min_length=1, max_length=160)
    amount_cents: int = Field(ge=0, le=999_999_999_999)
    stage: DealStage
    expected_close_at: str | None = None

    _expected_close_at = field_validator("expected_close_at")(validate_optional_iso_datetime)


class DealUpdate(InputModel):
    title: str | None = Field(default=None, max_length=160)
    amount_cents: int | None = Field(default=None, ge=0, le=999_999_999_999)
    stage: DealStage | None = None
    expected_close_at: str | None = None

    @field_validator("title", "amount_cents", "stage", mode="before")
    @classmethod
    def reject_non_nullable(cls, value: object) -> object:
        if value is None:
            raise ValueError("该字段不能为 null")
        return value

    _expected_close_at = field_validator("expected_close_at")(validate_optional_iso_datetime)


class ActivityCreate(InputModel):
    type: ActivityType
    content: str = Field(min_length=1, max_length=2000)
    occurred_at: str

    _occurred_at = field_validator("occurred_at")(validate_iso_datetime)


class TaskCreate(InputModel):
    lead_id: str = Field(min_length=1)
    title: str = Field(min_length=1, max_length=200)
    due_at: str

    _due_at = field_validator("due_at")(validate_iso_datetime)


class TaskUpdate(InputModel):
    title: str | None = Field(default=None, max_length=200)
    due_at: str | None = None
    completed: bool | None = None

    @field_validator("title", "due_at", "completed", mode="before")
    @classmethod
    def reject_non_nullable(cls, value: object) -> object:
        if value is None:
            raise ValueError("该字段不能为 null")
        return value

    _due_at = field_validator("due_at")(validate_iso_datetime)


class LeadResponse(ApiModel):
    id: str
    name: str
    company: str
    email: str | None
    phone: str | None
    channel: Channel
    status: LeadStatus
    priority: Priority
    country: str | None
    note: str | None
    created_at: str
    updated_at: str
    deal_count: int
    open_task_count: int


class DealResponse(ApiModel):
    id: str
    lead_id: str
    lead_name: str
    company: str
    title: str
    amount_cents: int
    stage: DealStage
    expected_close_at: str | None
    created_at: str
    updated_at: str


class ActivityResponse(ApiModel):
    id: str
    lead_id: str
    lead_name: str
    company: str
    type: ActivityType
    content: str
    occurred_at: str
    created_at: str


class TaskResponse(ApiModel):
    id: str
    lead_id: str
    lead_name: str
    company: str
    title: str
    due_at: str
    completed_at: str | None
    created_at: str
    updated_at: str


class LeadDetailsResponse(LeadResponse):
    activities: list[ActivityResponse]
    deals: list[DealResponse]
    tasks: list[TaskResponse]


class DashboardStats(ApiModel):
    lead_count: int
    active_deal_count: int
    expected_amount_cents: int
    today_task_count: int
    overdue_task_count: int


class DashboardData(ApiModel):
    stats: DashboardStats
    tasks: list[TaskResponse]
    activities: list[ActivityResponse]
    deals: list[DealResponse]


class LeadListResponse(ApiModel):
    data: list[LeadResponse]


class LeadResponseEnvelope(ApiModel):
    data: LeadResponse


class LeadDetailsResponseEnvelope(ApiModel):
    data: LeadDetailsResponse


class ActivityListResponse(ApiModel):
    data: list[ActivityResponse]


class ActivityResponseEnvelope(ApiModel):
    data: ActivityResponse


class DealListResponse(ApiModel):
    data: list[DealResponse]


class DealResponseEnvelope(ApiModel):
    data: DealResponse


class TaskListResponse(ApiModel):
    data: list[TaskResponse]


class TaskResponseEnvelope(ApiModel):
    data: TaskResponse


class DashboardResponseEnvelope(ApiModel):
    data: DashboardData


class DeleteData(ApiModel):
    id: str


class DeleteResponse(ApiModel):
    data: DeleteData


class ErrorResponse(ApiModel):
    error: str
    fields: dict[str, list[str]] | None = None


class HealthResponse(ApiModel):
    status: str
