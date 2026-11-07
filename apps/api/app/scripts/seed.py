import argparse
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import REPOSITORY_ROOT
from app.db.session import create_db_engine
from app.models import Activity, Deal, FollowupTask, Lead

CHANNELS = ("WEBSITE", "SHOPIFY", "AMAZON", "TIKTOK", "REFERRAL", "OTHER")
STATUSES = ("NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED")
PRIORITIES = ("HIGH", "MEDIUM", "LOW")
STAGES = ("DISCOVERY", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST")
ACTIVITY_TYPES = ("CALL", "EMAIL", "MESSAGE", "MEETING", "NOTE")


def _timestamp() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _counts(session: Session) -> dict[str, int]:
    return {
        "leads": int(session.scalar(select(func.count()).select_from(Lead)) or 0),
        "deals": int(session.scalar(select(func.count()).select_from(Deal)) or 0),
        "activities": int(session.scalar(select(func.count()).select_from(Activity)) or 0),
        "tasks": int(session.scalar(select(func.count()).select_from(FollowupTask)) or 0),
    }


def seed_demo_data(session: Session) -> dict[str, Any]:
    timestamp = _timestamp()
    with session.begin():
        existing = _counts(session)
        if any(existing.values()):
            return {"seeded": False, "counts": existing}

        leads: list[Lead] = []
        deals: list[Deal] = []
        activities: list[Activity] = []
        tasks: list[FollowupTask] = []

        for index in range(24):
            lead_id = str(uuid4())
            suffix = f" {index + 1}" if index >= 6 else ""
            leads.append(
                Lead(
                    id=lead_id,
                    name=["林晓雯", "Daniel Wong", "周子昂", "Mia Chen", "王嘉诚", "Sofia Liu"][
                        index % 6
                    ]
                    + suffix,
                    company=[
                        "星河家居",
                        "Harbor Outdoor",
                        "青岚科技",
                        "Mango Supply",
                        "南风美妆",
                        "Atlas Living",
                    ][index % 6],
                    email=f"demo-{index + 1}@example.test",
                    phone=f"+86 138 0000 {str(1000 + index)[-4:]}",
                    channel=CHANNELS[index % len(CHANNELS)],
                    status=STATUSES[index % len(STATUSES)],
                    priority=PRIORITIES[index % len(PRIORITIES)],
                    country=["中国", "新加坡", "马来西亚", "美国", "英国"][index % 5],
                    note="演示数据：虚构客户，不代表真实业务记录。",
                    created_at=timestamp,
                    updated_at=timestamp,
                )
            )

        for index in range(10):
            lead = leads[index % len(leads)]
            deals.append(
                Deal(
                    id=str(uuid4()),
                    lead_id=lead.id,
                    title=[
                        "独立站增长方案",
                        "Amazon 客服自动化",
                        "TikTok 内容运营",
                        "跨境销售助手",
                    ][index % 4],
                    amount_cents=[8600000, 12800000, 15800000, 23600000][index % 4],
                    stage=STAGES[index % len(STAGES)],
                    expected_close_at=(datetime(2026, 11, 10, tzinfo=UTC) + timedelta(days=index))
                    .isoformat(timespec="milliseconds")
                    .replace("+00:00", "Z"),
                    created_at=timestamp,
                    updated_at=timestamp,
                )
            )

        for index in range(20):
            lead = leads[index % len(leads)]
            activities.append(
                Activity(
                    id=str(uuid4()),
                    lead_id=lead.id,
                    type=ACTIVITY_TYPES[index % len(ACTIVITY_TYPES)],
                    content=[
                        "已确认客户当前的渠道投放目标。",
                        "发送了行业案例和初步方案。",
                        "客户回复了采购预算区间。",
                        "完成首次需求访谈。",
                        "记录客户的关键决策人信息。",
                    ][index % 5],
                    occurred_at=(datetime(2026, 11, max(1, 7 - index // 4), 2 + index, tzinfo=UTC))
                    .isoformat(timespec="milliseconds")
                    .replace("+00:00", "Z"),
                    created_at=timestamp,
                )
            )

        for index in range(12):
            lead = leads[(index + 2) % len(leads)]
            tasks.append(
                FollowupTask(
                    id=str(uuid4()),
                    lead_id=lead.id,
                    title=[
                        "发送第一版报价与案例",
                        "确认店铺月均订单量",
                        "安排下一次需求会议",
                        "补充客户联系人信息",
                    ][index % 4],
                    due_at=(datetime(2026, 11, 5 + index, 2, tzinfo=UTC))
                    .isoformat(timespec="milliseconds")
                    .replace("+00:00", "Z"),
                    completed_at=None,
                    created_at=timestamp,
                    updated_at=timestamp,
                )
            )

        session.add_all(leads)
        session.flush()
        session.add_all(deals)
        session.add_all(activities)
        session.add_all(tasks)
    return {"seeded": True, "counts": _counts(session)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed explicit fictional CRM demo data")
    parser.add_argument(
        "--database",
        type=Path,
        default=REPOSITORY_ROOT / "data" / "crm.sqlite",
    )
    args = parser.parse_args()
    engine = create_db_engine(args.database)
    try:
        with Session(engine) as session:
            print(json.dumps(seed_demo_data(session), ensure_ascii=False, indent=2))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
