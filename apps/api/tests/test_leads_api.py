from fastapi.testclient import TestClient

from tests.helpers import create_lead, lead_payload


def test_lead_crud_search_filter_and_details(client: TestClient) -> None:
    lead = create_lead(client)

    assert lead["name"] == "橙海贸易"
    assert lead["channel"] == "SHOPIFY"
    assert lead["dealCount"] == 0
    assert lead["openTaskCount"] == 0

    listed = client.get("/api/leads", params={"search": "橙海"}).json()["data"]
    assert [item["id"] for item in listed] == [lead["id"]]
    assert client.get("/api/leads", params={"status": "NEW"}).json()["data"]
    assert client.get("/api/leads", params={"channel": "WEBSITE"}).json()["data"] == []
    assert client.get("/api/leads", params={"unknown": "ignored"}).status_code == 200

    detail = client.get(f"/api/leads/{lead['id']}")
    assert detail.status_code == 200
    assert detail.json()["data"]["activities"] == []
    assert detail.json()["data"]["deals"] == []
    assert detail.json()["data"]["tasks"] == []

    updated = client.patch(f"/api/leads/{lead['id']}", json={"name": "橙海贸易（已联系）"})
    assert updated.status_code == 200
    assert updated.json()["data"]["name"] == "橙海贸易（已联系）"
    assert updated.json()["data"]["email"] == "sales@example.test"

    cleared = client.patch(f"/api/leads/{lead['id']}", json={"email": None})
    assert cleared.status_code == 200
    assert cleared.json()["data"]["email"] is None

    deleted = client.delete(f"/api/leads/{lead['id']}")
    assert deleted.status_code == 200
    assert deleted.json() == {"data": {"id": lead["id"]}}
    assert client.get(f"/api/leads/{lead['id']}").status_code == 404


def test_lead_patch_rejects_explicit_null_for_required_fields(client: TestClient) -> None:
    lead = create_lead(client)
    response = client.patch(f"/api/leads/{lead['id']}", json={"name": None})
    assert response.status_code == 400
    assert "name" in response.json()["fields"]


def test_lead_validation_errors_use_legacy_envelope(client: TestClient) -> None:
    response = client.post(
        "/api/leads",
        json={
            "name": "",
            "company": "",
            "channel": "WECHAT",
            "status": "NEW",
            "priority": "LOW",
        },
    )
    assert response.status_code == 400
    body = response.json()
    assert body["error"] == "输入校验失败"
    assert set(body["fields"]) == {"name", "company", "channel"}
    assert body["fields"]["channel"] == [
        'Invalid option: expected one of "WEBSITE"|"SHOPIFY"|"AMAZON"|"TIKTOK"|"REFERRAL"|"OTHER"'
    ]

    invalid_query = client.get("/api/leads", params={"status": "WECHAT"})
    assert invalid_query.status_code == 400
    assert invalid_query.json()["fields"]["status"][0].startswith("Invalid option:")

    invalid_email = client.post("/api/leads", json=lead_payload(email="not-an-email"))
    assert invalid_email.status_code == 400
    assert "email" in invalid_email.json()["fields"]


def test_invalid_json_and_missing_objects_are_mapped(client: TestClient) -> None:
    malformed = client.post(
        "/api/leads",
        content="{not-json",
        headers={"Content-Type": "application/json"},
    )
    assert malformed.status_code == 400
    assert malformed.json() == {"error": "请求内容不是有效 JSON"}

    empty = client.post("/api/leads", content="", headers={"Content-Type": "application/json"})
    assert empty.status_code == 400
    assert empty.json() == {"error": "请求内容不是有效 JSON"}

    assert client.get("/api/leads/missing").status_code == 404
    assert client.get("/api/leads/missing").json() == {"error": "线索不存在"}
    assert client.get("/api/leads/missing/activities").status_code == 404
    assert client.patch("/api/deals/missing", json={"title": "x"}).status_code == 404
    assert client.patch("/api/tasks/missing", json={"title": "x"}).status_code == 404
