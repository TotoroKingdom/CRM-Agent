from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

BEIJING = ZoneInfo("Asia/Shanghai")


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def format_utc(value: datetime) -> str:
    return value.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def beijing_day_bounds(reference_time: str | None = None) -> tuple[str, str]:
    instant = parse_iso_datetime(reference_time) if reference_time else datetime.now(UTC)
    local = instant.astimezone(BEIJING)
    start_local = local.replace(hour=0, minute=0, second=0, microsecond=0)
    end_local = start_local + timedelta(days=1) - timedelta(milliseconds=1)
    return format_utc(start_local), format_utc(end_local)


def parse_iso_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timezone offset is required")
    return parsed
