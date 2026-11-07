from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.db.session import create_db_engine, get_db
from app.main import app
from app.models import Activity, Deal, FollowupTask, Lead  # noqa: F401


@pytest.fixture(autouse=True)
def fixed_api_clock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.services.crm.utc_now_iso",
        lambda: "2026-11-07T10:00:00.000Z",
    )
    monkeypatch.setattr(
        "app.services.crm.beijing_day_bounds",
        lambda: ("2026-11-06T16:00:00.000Z", "2026-11-07T15:59:59.999Z"),
    )


@pytest.fixture
def database_path(tmp_path: Path) -> Path:
    return tmp_path / "crm-test.sqlite"


@pytest.fixture
def session_factory(database_path: Path) -> Generator[sessionmaker[Session], None, None]:
    engine = create_db_engine(database_path)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    try:
        yield factory
    finally:
        engine.dispose()


@pytest.fixture
def db_session(session_factory: sessionmaker[Session]) -> Generator[Session, None, None]:
    with session_factory() as session:
        yield session


@pytest.fixture
def client(session_factory: sessionmaker[Session]) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
