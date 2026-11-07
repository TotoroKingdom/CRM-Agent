from typing import Any
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.exceptions import DomainNotFoundError
from app.core.time import beijing_day_bounds, utc_now_iso
from app.repositories.crm import (
    ActivityRow,
    CrmRepository,
    DealRow,
    LeadRow,
    TaskRow,
)
from app.schemas.crm import (
    ActivityCreate,
    ActivityResponse,
    DashboardData,
    DashboardStats,
    DealCreate,
    DealResponse,
    DealUpdate,
    LeadCreate,
    LeadDetailsResponse,
    LeadResponse,
    LeadUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.schemas.enums import TaskFilter


class CrmService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = CrmRepository(session)

    def list_leads(
        self,
        *,
        search: str | None = None,
        status: str | None = None,
        channel: str | None = None,
    ) -> list[LeadResponse]:
        return [
            self._lead_response(row)
            for row in self.repository.list_leads(search=search, status=status, channel=channel)
        ]

    def get_lead(self, lead_id: str) -> LeadDetailsResponse:
        row = self.repository.get_lead(lead_id)
        if row is None:
            raise DomainNotFoundError("线索不存在")
        return LeadDetailsResponse(
            **self._lead_response(row).model_dump(),
            activities=[
                self._activity_response(item)
                for item in self.repository.list_activities(lead_id=lead_id)
            ],
            deals=[
                self._deal_response(item) for item in self.repository.list_deals(lead_id=lead_id)
            ],
            tasks=[
                self._task_response(item) for item in self.repository.list_tasks(lead_id=lead_id)
            ],
        )

    def create_lead(self, payload: LeadCreate) -> LeadResponse:
        timestamp = utc_now_iso()
        values = payload.model_dump(mode="json")
        values.update(id=str(uuid4()), created_at=timestamp, updated_at=timestamp)
        self.repository.add_lead(values)
        self.session.commit()
        created = self.repository.get_lead(values["id"])
        if created is None:
            raise RuntimeError("created lead could not be read back")
        return self._lead_response(created)

    def update_lead(self, lead_id: str, payload: LeadUpdate) -> LeadResponse:
        lead = self.repository.get_lead_model(lead_id)
        if lead is None:
            raise DomainNotFoundError("线索不存在")
        for field, value in payload.model_dump(mode="json", exclude_unset=True).items():
            setattr(lead, field, value)
        lead.updated_at = utc_now_iso()
        self.session.commit()
        updated = self.repository.get_lead(lead_id)
        if updated is None:
            raise RuntimeError("updated lead could not be read back")
        return self._lead_response(updated)

    def delete_lead(self, lead_id: str) -> None:
        lead = self.repository.get_lead_model(lead_id)
        if lead is None:
            raise DomainNotFoundError("线索不存在")
        self.repository.delete_lead(lead)
        self.session.commit()

    def list_deals(self, lead_id: str | None = None) -> list[DealResponse]:
        return [self._deal_response(row) for row in self.repository.list_deals(lead_id=lead_id)]

    def create_deal(self, payload: DealCreate) -> DealResponse:
        if self.repository.get_lead_model(payload.lead_id) is None:
            raise DomainNotFoundError("线索不存在")
        timestamp = utc_now_iso()
        values: dict[str, Any] = payload.model_dump(mode="json")
        values.update(id=str(uuid4()), created_at=timestamp, updated_at=timestamp)
        self.repository.add_deal(values)
        self.session.commit()
        created = self.repository.get_deal(values["id"])
        if created is None:
            raise RuntimeError("created deal could not be read back")
        return self._deal_response(created)

    def update_deal(self, deal_id: str, payload: DealUpdate) -> DealResponse:
        deal = self.repository.get_deal_model(deal_id)
        if deal is None:
            raise DomainNotFoundError("商机不存在")
        for field, value in payload.model_dump(mode="json", exclude_unset=True).items():
            setattr(deal, field, value)
        deal.updated_at = utc_now_iso()
        self.session.commit()
        updated = self.repository.get_deal(deal_id)
        if updated is None:
            raise RuntimeError("updated deal could not be read back")
        return self._deal_response(updated)

    def list_activities(self, lead_id: str) -> list[ActivityResponse]:
        if self.repository.get_lead_model(lead_id) is None:
            raise DomainNotFoundError("线索不存在")
        return [
            self._activity_response(row) for row in self.repository.list_activities(lead_id=lead_id)
        ]

    def create_activity(self, lead_id: str, payload: ActivityCreate) -> ActivityResponse:
        if self.repository.get_lead_model(lead_id) is None:
            raise DomainNotFoundError("线索不存在")
        values: dict[str, Any] = payload.model_dump(mode="json")
        values.update(id=str(uuid4()), lead_id=lead_id, created_at=utc_now_iso())
        self.repository.add_activity(values)
        self.session.commit()
        created = self.repository.get_activity(values["id"])
        if created is None:
            raise RuntimeError("created activity could not be read back")
        return self._activity_response(created)

    def list_tasks(self, filter_value: TaskFilter) -> list[TaskResponse]:
        if filter_value == TaskFilter.DONE:
            rows = self.repository.list_tasks(completed=True)
        elif filter_value in (TaskFilter.OPEN, TaskFilter.OVERDUE):
            rows_with_filter = self.repository.list_tasks(
                completed=False,
                overdue_before=utc_now_iso() if filter_value == TaskFilter.OVERDUE else None,
            )
            rows = rows_with_filter
        else:
            rows = self.repository.list_tasks()
        return [self._task_response(row) for row in rows]

    def create_task(self, payload: TaskCreate) -> TaskResponse:
        if self.repository.get_lead_model(payload.lead_id) is None:
            raise DomainNotFoundError("线索不存在")
        timestamp = utc_now_iso()
        values: dict[str, Any] = payload.model_dump(mode="json")
        values.update(
            id=str(uuid4()),
            completed_at=None,
            created_at=timestamp,
            updated_at=timestamp,
        )
        self.repository.add_task(values)
        self.session.commit()
        created = self.repository.get_task(values["id"])
        if created is None:
            raise RuntimeError("created task could not be read back")
        return self._task_response(created)

    def update_task(self, task_id: str, payload: TaskUpdate) -> TaskResponse:
        task = self.repository.get_task_model(task_id)
        if task is None:
            raise DomainNotFoundError("任务不存在")
        patch = payload.model_dump(mode="json", exclude_unset=True)
        completed = patch.pop("completed", None)
        for field, value in patch.items():
            setattr(task, field, value)
        if completed is True:
            task.completed_at = utc_now_iso()
        elif completed is False:
            task.completed_at = None
        task.updated_at = utc_now_iso()
        self.session.commit()
        updated = self.repository.get_task(task_id)
        if updated is None:
            raise RuntimeError("updated task could not be read back")
        return self._task_response(updated)

    def get_dashboard(self) -> DashboardData:
        day_start, day_end = beijing_day_bounds()
        counts = self.repository.dashboard_counts(day_start=day_start, day_end=day_end)
        return DashboardData(
            stats=DashboardStats(**counts),
            tasks=[
                self._task_response(row)
                for row in self.repository.list_tasks(completed=False, due_before=day_end)[:6]
            ],
            activities=[
                self._activity_response(row) for row in self.repository.list_activities()[:6]
            ],
            deals=[self._deal_response(row) for row in self.repository.list_deals()[:8]],
        )

    def entity_counts(self) -> dict[str, int]:
        return self.repository.entity_counts()

    @staticmethod
    def _lead_response(row: LeadRow) -> LeadResponse:
        lead = row.lead
        return LeadResponse(
            id=lead.id,
            name=lead.name,
            company=lead.company,
            email=lead.email,
            phone=lead.phone,
            channel=lead.channel,
            status=lead.status,
            priority=lead.priority,
            country=lead.country,
            note=lead.note,
            created_at=lead.created_at,
            updated_at=lead.updated_at,
            deal_count=row.deal_count,
            open_task_count=row.open_task_count,
        )

    @staticmethod
    def _deal_response(row: DealRow) -> DealResponse:
        deal = row.deal
        return DealResponse(
            id=deal.id,
            lead_id=deal.lead_id,
            lead_name=row.lead_name,
            company=row.company,
            title=deal.title,
            amount_cents=deal.amount_cents,
            stage=deal.stage,
            expected_close_at=deal.expected_close_at,
            created_at=deal.created_at,
            updated_at=deal.updated_at,
        )

    @staticmethod
    def _activity_response(row: ActivityRow) -> ActivityResponse:
        activity = row.activity
        return ActivityResponse(
            id=activity.id,
            lead_id=activity.lead_id,
            lead_name=row.lead_name,
            company=row.company,
            type=activity.type,
            content=activity.content,
            occurred_at=activity.occurred_at,
            created_at=activity.created_at,
        )

    @staticmethod
    def _task_response(row: TaskRow) -> TaskResponse:
        task = row.task
        return TaskResponse(
            id=task.id,
            lead_id=task.lead_id,
            lead_name=row.lead_name,
            company=row.company,
            title=task.title,
            due_at=task.due_at,
            completed_at=task.completed_at,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )
