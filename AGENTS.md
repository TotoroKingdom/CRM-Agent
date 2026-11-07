# CRM-Agent Repository Guide

## Mission

This repository is a small, local-only CRM with a Next.js web app and a FastAPI API. Preserve the existing UI, routes, Chinese business copy, and HTTP compatibility unless a task explicitly changes them.

## Layout

- `apps/web`: Next.js App Router UI and generated OpenAPI types.
- `apps/api`: Python 3.12 FastAPI/SQLAlchemy/Alembic service.
- `docs`: architecture, API compatibility, migration, and task records.
- `scripts`: local development entry points.
- `data`: ignored local SQLite data; never commit or reset it.

## Rules

- Read the nearest `AGENTS.md` before editing. Deeper instructions take precedence.
- Treat `apps/api/openapi.json` and `apps/web/src/generated/api.ts` as generated contract artifacts. Regenerate rather than hand-editing.
- Do not let the web app import Node database code or connect to SQLite. All CRM data access goes through `/api/*`.
- Preserve success/error envelopes, camelCase fields, status codes, PATCH omission/null semantics, and Beijing-day dashboard behavior.
- Never delete, overwrite, reset, or commit a user database. Migration commands operate on copies unless the user explicitly authorizes otherwise.
- Do not auto-seed from application startup. Demo data is inserted only through the explicit idempotent seed command.
- Run focused tests first. Run Next.js `test`, `typecheck`, and `build` serially because they share generated types.
- Do not run Maven lifecycles; this repository has no Maven project.
- Browser E2E, Computer Use, real external integrations, deployment, and production data migration require explicit authorization.

## Parallel Agents

- Read-only analysis may run in parallel.
- Two agents must not edit the same file concurrently. Assign explicit file or directory ownership before parallel writes.
- Do not revert another agent's work; reconcile overlapping changes instead.

## Evidence

- Do not report unexecuted checks as passing.
- Record commands, counts, versions, limitations, and remaining risks in `docs/tasks/fastapi-monorepo-progress.md`.
- Keep logs and SQLite files out of Git.
