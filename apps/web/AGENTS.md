# apps/web Guide

## Scope

- Preserve the existing CrossFlow CRM pages, route names, Chinese copy, CSS, and interaction behavior.
- Do not redesign the UI or replace the design system while doing backend/API work.

## Data Access

- Browser code calls same-origin `/api/*`.
- `next.config.ts` rewrites those requests to FastAPI using `API_INTERNAL_URL`.
- Never import `node:sqlite`, SQLAlchemy concepts, or direct database access into this app.
- Use `src/lib/api/client.ts`; response/request types come from `src/generated/api.ts`.

## Contract

- Generated OpenAPI TypeScript belongs in `src/generated/`; do not edit it manually.
- Preserve the `{data}` success and `{error, fields?}` failure envelopes.
- Keep camelCase DTO fields and Beijing-time display helpers.

## Validation

- Run `npm test`, then `npm run typecheck`, then `npm run build` serially.
- Tests must not require a live API, SQLite file, browser E2E, or external service.
