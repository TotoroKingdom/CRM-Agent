from fastapi.testclient import TestClient

from app.main import app


def test_health_and_openapi_are_available() -> None:
    client = TestClient(app)

    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

    schema = client.get("/openapi.json")
    assert schema.status_code == 200
    assert schema.json()["info"]["title"] == "CrossFlow CRM API"
