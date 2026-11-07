from fastapi.testclient import TestClient


def test_openapi_exposes_eight_compatible_paths_and_camel_case_models(
    client: TestClient,
) -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()

    assert set(schema["paths"]) == {
        "/api/dashboard",
        "/api/leads",
        "/api/leads/{lead_id}",
        "/api/leads/{lead_id}/activities",
        "/api/deals",
        "/api/deals/{deal_id}",
        "/api/tasks",
        "/api/tasks/{task_id}",
        "/health",
    }
    assert set(schema["paths"]["/api/leads"]["get"]["responses"]) >= {"200", "400"}
    assert all(
        "422" not in operation["responses"]
        for path_item in schema["paths"].values()
        for operation in path_item.values()
        if isinstance(operation, dict)
    )
    assert "HTTPValidationError" not in schema["components"]["schemas"]
    lead_properties = schema["components"]["schemas"]["LeadResponse"]["properties"]
    assert {"dealCount", "openTaskCount", "createdAt", "updatedAt"} <= set(lead_properties)
    assert "leadId" in schema["components"]["schemas"]["DealResponse"]["properties"]


def test_health_remains_available(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}
