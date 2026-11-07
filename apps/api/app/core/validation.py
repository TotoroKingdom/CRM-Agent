import re
from typing import Any

from pydantic import ValidationError

from app.core.exceptions import InputValidationError

ISO_DATETIME_PATTERN = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$"
)
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_iso_datetime(value: str) -> str:
    if not ISO_DATETIME_PATTERN.match(value):
        raise ValueError("时间必须是包含时区的 ISO 8601 字符串")
    from app.core.time import parse_iso_datetime

    try:
        parse_iso_datetime(value)
    except ValueError as exc:
        raise ValueError("时间必须是包含时区的 ISO 8601 字符串") from exc
    return value


def validate_optional_iso_datetime(value: str | None) -> str | None:
    return None if value is None else validate_iso_datetime(value)


def validate_optional_email(value: str | None) -> str | None:
    if value is not None and not EMAIL_PATTERN.match(value):
        raise ValueError("邮箱格式不正确")
    return value


def validation_fields(exc: ValidationError, *, prefix: str | None = None) -> dict[str, list[str]]:
    fields: dict[str, list[str]] = {}
    for error in exc.errors():
        location = [str(part) for part in error["loc"]]
        if prefix and location and location[0] == prefix:
            location = location[1:]
        name = ".".join(location) or "body"
        fields.setdefault(name, []).append(str(error["msg"]))
    return fields


def parse_model(model_type: type[Any], payload: dict[str, Any]) -> Any:
    try:
        return model_type.model_validate(payload)
    except ValidationError as exc:
        raise InputValidationError(validation_fields(exc)) from exc
