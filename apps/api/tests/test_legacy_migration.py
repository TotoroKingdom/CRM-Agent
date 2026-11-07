import hashlib
import json
import sqlite3
from pathlib import Path

import pytest

from app.scripts.legacy_migration import (
    _connect_read_only,
    migrate_legacy_database,
    sha256_file,
    validate_legacy_database,
)
from app.scripts.rollback_migration import restore_backup

LEGACY_SCHEMA = """
PRAGMA foreign_keys = ON;
CREATE TABLE leads (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, company TEXT NOT NULL,
  email TEXT, phone TEXT, channel TEXT NOT NULL, status TEXT NOT NULL,
  priority TEXT NOT NULL, country TEXT, note TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE deals (
  id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL, amount_cents INTEGER NOT NULL, stage TEXT NOT NULL,
  expected_close_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE activities (
  id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL, content TEXT NOT NULL, occurred_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE followup_tasks (
  id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL, due_at TEXT NOT NULL, completed_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
"""


def _create_legacy_database(path: Path) -> None:
    with sqlite3.connect(path) as connection:
        connection.executescript(LEGACY_SCHEMA)
        connection.execute(
            """
            INSERT INTO leads
            (id, name, company, email, phone, channel, status, priority, country, note,
             created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "lead-1",
                "橙海贸易",
                "橙海贸易有限公司",
                "test@example.test",
                None,
                "SHOPIFY",
                "NEW",
                "HIGH",
                "中国",
                "旧库虚构客户",
                "2026-11-06T19:14:37.7Z",
                "2026-11-06T19:14:37.7Z",
            ),
        )
        connection.execute(
            """
            INSERT INTO deals
            (id, lead_id, title, amount_cents, stage, expected_close_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "deal-1",
                "lead-1",
                "独立站增长方案",
                5_000_000,
                "PROPOSAL",
                "2026-11-22T01:00:00.000Z",
                "2026-11-06T19:14:37.701Z",
                "2026-11-06T19:14:37.701Z",
            ),
        )
        connection.execute(
            """
            INSERT INTO activities
            (id, lead_id, type, content, occurred_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                "activity-1",
                "lead-1",
                "CALL",
                "电话确认需求",
                "2026-11-07T03:00:00.000Z",
                "2026-11-07T03:01:00.000Z",
            ),
        )
        connection.execute(
            """
            INSERT INTO followup_tasks
            (id, lead_id, title, due_at, completed_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "task-1",
                "lead-1",
                "明天联系客户",
                "2026-11-08T05:00:00.000Z",
                None,
                "2026-11-07T03:01:00.000Z",
                "2026-11-07T03:01:00.000Z",
            ),
        )


def _rows(path: Path, table: str) -> list[tuple[object, ...]]:
    with sqlite3.connect(path) as connection:
        return list(connection.execute(f"SELECT * FROM {table} ORDER BY id"))


def test_migrates_a_legacy_copy_with_backup_and_rollback(tmp_path: Path) -> None:
    source = tmp_path / "legacy.sqlite"
    _create_legacy_database(source)
    source_hash = sha256_file(source)
    target = tmp_path / "runtime" / "crm.sqlite"

    result = migrate_legacy_database(
        source,
        target,
        backup_dir=tmp_path / "backups",
    )

    assert sha256_file(source) == source_hash
    assert source_hash == result.source_sha256
    assert result.backup.exists()
    assert result.manifest.exists()
    assert result.counts == {"leads": 1, "deals": 1, "activities": 1, "followup_tasks": 1}
    assert json.loads(result.manifest.read_text(encoding="utf-8"))["counts"] == result.counts

    with sqlite3.connect(target) as connection:
        tables = {
            row[0]
            for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
        }
        assert {"alembic_version", "leads", "deals", "activities", "followup_tasks"} <= tables
    for table in ("leads", "deals", "activities", "followup_tasks"):
        assert _rows(source, table) == _rows(target, table)

    with _connect_read_only(target) as connection:
        assert validate_legacy_database(connection) == result.counts

    with pytest.raises(FileExistsError):
        migrate_legacy_database(source, target, backup_dir=tmp_path / "backups")

    restored = tmp_path / "restored.sqlite"
    rollback = restore_backup(result.backup, restored)
    assert rollback["counts"] == result.counts
    for table in ("leads", "deals", "activities", "followup_tasks"):
        assert _rows(source, table) == _rows(restored, table)


def test_rejects_an_unrecognized_source_without_creating_target(tmp_path: Path) -> None:
    source = tmp_path / "unrelated.sqlite"
    with sqlite3.connect(source) as connection:
        connection.execute("CREATE TABLE unrelated (id TEXT PRIMARY KEY)")
    target = tmp_path / "runtime" / "crm.sqlite"

    with pytest.raises(ValueError, match="missing tables"):
        migrate_legacy_database(source, target, backup_dir=tmp_path / "backups")

    assert not target.exists()


def test_manifest_hashes_backup_and_target(tmp_path: Path) -> None:
    source = tmp_path / "legacy.sqlite"
    _create_legacy_database(source)
    target = tmp_path / "crm.sqlite"
    result = migrate_legacy_database(source, target, backup_dir=tmp_path / "backups")
    manifest = json.loads(result.manifest.read_text(encoding="utf-8"))

    assert manifest["backupSha256"] == hashlib.sha256(result.backup.read_bytes()).hexdigest()
    assert manifest["targetSha256"] == hashlib.sha256(target.read_bytes()).hexdigest()
