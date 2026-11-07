import argparse
import hashlib
import json
import os
import sqlite3
from contextlib import closing
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from alembic.config import Config

from alembic import command
from app.core.config import REPOSITORY_ROOT, get_settings
from app.core.time import parse_iso_datetime

API_ROOT = Path(__file__).resolve().parents[2]
ALEMBIC_CONFIG = API_ROOT / "alembic.ini"

TABLES: dict[str, tuple[str, ...]] = {
    "leads": (
        "id",
        "name",
        "company",
        "email",
        "phone",
        "channel",
        "status",
        "priority",
        "country",
        "note",
        "created_at",
        "updated_at",
    ),
    "deals": (
        "id",
        "lead_id",
        "title",
        "amount_cents",
        "stage",
        "expected_close_at",
        "created_at",
        "updated_at",
    ),
    "activities": (
        "id",
        "lead_id",
        "type",
        "content",
        "occurred_at",
        "created_at",
    ),
    "followup_tasks": (
        "id",
        "lead_id",
        "title",
        "due_at",
        "completed_at",
        "created_at",
        "updated_at",
    ),
}

DATETIME_COLUMNS = {
    "leads": ("created_at", "updated_at"),
    "deals": ("expected_close_at", "created_at", "updated_at"),
    "activities": ("occurred_at", "created_at"),
    "followup_tasks": ("due_at", "completed_at", "created_at", "updated_at"),
}

ENUM_VALUES = {
    "leads.channel": {"WEBSITE", "SHOPIFY", "AMAZON", "TIKTOK", "REFERRAL", "OTHER"},
    "leads.status": {"NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED"},
    "leads.priority": {"HIGH", "MEDIUM", "LOW"},
    "deals.stage": {"DISCOVERY", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"},
    "activities.type": {"CALL", "EMAIL", "MESSAGE", "MEETING", "NOTE"},
}


@dataclass
class MigrationResult:
    source: Path
    target: Path
    backup: Path
    manifest: Path
    counts: dict[str, int]
    source_sha256: str
    backup_sha256: str


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _connect_read_only(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    return connection


def _table_columns(connection: sqlite3.Connection, table: str) -> set[str]:
    return {str(row["name"]) for row in connection.execute(f"PRAGMA table_info({table})")}


def _validate_foreign_keys(connection: sqlite3.Connection, table: str) -> None:
    foreign_keys = list(connection.execute(f"PRAGMA foreign_key_list({table})"))
    lead_fk = [row for row in foreign_keys if row["table"] == "leads"]
    if not lead_fk:
        raise ValueError(f"{table} is missing its lead foreign key")
    if any(str(row["on_delete"]).upper() != "CASCADE" for row in lead_fk):
        raise ValueError(f"{table} must use ON DELETE CASCADE")


def validate_legacy_database(connection: sqlite3.Connection) -> dict[str, int]:
    integrity = connection.execute("PRAGMA integrity_check").fetchone()
    if integrity is None or integrity[0] != "ok":
        raise ValueError("source database failed PRAGMA integrity_check")

    existing_tables = {
        str(row["name"])
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
        )
    }
    missing_tables = set(TABLES) - existing_tables
    if missing_tables:
        raise ValueError(f"source database is missing tables: {sorted(missing_tables)}")

    for table, expected_columns in TABLES.items():
        actual_columns = _table_columns(connection, table)
        missing_columns = set(expected_columns) - actual_columns
        if missing_columns:
            raise ValueError(f"source table {table} is missing columns: {sorted(missing_columns)}")
    for table in ("deals", "activities", "followup_tasks"):
        _validate_foreign_keys(connection, table)

    foreign_key_errors = list(connection.execute("PRAGMA foreign_key_check"))
    if foreign_key_errors:
        raise ValueError(f"source database has foreign key violations: {foreign_key_errors}")

    for field, allowed in ENUM_VALUES.items():
        table, column = field.split(".")
        values = {
            str(row[0])
            for row in connection.execute(
                f"SELECT DISTINCT {column} FROM {table} WHERE {column} IS NOT NULL"
            )
        }
        invalid = values - allowed
        if invalid:
            raise ValueError(f"{field} contains unsupported values: {sorted(invalid)}")

    negative_amounts = connection.execute(
        "SELECT COUNT(*) FROM deals WHERE amount_cents < 0"
    ).fetchone()[0]
    if negative_amounts:
        raise ValueError("source database contains negative deal amounts")

    for table, columns in DATETIME_COLUMNS.items():
        for column in columns:
            for row in connection.execute(
                f"SELECT id, {column} FROM {table} WHERE {column} IS NOT NULL"
            ):
                try:
                    parse_iso_datetime(str(row[column]))
                except (TypeError, ValueError) as exc:
                    raise ValueError(
                        f"invalid datetime in {table}.{column} for row {row['id']}"
                    ) from exc

    return {
        table: int(connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])
        for table in TABLES
    }


def _backup_database(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        raise FileExistsError(f"backup target already exists: {destination}")
    with closing(_connect_read_only(source)) as source_connection:
        with closing(sqlite3.connect(destination)) as backup_connection:
            source_connection.backup(backup_connection)


def _upgrade_database(database_path: Path) -> None:
    previous = os.environ.get("CRM_DATABASE_PATH")
    os.environ["CRM_DATABASE_PATH"] = str(database_path)
    get_settings.cache_clear()
    try:
        command.upgrade(Config(str(ALEMBIC_CONFIG)), "head")
    finally:
        if previous is None:
            os.environ.pop("CRM_DATABASE_PATH", None)
        else:
            os.environ["CRM_DATABASE_PATH"] = previous
        get_settings.cache_clear()


def _read_table_rows(connection: sqlite3.Connection, table: str) -> list[tuple[object, ...]]:
    columns = ", ".join(TABLES[table])
    return [
        tuple(row)
        for row in connection.execute(f"SELECT {columns} FROM {table} ORDER BY id ASC").fetchall()
    ]


def _copy_rows(source: sqlite3.Connection, target: sqlite3.Connection) -> None:
    target.execute("PRAGMA foreign_keys = ON")
    target.execute("BEGIN")
    try:
        for table, columns in TABLES.items():
            rows = _read_table_rows(source, table)
            if not rows:
                continue
            column_sql = ", ".join(columns)
            placeholders = ", ".join("?" for _ in columns)
            target.executemany(
                f"INSERT INTO {table} ({column_sql}) VALUES ({placeholders})",
                rows,
            )
        target.commit()
    except Exception:
        target.rollback()
        raise


def _verify_copy(source: sqlite3.Connection, target: sqlite3.Connection) -> dict[str, int]:
    target.execute("PRAGMA foreign_keys = ON")
    violations = list(target.execute("PRAGMA foreign_key_check"))
    if violations:
        raise ValueError(f"migrated database has foreign key violations: {violations}")

    counts: dict[str, int] = {}
    for table in TABLES:
        source_rows = _read_table_rows(source, table)
        target_rows = _read_table_rows(target, table)
        if source_rows != target_rows:
            raise ValueError(f"row-level verification failed for {table}")
        source_ids = {str(row[0]) for row in source_rows}
        target_ids = {str(row[0]) for row in target_rows}
        if source_ids != target_ids:
            raise ValueError(f"primary key verification failed for {table}")
        counts[table] = len(target_rows)

    version = target.execute("SELECT version_num FROM alembic_version").fetchone()
    if version is None:
        raise ValueError("migrated database is missing alembic_version")
    return counts


def migrate_legacy_database(
    source: Path,
    target: Path,
    *,
    backup_dir: Path,
    replace: bool = False,
    keep_staging: bool = False,
) -> MigrationResult:
    source = source.resolve()
    target = target.resolve()
    backup_dir = backup_dir.resolve()
    if not source.exists():
        raise FileNotFoundError(f"legacy source does not exist: {source}")
    if source == target:
        raise ValueError("source and target must be different files")
    if target.exists() and not replace:
        raise FileExistsError(f"target already exists; pass --replace to replace it: {target}")

    source_hash_before = sha256_file(source)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    suffix = uuid4().hex[:8]
    backup = backup_dir / f"{source.stem}-{timestamp}-{suffix}.sqlite"
    manifest_path = backup_dir / f"{source.stem}-{timestamp}-{suffix}.manifest.json"
    _backup_database(source, backup)

    if target.exists():
        _backup_database(
            target, backup_dir / f"{target.stem}-pre-replace-{timestamp}-{suffix}.sqlite"
        )

    staging = target.parent / f".{target.name}.staging-{timestamp}-{suffix}"
    target.parent.mkdir(parents=True, exist_ok=True)
    if staging.exists():
        raise FileExistsError(f"staging file already exists: {staging}")

    try:
        _upgrade_database(staging)
        with closing(_connect_read_only(source)) as source_connection:
            source_counts = validate_legacy_database(source_connection)
            with closing(sqlite3.connect(staging)) as target_connection:
                target_connection.row_factory = sqlite3.Row
                _copy_rows(source_connection, target_connection)
                target_counts = _verify_copy(source_connection, target_connection)
        if source_counts != target_counts:
            raise ValueError(f"count verification failed: {source_counts} != {target_counts}")
        source_hash_after = sha256_file(source)
        if source_hash_before != source_hash_after:
            raise ValueError("source database changed during migration")
        backup_hash = sha256_file(backup)
        os.replace(staging, target)
    except Exception:
        if not keep_staging:
            staging.unlink(missing_ok=True)
        raise

    manifest = {
        "createdAt": datetime.now(UTC).isoformat(),
        "source": str(source),
        "sourceSha256": source_hash_before,
        "backup": str(backup),
        "backupSha256": backup_hash,
        "target": str(target),
        "targetSha256": sha256_file(target),
        "counts": target_counts,
        "alembicRevision": "aff88cb2ab30",
        "validation": "schema, counts, IDs, full rows, foreign keys, datetimes, enums",
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return MigrationResult(
        source=source,
        target=target,
        backup=backup,
        manifest=manifest_path,
        counts=target_counts,
        source_sha256=source_hash_before,
        backup_sha256=backup_hash,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate a legacy CRM SQLite copy")
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument(
        "--target",
        type=Path,
        default=REPOSITORY_ROOT / "data" / "crm.sqlite",
    )
    parser.add_argument(
        "--backup-dir",
        type=Path,
        default=REPOSITORY_ROOT / "data" / "backups",
    )
    parser.add_argument("--replace", action="store_true")
    parser.add_argument("--keep-staging", action="store_true")
    args = parser.parse_args()

    result = migrate_legacy_database(
        args.source,
        args.target,
        backup_dir=args.backup_dir,
        replace=args.replace,
        keep_staging=args.keep_staging,
    )
    print(
        json.dumps(
            {
                "source": str(result.source),
                "target": str(result.target),
                "backup": str(result.backup),
                "manifest": str(result.manifest),
                "counts": result.counts,
                "sourceSha256": result.source_sha256,
                "backupSha256": result.backup_sha256,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
