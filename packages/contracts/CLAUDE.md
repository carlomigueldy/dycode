# @dycode/contracts — agent map

> Shared Zod schemas and inferred TypeScript types for dycode IPC, the adapter SDK,
> and the domain model. Imported by `dycoded`, the Electron renderer, and all adapters.
> ≤100 lines.

## Responsibility

Single source of truth for:

- WebSocket JSON-RPC request/response/notification shapes (added in Plan 02)
- Adapter SDK contract types (Plan 02)
- Domain entities: Workspace, Agent, Squad, Pool (derived), Task, EventLogEntry (Plan 02)

## Current state (Plan 01)

Stub only. Exports a `CONTRACTS_VERSION` constant. Real schemas land in Plan 02.

## Files

- `src/index.ts` — public barrel; re-exports everything
- `src/version.ts` — semver string of the contracts surface
- `tests/*.test.ts` — Vitest unit tests

## How to add a schema (Plan 02+)

1. Create `src/<area>/<entity>.schema.ts` exporting `<Entity>Schema` (Zod) and `type <Entity>`.
2. Re-export from `src/index.ts`.
3. Add a test under `tests/<area>/<entity>.test.ts` proving the schema accepts valid
   examples and rejects 1–2 invalid ones.
4. Bump `CONTRACTS_VERSION` minor.

## Build / test

```bash
pnpm --filter @dycode/contracts typecheck
pnpm --filter @dycode/contracts test
pnpm --filter @dycode/contracts build
```

## Versioning

- 0.x = pre-stable.
- Bump **major** on any breaking change to a public type or schema.
- Bump **minor** for additive changes.
- Bump **patch** for fixes that don't change shape.

## Linked design

- `../../docs/superpowers/specs/2026-05-23-dycode-design.md` §6 (IPC), §5 (adapter SDK)
