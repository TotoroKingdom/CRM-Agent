from fastapi.testclient import TestClient

from tests.helpers import create_lead, create_task


def test_shopify_to_proposal_to_task_completion_dashboard_loop(client: TestClient) -> None:
    lead = create_lead(client, channel="SHOPIFY", note="虚构闭环客户")

    activity = client.post(
        f"/api/leads/{lead['id']}/activities",
        json={
            "type": "CALL",
            "content": "电话确认了独立站增长需求。",
            "occurredAt": "2026-11-07T03:00:00.000Z",
        },
    )
    assert activity.status_code == 201

    deal = client.post(
        "/api/deals",
        json={
            "leadId": lead["id"],
            "title": "独立站增长方案",
            "amountCents": 5_000_000,
            "stage": "DISCOVERY",
            "expectedCloseAt": "2026-11-22T01:00:00.000Z",
        },
    ).json()["data"]
    proposal = client.patch(f"/api/deals/{deal['id']}", json={"stage": "PROPOSAL"})
    assert proposal.json()["data"]["stage"] == "PROPOSAL"

    task = create_task(
        client,
        lead["id"],
        title="明天联系客户确认报价",
        due_at="2026-11-07T08:00:00.000Z",
    )

    before = client.get("/api/dashboard").json()["data"]["stats"]
    assert before["leadCount"] == 1
    assert before["activeDealCount"] == 1
    assert before["expectedAmountCents"] == 5_000_000
    assert before["todayTaskCount"] == 1
    assert before["overdueTaskCount"] == 0

    completed = client.patch(f"/api/tasks/{task['id']}", json={"completed": True})
    assert completed.status_code == 200
    after = client.get("/api/dashboard").json()["data"]["stats"]
    assert after["todayTaskCount"] == 0
    assert after["expectedAmountCents"] == 5_000_000

    detail = client.get(f"/api/leads/{lead['id']}").json()["data"]
    assert detail["activities"][0]["id"] == activity.json()["data"]["id"]
    assert detail["deals"][0]["stage"] == "PROPOSAL"
    assert detail["tasks"][0]["completedAt"] is not None


def test_dashboard_uses_beijing_calendar_day(client: TestClient) -> None:
    lead = create_lead(client)
    create_task(
        client,
        lead["id"],
        title="北京时间前一天任务",
        due_at="2026-11-06T15:59:00.000Z",
    )
    create_task(
        client,
        lead["id"],
        title="北京时间当天任务",
        due_at="2026-11-07T08:00:00.000Z",
    )
    create_task(
        client,
        lead["id"],
        title="北京时间明天任务",
        due_at="2026-11-07T16:00:00.000Z",
    )

    dashboard = client.get("/api/dashboard").json()["data"]
    assert dashboard["stats"]["todayTaskCount"] == 1
    assert dashboard["stats"]["overdueTaskCount"] == 1
    assert [task["title"] for task in dashboard["tasks"]] == [
        "北京时间前一天任务",
        "北京时间当天任务",
    ]
