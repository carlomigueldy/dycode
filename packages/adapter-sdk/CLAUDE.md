# @dycode/adapter-sdk — agent map

> Public adapter plugin contract. Adapter authors import from here.
> Single file: `import { createAdapter, type AdapterPlugin } from '@dycode/adapter-sdk'`.
> ≤100 lines by design.

## Responsibility

Defines:

- `AdapterPlugin` / `AdapterInstance` interfaces (the contract)
- `AdapterManifest` schema (per-adapter metadata)
- `AdapterEvent` discriminated union (the event stream)
- Context types: `TaskCtx`, `CreateOpts`, `Prompt`, `HealthReport`, `DetectionResult`
- `createAdapter()` identity helper for type inference
- Re-exports `Capability` from `@dycode/contracts` so adapters need one import

## Files

- `src/manifest.ts` — `AdapterManifestSchema`
- `src/events.ts` — `AdapterEventSchema` (7-variant union)
- `src/plugin.ts` — `AdapterPlugin` + `AdapterInstance` (types only)
- `src/context.ts` — `TaskCtx`, `CreateOpts`, `Prompt`
- `src/health.ts` — `HealthReport`, `DetectionResult`
- `src/create-adapter.ts` — `createAdapter()` helper
- `src/version.ts` — `SDK_VERSION`
- `src/index.ts` — public barrel

## How an adapter author uses this

```ts
import { createAdapter } from '@dycode/adapter-sdk'

export default createAdapter({
  manifest: {
    id: 'my-cli',
    displayName: 'My CLI',
    vendor: 'me',
    apiVersion: 1,
    capabilities: ['code.read', 'shell.exec'],
  },
  detect: async () => ({ installed: true, version: '1.0.0' }),
  create: (opts) => ({
    async *start(prompt, ctx) {
      yield { type: 'output', chunk: prompt.text }
      yield { type: 'done', status: 'ok', summary: '' }
    },
    async cancel() {},
    async health() {
      return { healthy: true, ts: Date.now() }
    },
    async dispose() {},
  }),
})
```

## Versioning

- 0.x = pre-stable.
- Bump major on any breaking change to `AdapterPlugin`, `AdapterInstance`, or `AdapterEvent`.
- Bump minor on additive changes (new capability, new event type with discriminator).

## Linked design

- `../../docs/superpowers/specs/2026-05-23-dycode-design.md` §5 (Adapter SDK)
- `../../docs/adapters/sdk.md` (deep doc — Task 21)
