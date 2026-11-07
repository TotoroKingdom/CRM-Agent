from dataclasses import dataclass
from typing import Any

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.models import Activity, Deal, FollowupTask, Lead


@dataclass
class LeadRow:
    lead: Lead
    deal_count: int
    open_task_count: int


@dataclass
class DealRow:
    deal: Deal
    lead_name: str
    company: str


@dataclass
class ActivityRow:
    activity: Activity
    lead_name: str
    company: str


@dataclass
class TaskRow:
    task: FollowupTask
    lead_name: str
    company: str


class CrmRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_leads(
        self,
        *,
        search: str | None = None,
        status: str | None = None,
        channel: str | None = None,
    ) -> list[LeadRow]:
        deal_count = (
            select(func.count(Deal.id))
            .where(Deal.lead_id == Lead.id)
            .correlate(Lead)
            .scalar_subquery()
        )
        open_task_count = (
            select(func.count(FollowupTask.id))
            .where(
                FollowupTask.lead_id == Lead.id,
                FollowupTask.completed_at.is_(None),
            )
            .correlate(Lead)
            .scalar_subquery()
        )
        statement = select(
            Lead,
            deal_count.label("deal_count"),
            open_task_count.label("open_task_count"),
        )
        if search:
            pattern = f"%{search.strip()}%"
            statement = statement.where(
                or_(
                    Lead.name.like(pattern),
                    Lead.company.like(pattern),
                    func.coalesce(Lead.email, "").like(pattern),
                )
            )
        if status:
            statement = statement.where(Lead.status == status)
        if channel:
            statement = statement.where(Lead.channel == channel)
        statement = statement.order_by(Lead.updated_at.desc())
        return [
            LeadRow(lead=row[0], deal_count=int(row[1] or 0), open_task_count=int(row[2] or 0))
            for row in self.session.execute(statement).all()
        ]

    def get_lead(self, lead_id: str) -> LeadRow | None:
        deal_count = (
            select(func.count(Deal.id))
            .where(Deal.lead_id == Lead.id)
            .correlate(Lead)
            .scalar_subquery()
        )
        open_task_count = (
            select(func.count(FollowupTask.id))
            .where(
                FollowupTask.lead_id == Lead.id,
                FollowupTask.completed_at.is_(None),
            )
            .correlate(Lead)
            .scalar_subquery()
        )
        row = self.session.execute(
            select(
                Lead,
                deal_count.label("deal_count"),
                open_task_count.label("open_task_count"),
            ).where(Lead.id == lead_id)
        ).first()
        if row is None:
            return None
        return LeadRow(row[0], int(row[1] or 0), int(row[2] or 0))

    def get_lead_model(self, lead_id: str) -> Lead | None:
        return self.session.get(Lead, lead_id)

    def add_lead(self, values: dict[str, Any]) -> Lead:
        lead = Lead(**values)
        self.session.add(lead)
        self.session.flush()
        return lead

    def delete_lead(self, lead: Lead) -> None:
        self.session.delete(lead)

    def list_deals(self, *, lead_id: str | None = None) -> list[DealRow]:
        statement = (
            select(Deal, Lead.name, Lead.company)
            .join(Lead, Lead.id == Deal.lead_id)
            .order_by(
                case(
                    (Deal.stage == "WON", 6),
                    (Deal.stage == "LOST", 7),
                    else_=1,
                ),
                Deal.updated_at.desc(),
            )
        )
        if lead_id:
            statement = statement.where(Deal.lead_id == lead_id)
        return [
            DealRow(deal=row[0], lead_name=row[1], company=row[2])
            for row in self.session.execute(statement).all()
        ]

    def get_deal(self, deal_id: str) -> DealRow | None:
        row = self.session.execute(
            select(Deal, Lead.name, Lead.company)
            .join(Lead, Lead.id == Deal.lead_id)
            .where(Deal.id == deal_id)
        ).first()
        return None if row is None else DealRow(row[0], row[1], row[2])

    def get_deal_model(self, deal_id: str) -> Deal | None:
        return self.session.get(Deal, deal_id)

    def add_deal(self, values: dict[str, Any]) -> Deal:
        deal = Deal(**values)
        self.session.add(deal)
        self.session.flush()
        return deal

    def list_activities(self, *, lead_id: str | None = None) -> list[ActivityRow]:
        statement = (
            select(Activity, Lead.name, Lead.company)
            .join(Lead, Lead.id == Activity.lead_id)
            .order_by(Activity.occurred_at.desc())
        )
        if lead_id:
            statement = statement.where(Activity.lead_id == lead_id)
        return [
            ActivityRow(activity=row[0], lead_name=row[1], company=row[2])
            for row in self.session.execute(statement).all()
        ]

    def get_activity(self, activity_id: str) -> ActivityRow | None:
        row = self.session.execute(
            select(Activity, Lead.name, Lead.company)
            .join(Lead, Lead.id == Activity.lead_id)
            .where(Activity.id == activity_id)
        ).first()
        return None if row is None else ActivityRow(row[0], row[1], row[2])

    def add_activity(self, values: dict[str, Any]) -> Activity:
        activity = Activity(**values)
        self.session.add(activity)
        self.session.flush()
        return activity

    def list_tasks(
        self,
        *,
        lead_id: str | None = None,
        completed: bool | None = None,
        overdue_before: str | None = None,
        due_before: str | None = None,
    ) -> list[TaskRow]:
        statement = (
            select(FollowupTask, Lead.name, Lead.company)
            .join(Lead, Lead.id == FollowupTask.lead_id)
            .order_by(
                case((FollowupTask.completed_at.is_(None), 0), else_=1),
                FollowupTask.due_at.asc(),
            )
        )
        if lead_id:
            statement = statement.where(FollowupTask.lead_id == lead_id)
        if completed is True:
            statement = statement.where(FollowupTask.completed_at.is_not(None))
        elif completed is False:
            statement = statement.where(FollowupTask.completed_at.is_(None))
        if overdue_before:
            statement = statement.where(FollowupTask.due_at < overdue_before)
        if due_before:
            statement = statement.where(
                func.datetime(FollowupTask.due_at) <= func.datetime(due_before)
            )
        return [
            TaskRow(task=row[0], lead_name=row[1], company=row[2])
            for row in self.session.execute(statement).all()
        ]

    def get_task(self, task_id: str) -> TaskRow | None:
        row = self.session.execute(
            select(FollowupTask, Lead.name, Lead.company)
            .join(Lead, Lead.id == FollowupTask.lead_id)
            .where(FollowupTask.id == task_id)
        ).first()
        return None if row is None else TaskRow(row[0], row[1], row[2])

    def get_task_model(self, task_id: str) -> FollowupTask | None:
        return self.session.get(FollowupTask, task_id)

    def add_task(self, values: dict[str, Any]) -> FollowupTask:
        task = FollowupTask(**values)
        self.session.add(task)
        self.session.flush()
        return task

    def entity_counts(self) -> dict[str, int]:
        return {
            "leads": int(self.session.scalar(select(func.count()).select_from(Lead)) or 0),
            "deals": int(self.session.scalar(select(func.count()).select_from(Deal)) or 0),
            "activities": int(self.session.scalar(select(func.count()).select_from(Activity)) or 0),
            "tasks": int(self.session.scalar(select(func.count()).select_from(FollowupTask)) or 0),
        }

    def dashboard_counts(self, *, day_start: str, day_end: str) -> dict[str, int]:
        lead_count = int(self.session.scalar(select(func.count()).select_from(Lead)) or 0)
        active_deal_count = int(
            self.session.scalar(
                select(func.count()).select_from(Deal).where(Deal.stage.not_in(("WON", "LOST")))
            )
            or 0
        )
        expected_amount = int(
            self.session.scalar(
                select(func.coalesce(func.sum(Deal.amount_cents), 0)).where(
                    Deal.stage.not_in(("WON", "LOST"))
                )
            )
            or 0
        )
        today_task_count = int(
            self.session.scalar(
                select(func.count())
                .select_from(FollowupTask)
                .where(
                    FollowupTask.completed_at.is_(None),
                    func.datetime(FollowupTask.due_at) >= func.datetime(day_start),
                    func.datetime(FollowupTask.due_at) <= func.datetime(day_end),
                )
            )
            or 0
        )
        overdue_task_count = int(
            self.session.scalar(
                select(func.count())
                .select_from(FollowupTask)
                .where(
                    FollowupTask.completed_at.is_(None),
                    func.datetime(FollowupTask.due_at) < func.datetime(day_start),
                )
            )
            or 0
        )
        return {
            "lead_count": lead_count,
            "active_deal_count": active_deal_count,
            "expected_amount_cents": expected_amount,
            "today_task_count": today_task_count,
            "overdue_task_count": overdue_task_count,
        }
