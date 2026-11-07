import argparse
import json
import os
import sqlite3
from contextlib import closing
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.core.config import REPOSITORY_ROOT
from app.scripts.legacy_migration import (
    _backup_database,
    _connect_read_only,
    _read_table_rows,
    sha256_file,
    validate_legacy_database,
)


def restore_backup(backup: Path, target: Path, *, replace: bool = False) -> dict[str, object]:
    backup = backup.resolve()
    target = target.resolve()
    if not backup.exists():
        raise FileNotFoundError(f"backup does not exist: {backup}")
    if backup == target:
        raise ValueError("backup and target must be different files")
    if target.exists() and not replace:
        raise FileExistsError(f"target exists; pass --replace to restore: {target}")

    with closing(_connect_read_only(backup)) as backup_connection:
        backup_counts = validate_legacy_database(backup_connection)

    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    suffix = uuid4().hex[:8]
    pre_restore_backup: Path | None = None
    if target.exists():
        pre_restore_backup = (
            target.parent / f"{target.stem}-pre-rollback-{timestamp}-{suffix}.sqlite"
        )
        _backup_database(target, pre_restore_backup)

    staging = target.parent / f".{target.name}.rollback-{timestamp}-{suffix}"
    _backup_database(backup, staging)
    try:
        with closing(_connect_read_only(backup)) as backup_connection:
            with closing(sqlite3.connect(staging)) as staging_connection:
                for table in backup_counts:
                    expected = _read_table_rows(backup_connection, table)
                    actual = _read_table_rows(staging_connection, table)
                    if expected != actual:
                        raise ValueError(f"rollback verification failed for {table}")
        os.replace(staging, target)
    except Exception:
        staging.unlink(missing_ok=True)
        raise

    return {
        "backup": str(backup),
        "backupSha256": sha256_file(backup),
        "target": str(target),
        "targetSha256": sha256_file(target),
        "counts": backup_counts,
        "preRestoreBackup": str(pre_restore_backup) if pre_restore_backup else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Restore a validated legacy CRM backup")
    parser.add_argument("--backup", type=Path, required=True)
    parser.add_argument(
        "--target",
        type=Path,
        default=REPOSITORY_ROOT / "data" / "crm.sqlite",
    )
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args()
    print(
        json.dumps(
            restore_backup(args.backup, args.target, replace=args.replace),
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
