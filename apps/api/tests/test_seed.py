from sqlalchemy.orm import Session, sessionmaker

from app.models import Lead
from app.scripts.seed import seed_demo_data


def test_explicit_seed_is_idempotent_and_preserves_user_data(
    session_factory: sessionmaker[Session],
) -> None:
    with session_factory() as session:
        first = seed_demo_data(session)

    assert first["seeded"] is True
    assert first["counts"] == {"leads": 24, "deals": 10, "activities": 20, "tasks": 12}

    with session_factory() as session:
        session.add(
            Lead(
                id="user-lead",
                name="用户创建客户",
                company="用户创建公司",
                email=None,
                phone=None,
                channel="REFERRAL",
                status="QUALIFIED",
                priority="MEDIUM",
                country=None,
                note=None,
                created_at="2026-11-07T00:00:00.000Z",
                updated_at="2026-11-07T00:00:00.000Z",
            )
        )
        session.commit()

    with session_factory() as session:
        second = seed_demo_data(session)
        assert session.get(Lead, "user-lead") is not None

    assert second["seeded"] is False
    assert second["counts"] == {"leads": 25, "deals": 10, "activities": 20, "tasks": 12}
