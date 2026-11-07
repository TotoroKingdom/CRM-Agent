from typing import Any

from fastapi.testclient import TestClient


def lead_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": "橙海贸易",
        "company": "橙海贸易有限公司",
        "email": "sales@example.test",
        "phone": None,
        "channel": "SHOPIFY",
        "status": "NEW",
        "priority": "HIGH",
        "country": "中国",
        "note": "虚构测试客户",
    }
    payload.update(overrides)
    return payload


def create_lead(client: TestClient, **overrides: Any) -> dict[str, Any]:
    response = client.post("/api/leads", json=lead_payload(**overrides))
    assert response.status_code == 201, response.text
    return response.json()["data"]


def create_task(
    client: TestClient, lead_id: str, *, title: str = "联系客户", due_at: str
) -> dict[str, Any]:
    response = client.post(
        "/api/tasks",
        json={"leadId": lead_id, "title": title, "dueAt": due_at},
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]
