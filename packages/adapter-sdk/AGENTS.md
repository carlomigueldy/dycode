# AGENTS — @dycode/adapter-sdk

> Public adapter plugin contract. One import for adapter authors. ≤100 lines.

## What lives here

- `AdapterPlugin` / `AdapterInstance` interfaces
- `AdapterManifest` + `AdapterEvent` schemas
- `TaskCtx` / `CreateOpts` / `Prompt` / `HealthReport` / `DetectionResult` types
- `createAdapter()` helper
- Re-exports `Capability` from `@dycode/contracts`

## Build / test

```bash
pnpm --filter @dycode/adapter-sdk typecheck
pnpm --filter @dycode/adapter-sdk test
pnpm --filter @dycode/adapter-sdk build
```

## Rules

- Public exports go through `src/index.ts`.
- Schemas drive types via `z.infer`. Never hand-write a type that has a schema.
- Adapter authors are external; ALL contract changes are breaking until 1.0. Bump SDK_VERSION minor for additive (new optional field, new capability, new event variant).
- Keep `AdapterPlugin` / `AdapterInstance` interfaces tight. New methods need a justification — adapter authors implement these.

## Linked design

- Design spec §5 (Adapter SDK): `../../docs/superpowers/specs/2026-05-23-dycode-design.md`
- Public deep doc: `../../docs/adapters/sdk.md` (Task 21)
