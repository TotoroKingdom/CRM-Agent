import logging
import re
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import DomainNotFoundError
from app.schemas.crm import ErrorResponse

logger = logging.getLogger(__name__)

VALIDATION_RESPONSES = {
    400: {"model": ErrorResponse, "description": "请求内容或字段校验失败"},
    500: {"model": ErrorResponse, "description": "未预期服务端错误"},
}

NOT_FOUND_RESPONSES = {
    404: {"model": ErrorResponse, "description": "对象不存在"},
}


def _error_location(location: tuple[Any, ...]) -> str:
    parts = [str(part) for part in location]
    if parts and parts[0] in {"body", "query", "path"}:
        parts = parts[1:]
    return ".".join(parts) or "body"


def _is_invalid_json(errors: list[dict[str, Any]]) -> bool:
    if any(error.get("type") == "json_invalid" for error in errors):
        return True
    return bool(errors) and all(
        error.get("type") == "missing" and tuple(error.get("loc", ())) == ("body",)
        for error in errors
    )


def _enum_message(error: dict[str, Any]) -> str | None:
    if error.get("type") != "enum":
        return None
    expected = str(error.get("ctx", {}).get("expected", ""))
    values = re.findall(r"'([^']+)'", expected)
    if not values:
        return None
    return f"Invalid option: expected one of {'|'.join(f'"{value}"' for value in values)}"


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def request_validation_error_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = [dict(error) for error in exc.errors()]
        if _is_invalid_json(errors):
            return JSONResponse({"error": "请求内容不是有效 JSON"}, status_code=400)
        fields: dict[str, list[str]] = {}
        for error in errors:
            name = _error_location(tuple(error.get("loc", ())))
            message = _enum_message(error) or str(error.get("msg", "输入不合法"))
            fields.setdefault(name, []).append(message)
        return JSONResponse({"error": "输入校验失败", "fields": fields}, status_code=400)

    @app.exception_handler(DomainNotFoundError)
    async def not_found_handler(_request: Request, exc: DomainNotFoundError) -> JSONResponse:
        return JSONResponse({"error": exc.message}, status_code=404)

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled API error for %s", request.url.path, exc_info=exc)
        return JSONResponse({"error": "服务器暂时无法完成操作"}, status_code=500)
