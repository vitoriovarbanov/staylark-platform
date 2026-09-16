# @staylark/backend

Express + TypeScript API for Staylark. Run with `pnpm --filter @staylark/backend dev`.

## API Documentation

Interactive Swagger UI is served at `/api/docs` (raw spec at `/api/docs.json`),
generated from the `@staylark/contract` Zod schemas via `@asteasolutions/zod-to-openapi`.

- Enabled automatically in development. On staging (which runs `NODE_ENV=production`)
  set `ENABLE_API_DOCS=true`. Real production leaves it unset → `/api/docs` 404s.
- Export the static spec: `pnpm --filter @staylark/backend gen:openapi` → `apps/backend/openapi.json`.
- Verify the spec generates: `pnpm --filter @staylark/backend verify:openapi`.

> `@asteasolutions/zod-to-openapi` is pinned to **v7** (the Zod 3-compatible line);
> v8 targets Zod 4 and crashes against this repo's Zod 3.x.

**Rule:** every new endpoint ships its `routes/<feature>/<feature>.openapi.ts`
registration in the same PR. Add the feature's import to `src/docs/openapi.ts`.
