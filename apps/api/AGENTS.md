# apps/api Guide

## Scope

`apps/api` owns the HTTP compatibility layer, business rules, persistence, migrations, seed, and data-copy tooling.

## Layers

- `app/api/routes`: thin HTTP endpoints and status codes.
- `app/schemas`: Pydantic v2 contract models using camelCase aliases.
- `app/services`: CRM business rules and transactions.
- `app/repositories`: SQLAlchemy queries and persistence.
- `app/models`: ORM tables and constraints.
- `app/db`: engine/session/Alembic integration.
- `app/scripts`: explicit operational commands only.

## Invariants

- Preserve legacy route paths, response envelopes, status codes, field names, enum values, sort order, and Beijing-day dashboard semantics.
- PATCH must distinguish omitted attributes from explicit `null`.
- Do not expose FastAPI default `detail` or `422` payloads.
- Do not seed on application startup.
- Tests use temporary SQLite databases and must never touch `data/crm.sqlite`.
- Migration tools read the old database read-only, create a separate validated target, and default to refusing an existing target.

## Commands

```powershell
uv run --project apps/api pytest apps/api/tests
uv run --project apps/api ruff check apps/api
uv run --project apps/api alembic -c apps/api/alembic.ini upgrade head
```

Regenerate OpenAPI after contract changes, then regenerate web types.
