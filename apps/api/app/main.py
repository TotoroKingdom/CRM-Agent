from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from app.api.errors import install_exception_handlers
from app.api.router import api_router

app = FastAPI(
    title="CrossFlow CRM API",
    version="0.1.0",
    description="Local-only CRM API compatible with the legacy Next.js handlers.",
)

install_exception_handlers(app)
app.include_router(api_router)


def custom_openapi() -> dict:
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    for path_item in schema.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict):
                operation.get("responses", {}).pop("422", None)
    schemas = schema.get("components", {}).get("schemas", {})
    schemas.pop("HTTPValidationError", None)
    schemas.pop("ValidationError", None)
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi
