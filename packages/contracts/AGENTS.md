# AGENTS — @dycode/contracts

> Shared Zod schemas + TS types. Imported by daemon, renderer, and adapters.
> ≤100 lines.

## What lives here

Schemas and types for IPC, adapter SDK, and the domain model. Currently a stub
exporting `CONTRACTS_VERSION` (Plan 01). Real shapes added in Plan 02.

## Add a schema

1. `src/<area>/<entity>.schema.ts` — export `<Entity>Schema` (Zod) + `type <Entity>`
2. Re-export from `src/index.ts`
3. Test: `tests/<area>/<entity>.test.ts` — accept valid, reject invalid examples
4. Bump `CONTRACTS_VERSION` (minor for additive)

## Commands

```bash
pnpm --filter @dycode/contracts typecheck
pnpm --filter @dycode/contracts test
pnpm --filter @dycode/contracts build
```

## Rules

- Schemas drive types via `z.infer<typeof Schema>`. Never hand-write a type that has a schema.
- Public exports go through `src/index.ts`. No deep imports from consumers.
- Each schema gets at least one happy-path test and one rejection test.

## Linked design

- Design spec §5 (Adapter SDK), §6 (IPC + domain model) — `../../docs/superpowers/specs/2026-05-23-dycode-design.md`
