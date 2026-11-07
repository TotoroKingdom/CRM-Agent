from fastapi.testclient import TestClient

from tests.helpers import create_lead, create_task


def test_activity_path_owns_lead_id_and_timeline_order(client: TestClient) -> None:
    lead = create_lead(client)
    other = create_lead(client, name="另一个客户", company="另一家公司")

    first = client.post(
        f"/api/leads/{lead['id']}/activities",
        json={
            "leadId": other["id"],
            "type": "CALL",
            "content": "电话确认需求",
            "occurredAt": "2026-11-07T03:00:00.000Z",
        },
    )
    assert first.status_code == 201
    assert first.json()["data"]["leadId"] == lead["id"]

    second = client.post(
        f"/api/leads/{lead['id']}/activities",
        json={
            "type": "NOTE",
            "content": "记录决策人",
            "occurredAt": "2026-11-07T05:00:00.000Z",
        },
    )
    assert second.status_code == 201

    timeline = client.get(f"/api/leads/{lead['id']}/activities").json()["data"]
    assert [item["content"] for item in timeline] == ["记录决策人", "电话确认需求"]
    assert client.get(f"/api/leads/{other['id']}/activities").json()["data"] == []


def test_deal_create_patch_and_preserve_null_semantics(client: TestClient) -> None:
    lead = create_lead(client)
    created = client.post(
        "/api/deals",
        json={
            "leadId": lead["id"],
            "title": "独立站增长方案",
            "amountCents": 5_000_000,
            "stage": "DISCOVERY",
            "expectedCloseAt": "2026-11-22T01:00:00.000Z",
        },
    )
    assert created.status_code == 201
    deal = created.json()["data"]
    assert deal["leadName"] == "橙海贸易"
    assert deal["company"] == "橙海贸易有限公司"
    assert deal["amountCents"] == 5_000_000

    proposal = client.patch(
        f"/api/deals/{deal['id']}",
        json={"stage": "PROPOSAL", "amountCents": 5_500_000},
    )
    assert proposal.status_code == 200
    assert proposal.json()["data"]["stage"] == "PROPOSAL"
    assert proposal.json()["data"]["title"] == "独立站增长方案"
    assert proposal.json()["data"]["expectedCloseAt"] == "2026-11-22T01:00:00.000Z"

    cleared = client.patch(f"/api/deals/{deal['id']}", json={"expectedCloseAt": None})
    assert cleared.status_code == 200
    assert cleared.json()["data"]["expectedCloseAt"] is None

    assert client.get("/api/deals", params={"leadId": "missing"}).json()["data"] == []
    invalid = client.post(
        "/api/deals",
        json={
            "leadId": lead["id"],
            "title": "负数",
            "amountCents": -1,
            "stage": "DISCOVERY",
        },
    )
    assert invalid.status_code == 400
    assert "amountCents" in invalid.json()["fields"]


def test_task_filters_completion_restore_and_dashboard_counter(client: TestClient) -> None:
    lead = create_lead(client)
    task = create_task(
        client,
        lead["id"],
        title="明天联系客户确认报价",
        due_at="2026-11-07T08:00:00.000Z",
    )

    assert [item["id"] for item in client.get("/api/tasks?filter=open").json()["data"]] == [
        task["id"]
    ]
    assert client.get("/api/tasks?filter=done").json()["data"] == []
    assert [item["id"] for item in client.get("/api/tasks?filter=overdue").json()["data"]] == [
        task["id"]
    ]
    assert [item["id"] for item in client.get("/api/tasks?filter=all").json()["data"]] == [
        task["id"]
    ]

    completed = client.patch(f"/api/tasks/{task['id']}", json={"completed": True})
    assert completed.status_code == 200
    assert completed.json()["data"]["completedAt"] is not None
    assert client.get("/api/tasks?filter=done").json()["data"][0]["id"] == task["id"]
    assert client.get("/api/tasks?filter=open").json()["data"] == []

    renamed = client.patch(f"/api/tasks/{task['id']}", json={"title": "更新后的任务"})
    assert renamed.status_code == 200
    assert renamed.json()["data"]["completedAt"] == completed.json()["data"]["completedAt"]

    restored = client.patch(f"/api/tasks/{task['id']}", json={"completed": False})
    assert restored.json()["data"]["completedAt"] is None

    invalid_null = client.patch(f"/api/tasks/{task['id']}", json={"completed": None})
    assert invalid_null.status_code == 400
    assert "completed" in invalid_null.json()["fields"]

    invalid_filter = client.get("/api/tasks?filter=pending-forever")
    assert invalid_filter.status_code == 400
    assert "filter" in invalid_filter.json()["fields"]
