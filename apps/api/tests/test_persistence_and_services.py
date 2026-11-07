from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.core.time import beijing_day_bounds
from app.db.session import create_db_engine, get_db
from app.main import app
from app.schemas.crm import DealCreate, LeadCreate
from app.services.crm import CrmService
from tests.helpers import create_lead, create_task, lead_payload


def test_data_survives_connection_close_and_app_restart(
    database_path: Path, session_factory: sessionmaker[Session], client: TestClient
) -> None:
    lead = create_lead(client)

    reopened_engine = create_db_engine(database_path)
    reopened_factory = sessionmaker(bind=reopened_engine, expire_on_commit=False)

    def override_get_db():
        with reopened_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as reopened_client:
            response = reopened_client.get(f"/api/leads/{lead['id']}")
            assert response.status_code == 200
            assert response.json()["data"]["name"] == "橙海贸易"
    finally:
        app.dependency_overrides.clear()
        reopened_engine.dispose()


def test_cascade_delete_removes_deals_activities_and_tasks(client: TestClient) -> None:
    lead = create_lead(client)
    deal = client.post(
        "/api/deals",
        json={
            "leadId": lead["id"],
            "title": "级联测试商机",
            "amountCents": 500_000,
            "stage": "DISCOVERY",
        },
    )
    assert deal.status_code == 201
    activity = client.post(
        f"/api/leads/{lead['id']}/activities",
        json={
            "type": "NOTE",
            "content": "级联测试互动",
            "occurredAt": "2026-11-07T02:00:00.000Z",
        },
    )
    assert activity.status_code == 201
    create_task(
        client,
        lead["id"],
        title="级联测试任务",
        due_at="2026-11-08T02:00:00.000Z",
    )

    assert client.delete(f"/api/leads/{lead['id']}").status_code == 200
    assert client.get("/api/deals").json()["data"] == []
    assert client.get("/api/tasks?filter=all").json()["data"] == []
    stats = client.get("/api/dashboard").json()["data"]["stats"]
    assert stats["leadCount"] == 0
    assert stats["activeDealCount"] == 0


def test_service_and_repository_unit_boundaries(db_session: Session) -> None:
    service = CrmService(db_session)
    lead = service.create_lead(LeadCreate(**lead_payload(name="服务层客户", company="服务层公司")))
    assert service.list_leads(search="服务层")[0].id == lead.id
    assert service.list_leads(channel="WEBSITE") == []

    deal = service.create_deal(
        DealCreate(
            leadId=lead.id,
            title="服务层商机",
            amountCents=1_000,
            stage="DISCOVERY",
        )
    )
    assert deal.lead_id == lead.id
    assert service.entity_counts() == {"leads": 1, "deals": 1, "activities": 0, "tasks": 0}


def test_beijing_day_bounds_match_legacy_values() -> None:
    start, end = beijing_day_bounds("2026-11-07T12:00:00.000Z")
    assert start == "2026-11-06T16:00:00.000Z"
    assert end == "2026-11-07T15:59:59.999Z"
