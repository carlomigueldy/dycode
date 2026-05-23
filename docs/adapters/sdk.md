# Adapter SDK · `@dycode/adapter-sdk`

> Public contract every dycode adapter implements. Source is the truth — this doc is the map.

## What you implement

A single `AdapterPlugin` value exported as `default`. Use `createAdapter({...})` to get full type inference.

```ts
import { createAdapter } from '@dycode/adapter-sdk'
export default createAdapter({
  /* manifest, detect, create */
})
```

## Surface

| Concept                           | Source                                       | Purpose                                   |
| --------------------------------- | -------------------------------------------- | ----------------------------------------- |
| `AdapterPlugin`                   | `packages/adapter-sdk/src/plugin.ts`         | Top-level adapter export                  |
| `AdapterInstance`                 | same                                         | Per-workspace runtime object              |
| `AdapterManifest`                 | `packages/adapter-sdk/src/manifest.ts`       | Static metadata (`id`, `capabilities`, …) |
| `AdapterEvent`                    | `packages/adapter-sdk/src/events.ts`         | Discriminated event stream                |
| `TaskCtx`, `CreateOpts`, `Prompt` | `packages/adapter-sdk/src/context.ts`        | Per-task / per-instance context           |
| `HealthReport`, `DetectionResult` | `packages/adapter-sdk/src/health.ts`         | Probes                                    |
| `createAdapter`                   | `packages/adapter-sdk/src/create-adapter.ts` | Identity helper for type inference        |
| `Capability`                      | re-exported from `@dycode/contracts`         | Closed enum of declared abilities         |

## Quickstart

```bash
pnpm add @dycode/adapter-sdk @dycode/contracts zod
```

See `packages/adapter-sdk/CLAUDE.md` for the full example. Tests in `packages/adapter-sdk/tests/` show every accepted/rejected shape.

## Lifecycle (from spec §5.5)

```
detect()  →  create(opts)  →  instance.start(prompt, ctx)  →  AsyncIterable<AdapterEvent>
                                instance.health()           periodic
                                instance.cancel(reason)     on task cancel
                                instance.dispose()          on workspace close / shutdown
```

The iterable from `start()` MUST terminate with a single `done` event.

## Versioning

`SDK_VERSION` is exported. Pre-1.0, any change to `AdapterPlugin`, `AdapterInstance`, or `AdapterEvent` is breaking. Bump minor for additive changes (new capability, new event variant).

## Related

- Spec §5: `../superpowers/specs/2026-05-23-dycode-design.md`
- IPC protocol: `../ipc-protocol/spec.md`
- Per-package map: `../../packages/adapter-sdk/CLAUDE.md`
