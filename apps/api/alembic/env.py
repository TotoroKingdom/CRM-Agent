from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import Connection

from alembic import context
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import create_db_engine
from app.models import Activity, Deal, FollowupTask, Lead  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _database_url() -> str:
    path = Path(get_settings().crm_database_path)
    return f"sqlite+pysqlite:///{path.as_posix()}"


def run_migrations_offline() -> None:
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def _run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_db_engine(get_settings().crm_database_path)
    with engine.connect() as connection:
        _run_migrations(connection)
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
