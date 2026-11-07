from pathlib import Path

from alembic.config import Config
from sqlalchemy import create_engine, inspect

from alembic import command
from app.core.config import get_settings

API_ROOT = Path(__file__).resolve().parents[1]


def test_alembic_upgrade_and_downgrade_on_empty_database(tmp_path: Path, monkeypatch) -> None:
    database_path = tmp_path / "migrated.sqlite"
    monkeypatch.setenv("CRM_DATABASE_PATH", str(database_path))
    get_settings.cache_clear()
    config = Config(str(API_ROOT / "alembic.ini"))

    command.upgrade(config, "head")
    engine = create_engine(f"sqlite+pysqlite:///{database_path.as_posix()}")
    try:
        tables = set(inspect(engine).get_table_names())
        assert {"alembic_version", "leads", "deals", "activities", "followup_tasks"} <= tables
    finally:
        engine.dispose()

    command.downgrade(config, "base")
    engine = create_engine(f"sqlite+pysqlite:///{database_path.as_posix()}")
    try:
        tables = set(inspect(engine).get_table_names())
        assert tables == {"alembic_version"}
    finally:
        engine.dispose()

    command.upgrade(config, "head")
    get_settings.cache_clear()
