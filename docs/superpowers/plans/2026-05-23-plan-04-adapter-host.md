# dycode · Plan 04 — Adapter plugin host

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Not started · **Depends on:** Plan 03 · **Tag at close:** `v0.0.4-plan-04`

**Goal:** Stand up the adapter plugin host inside `dycoded` on a focused vertical slice: discover adapter packages on disk, dynamically `import()` them, schema-validate their manifest, persist installed adapters to SQLite, refuse any operation that asks for a capability the manifest did not declare, manage per-instance lifecycle (`create → start → cancel → health → dispose`), translate `AdapterEvent`s into `EventLogEntry`s and onto the daemon's event bus, and expose the `adapter.*` + `runtime.scan` IPC surface end-to-end. A fixture adapter ships under `tests/fixtures/` and exercises the entire host through a Vitest E2E spec — no real CLI required.

**Architecture:** New `daemons/dycoded/src/adapters/` subtree composed of one-responsibility modules: `loader.ts` (dynamic import + manifest validation), `discovery.ts` (walks `~/.dycode/adapters/node_modules`), `registry.ts` (in-memory `Map<adapterId, AdapterPlugin>`), `host.ts` (composes the three), `capability-gate.ts` (single assertion helper), `lifecycle.ts` (per-instance controller with health tracking), `pty.ts` (`node-pty` channel for `flavor: 'pty'`), `health-probe.ts` (30s scheduler emitting `agent.statusChanged`), `ipc-bridge.ts` (`AsyncIterable<AdapterEvent> → EventLogRepository + EventBus`). A new SQLite migration (`003-adapters.ts`) plus `AdapterRepository` persist installed adapter rows. The five `adapter.*` / `runtime.scan` handlers from `@dycode/contracts` wire through the Plan 03 dispatcher. Two additive bumps to `@dycode/adapter-sdk`: the `AdapterManifest` schema gains a required `flavor` literal and an optional `concurrencyCap`; the `AdapterPlugin` interface gains an optional `configSchema?: ZodTypeAny` slot (Zod schemas cannot ride on the wire-validated manifest, so they sit on the runtime plugin).

**Tech Stack:** Node 22 · TypeScript 5.7 strict · `node-pty` 1.x (prebuilt for Linux + macOS + Windows) · `better-sqlite3` 11.x (already in Plan 03) · `ulid` 2.x (Plan 03) · Vitest 2 with fake timers · existing pnpm + Turborepo + ESLint 9 + Prettier 3 toolchain from Plans 01/02/03.

**Starting state:** `main@<plan-03-close-sha>` — Plan 03 shipped. Concretely:
- `daemons/dycoded@0.1.0` boots, holds a lockfile, picks a port, serves WebSocket JSON-RPC with bearer auth, persists workspaces + the event log through migrations 001 + 002, and streams `event.appended` notifications via a `SubscriptionRegistry`.
- `packages/ipc-client@0.1.0` provides `DycodeClient.request<M>()` + `subscribe()`.
- `@dycode/contracts@0.1.0` (or whichever minor Plan 03 left it at) already publishes `runtime_scan_*`, `adapter_list_*`, `adapter_install_*`, `adapter_uninstall_*`, `adapter_configure_*` Zod schemas, plus the `RuntimeDetectedNotificationSchema`.
- `@dycode/adapter-sdk@0.1.0` ships `AdapterPlugin`, `AdapterInstance`, `AdapterManifestSchema`, `AdapterEventSchema`, `createAdapter()`.
- `daemons/dycoded/src/persistence/migrate.ts` runs forward-only migrations and records applied ids in `schema_migrations`.
- `daemons/dycoded/src/ipc/dispatcher.ts` accepts new method handlers via a typed registration API; an in-process `EventBus` already exists and the `EventLogRepository` already appends + queries.
- `feature_list.json` ends at F14.

**Execution worktree:** `<absolute-path>/dycode-plan-04` (created via `superpowers:using-git-worktrees` at execution time — not by this plan). Branch: `feat/plan-04-adapter-host`.

**Out of scope (deferred):**
- Concrete `@dycode/adapter-claude-code` adapter and the `task.*` runtime that drives `instance.start()` from a real prompt → Plan 05.
- `verifier` sub-type tightening and the first verifier adapter (`@dycode/adapter-vitest`) → Plan 06.
- `agents`, `squads`, `squad_members`, `tasks` tables → Plan 05 (added when the task runtime needs them).
- Out-of-process adapter sandbox (Node worker / `node:vm` isolation) → Plan 15 hardening pass. Plan 04 loads adapters in-process under capability gating, matching the design spec's MVP trust model.
- Adapter package distribution from npm registry (the `adapter.install` handler in Plan 04 only resolves *already on disk* under `~/.dycode/adapters/node_modules` — installing from the live npm registry is Plan 16's docs-site/adapter-quickstart concern).
- Electron renderer wiring — Plan 08+.

---

## File structure produced by this plan

```
dycode/
├── packages/
│   └── adapter-sdk/                                 # MODIFIED (additive minor bump → 0.2.0)
│       ├── src/
│       │   ├── flavor.ts                            # NEW — AdapterFlavor + schema
│       │   ├── manifest.ts                          # MOD — flavor + concurrencyCap
│       │   ├── plugin.ts                            # MOD — optional configSchema slot
│       │   ├── index.ts                             # MOD — re-export flavor
│       │   └── version.ts                           # MOD — bump SDK_VERSION
│       └── tests/
│           ├── flavor.test.ts                       # NEW
│           ├── manifest.test.ts                     # MOD — flavor + cap coverage
│           └── plugin.test.ts                       # MOD — configSchema acceptance
│
├── daemons/
│   └── dycoded/                                     # MODIFIED
│       ├── package.json                             # MOD — adds node-pty
│       ├── src/
│       │   ├── adapters/                            # NEW subtree
│       │   │   ├── index.ts                         # barrel
│       │   │   ├── loader.ts                        # dynamic import + manifest validation
│       │   │   ├── discovery.ts                     # walks ~/.dycode/adapters/node_modules
│       │   │   ├── registry.ts                      # in-memory Map<adapterId, AdapterPlugin>
│       │   │   ├── host.ts                          # composes loader + discovery + registry + repo
│       │   │   ├── capability-gate.ts               # assertCapability
│       │   │   ├── lifecycle.ts                     # InstanceController
│       │   │   ├── pty.ts                           # node-pty channel for flavor='pty'
│       │   │   ├── health-probe.ts                  # 30s scheduler → agent.statusChanged
│       │   │   └── ipc-bridge.ts                    # AdapterEvent → EventLogEntry → EventBus
│       │   ├── persistence/
│       │   │   ├── migrations/
│       │   │   │   └── 003-adapters.ts              # NEW — `adapters` table
│       │   │   └── adapter-repo.ts                  # NEW — CRUD over adapters
│       │   ├── ipc/
│       │   │   └── handlers/
│       │   │       ├── adapter.ts                   # NEW — adapter.list/install/uninstall/configure
│       │   │       └── runtime.ts                   # NEW — runtime.scan
│       │   ├── cli.ts                               # MOD — add `adapter list` subcommand
│       │   └── boot.ts                              # MOD — wires AdapterHost into dispatcher
│       └── tests/
│           ├── adapters/
│           │   ├── loader.test.ts
│           │   ├── discovery.test.ts
│           │   ├── registry.test.ts
│           │   ├── host.test.ts
│           │   ├── capability-gate.test.ts
│           │   ├── lifecycle.test.ts
│           │   ├── pty.test.ts
│           │   ├── health-probe.test.ts
│           │   └── ipc-bridge.test.ts
│           ├── persistence/
│           │   ├── migrations/003-adapters.test.ts
│           │   └── adapter-repo.test.ts
│           ├── ipc/handlers/
│           │   ├── adapter.test.ts
│           │   └── runtime.test.ts
│           ├── fixtures/
│           │   └── fixture-adapter/
│           │       ├── package.json                 # `dycodeAdapter: true`
│           │       └── index.ts                     # createAdapter({ flavor: 'structured', … })
│           └── e2e/
│               └── adapter-lifecycle.test.ts       # spawns child daemon
│
├── docs/
│   └── architecture/
│       └── adapter-host.md                         # NEW — deep doc
│
├── CLAUDE.md                                        # MOD — "Where to look" links
├── feature_list.json                                # MOD — appends F15-F20
└── PROGRESS.md                                      # MOD — Plan 04 entry
```

---

## Conventions for this plan

1. **Schemas from contracts, never re-declared.** Every wire-format check (params, results, the `RuntimeDetectedNotificationSchema`) uses Zod imports from `@dycode/contracts`. New adapter-side schemas (flavor, manifest extensions, configSchema slot) live in `@dycode/adapter-sdk` and are re-exported from its barrel.
2. **One responsibility per file.** Discovery does not load. Loader does not register. Registry does not gate. Lifecycle does not bridge events. Each module's public surface is ≤ 5 exported symbols.
3. **No global state in modules.** Every module exports a factory or class taking its dependencies as constructor arguments. `boot.ts` composes them. Tests pass fakes (in-memory DB, mock `EventBus`, mock `EventLogRepository`).
4. **Forward-only migrations.** Migration `003-adapters` is additive; never edit migrations 001 / 002. The runner's existing `verify(db)` hook from Plan 03 is used to assert the table exists and has the right columns after `up`.
5. **In-memory SQLite for unit tests.** `new Database(':memory:')` everywhere under `tests/persistence/` and `tests/adapters/`. The E2E test uses a temp data dir via `DYCODE_DATA_DIR`.
6. **Fixture adapter for end-to-end.** Tests never spawn a real `claude` / `codex` CLI. The fixture adapter in `tests/fixtures/fixture-adapter/` is the canonical stand-in.
7. **node-pty test isolation.** PTY tests spawn `node -e '<script>'` (cross-platform, deterministic), never bash or a real CLI. Each test asserts on a finite event stream.
8. **TDD where it pays.** Pure logic (loader, discovery, registry, capability-gate, ipc-bridge, repo, migrations) gets full red-green-refactor with a failing test first. Plumbing (boot wiring, CLI parsing) gets minimal integration coverage. Every task that touches code includes at least one test step.
9. **Tests cover happy path + at least one rejection.** Same rule as Plans 02/03.
10. **Conventional commits with package scope.** `feat(dycoded):`, `feat(adapter-sdk):`, `test(dycoded):`, `chore(repo):`, `docs(adapter-host):`. No `Co-Authored-By` lines naming any LLM (root `CLAUDE.md` rule #9).
11. **No `--no-verify`.** Every commit goes through hooks (none configured yet, but the rule stands).
12. **`./scripts/verify.sh` exits 0** at the end of every task that touches code. Doc-only tasks can skip only if they don't touch lintable/formattable files.
13. **`AdapterHost.bootstrap()` is idempotent.** Loading already-loaded adapters is a no-op. Re-running bootstrap after a hot-add is supported.
14. **Capability gate is the only gate.** No handler may invoke an adapter operation without going through `assertCapability(host, adapterId, capability)`. There is no "trust me" fast path.

---

## Task list overview

| #  | Task                                                                       | Output                                                                       |
| -- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 01 | Worktree, branch, `node-pty` dependency                                    | `feat/plan-04-adapter-host` ready; `node-pty` resolves on host platforms      |
| 02 | `@dycode/adapter-sdk` — `AdapterFlavor` literal + schema                   | `src/flavor.ts` + tests; barrel exports                                       |
| 03 | `@dycode/adapter-sdk` — `flavor` + `concurrencyCap` on manifest            | `manifest.ts` extended + tests cover happy/rejection                          |
| 04 | `@dycode/adapter-sdk` — optional `configSchema` on `AdapterPlugin`         | `plugin.ts` extended + test; SDK version bumped to `0.2.0`                    |
| 05 | Scaffold `daemons/dycoded/src/adapters/` subtree                           | Empty index barrel + placeholder modules under git; no logic yet              |
| 06 | Migration `003-adapters`                                                   | `persistence/migrations/003-adapters.ts` + table integrity test               |
| 07 | `AdapterRepository`                                                        | `persistence/adapter-repo.ts` + repo tests (insert/get/list/remove/update-config) |
| 08 | `loadPluginFromSpecifier()` — dynamic import + manifest validation         | `adapters/loader.ts` + tests against fixture URL + rejection on bad manifest  |
| 09 | `discoverAdaptersOnDisk()` — walks `~/.dycode/adapters/node_modules`       | `adapters/discovery.ts` + tests with temp dir                                 |
| 10 | `AdapterRegistry` — in-memory map                                          | `adapters/registry.ts` + tests                                                |
| 11 | `AdapterHost` — composes loader + discovery + registry + repo              | `adapters/host.ts` + tests including `bootstrap()` idempotency                |
| 12 | Capability gate                                                            | `adapters/capability-gate.ts` + tests covering pass + reject paths            |
| 13 | `InstanceController` — per-instance lifecycle wrapper                      | `adapters/lifecycle.ts` + tests using fixture adapter                         |
| 14 | IPC bridge — `AdapterEvent → EventLogEntry → EventBus`                     | `adapters/ipc-bridge.ts` + tests asserting each of the 7 event variants       |
| 15 | PTY channel for `flavor: 'pty'`                                            | `adapters/pty.ts` + tests spawning `node -e`                                  |
| 16 | Health-probe scheduler                                                     | `adapters/health-probe.ts` + tests with fake timers + status-change emission  |
| 17 | `adapter.list` handler                                                     | `ipc/handlers/adapter.ts` (partial) + tests                                   |
| 18 | `adapter.install` handler                                                  | `ipc/handlers/adapter.ts` (extended) + tests                                  |
| 19 | `adapter.uninstall` handler                                                | `ipc/handlers/adapter.ts` (extended) + tests                                  |
| 20 | `adapter.configure` handler — validates against per-plugin `configSchema`  | `ipc/handlers/adapter.ts` (completed) + tests including a rejection           |
| 21 | `runtime.scan` handler — invokes `detect()` per plugin, emits `runtime.detected` | `ipc/handlers/runtime.ts` + tests                                       |
| 22 | Fixture adapter package                                                    | `tests/fixtures/fixture-adapter/package.json` + `index.ts`                    |
| 23 | E2E test — install fixture → adapter.list → runtime.scan → lifecycle       | `tests/e2e/adapter-lifecycle.test.ts`                                         |
| 24 | `dycoded adapter list` CLI subcommand                                      | `cli.ts` extended + test                                                      |
| 25 | Docs — `adapter-host.md`, CLAUDE.md updates, package maps                  | `docs/architecture/adapter-host.md`, root + package CLAUDE.md edits           |
| 26 | Close-out — feature_list F15-F20, PROGRESS entry, tag                      | `v0.0.4-plan-04` tag, F15-F20 = `passing`                                     |

Each task below is bite-sized (2–5 minutes of mechanical work) with complete code blocks and exact commands. TDD pattern where applicable: write failing test → verify red → implement → verify green → commit.

---

### Task 01 · Worktree, branch, and `node-pty` dependency

**Files:**
- Modify: `daemons/dycoded/package.json`
- Modify: `pnpm-lock.yaml` (regenerated)

- [ ] **Step 1: Confirm starting state**

```bash
git -C <main-checkout> rev-parse HEAD
git -C <main-checkout> status --short
```

Expected: HEAD = the Plan 03 close SHA, working tree clean.

- [ ] **Step 2: Create the Plan 04 worktree**

Follow `superpowers:using-git-worktrees`. End state:
- Worktree at `<absolute-path>/dycode-plan-04`
- Branch `feat/plan-04-adapter-host` checked out
- Worktree is the working directory for every subsequent task

Verify:
```bash
cd <absolute-path>/dycode-plan-04
git status
git branch --show-current
```

Expected: clean tree, `feat/plan-04-adapter-host`.

- [ ] **Step 3: Add `node-pty` to the daemon**

Edit `daemons/dycoded/package.json` — append to `dependencies`:

```json
{
  "dependencies": {
    "node-pty": "^1.0.0"
  }
}
```

(Keep `dependencies` alphabetised; existing Plan 03 entries unchanged.)

- [ ] **Step 4: Install**

```bash
pnpm install
```

Expected: `node-pty@1.x` resolved with a prebuilt binary on Linux/macOS/Windows runners. No source compile required for happy-path platforms.

- [ ] **Step 5: Sanity smoke**

```bash
node -e "const pty = require('node-pty'); const p = pty.spawn(process.execPath, ['-e','process.stdout.write(\"ok\");process.exit(0)'],{name:'xterm-256color',cols:80,rows:24}); p.onData(d=>process.stdout.write(d)); p.onExit(({exitCode})=>process.exit(exitCode));"
```

Expected: prints `ok`, exits 0.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/package.json pnpm-lock.yaml
git commit -m "chore(dycoded): add node-pty dependency for PTY adapter flavor"
```

---

### Task 02 · `@dycode/adapter-sdk` — `AdapterFlavor` literal + schema

**Files:**
- Create: `packages/adapter-sdk/src/flavor.ts`
- Modify: `packages/adapter-sdk/src/index.ts`
- Create: `packages/adapter-sdk/tests/flavor.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/adapter-sdk/tests/flavor.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ADAPTER_FLAVORS, AdapterFlavorSchema } from '../src/flavor.js'

describe('AdapterFlavor', () => {
  it('exposes the four flavor literals from the design spec', () => {
    expect(ADAPTER_FLAVORS).toEqual(['pty', 'structured', 'mcp', 'verifier'])
  })

  it.each(ADAPTER_FLAVORS)('accepts %s as a valid flavor', (flavor) => {
    expect(AdapterFlavorSchema.parse(flavor)).toBe(flavor)
  })

  it('rejects unknown flavors', () => {
    expect(() => AdapterFlavorSchema.parse('telnet')).toThrow()
  })

  it('rejects non-string flavors', () => {
    expect(() => AdapterFlavorSchema.parse(42)).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @dycode/adapter-sdk test -- flavor
```

Expected: FAIL with `Cannot find module '../src/flavor.js'`.

- [ ] **Step 3: Implement**

`packages/adapter-sdk/src/flavor.ts`:

```ts
import { z } from 'zod'

/**
 * The four adapter flavors recognised by the host. Aligned to the design spec §5.3.
 *
 * - `pty`        — driven through a pseudo-TTY (`node-pty`); raw text events.
 * - `structured` — CLI emits a native JSON event stream the adapter translates.
 * - `mcp`        — CLI speaks the Model Context Protocol natively; adapter is thin glue.
 * - `verifier`   — verification-only sub-type (jest, vitest, eslint, tsc, playwright).
 */
export const ADAPTER_FLAVORS = ['pty', 'structured', 'mcp', 'verifier'] as const

export const AdapterFlavorSchema = z.enum(ADAPTER_FLAVORS)
export type AdapterFlavor = z.infer<typeof AdapterFlavorSchema>
```

- [ ] **Step 4: Re-export from the barrel**

Edit `packages/adapter-sdk/src/index.ts` — append after the existing Manifest export block:

```ts
// Flavor
export { ADAPTER_FLAVORS, AdapterFlavorSchema } from './flavor.js'
export type { AdapterFlavor } from './flavor.js'
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter @dycode/adapter-sdk test -- flavor
```

Expected: PASS — 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/adapter-sdk/src/flavor.ts packages/adapter-sdk/src/index.ts packages/adapter-sdk/tests/flavor.test.ts
git commit -m "feat(adapter-sdk): add AdapterFlavor literal aligned to design spec §5.3"
```

---

### Task 03 · `AdapterManifest` — `flavor` + `concurrencyCap` fields

**Files:**
- Modify: `packages/adapter-sdk/src/manifest.ts`
- Modify: `packages/adapter-sdk/tests/manifest.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `packages/adapter-sdk/tests/manifest.test.ts`:

```ts
import { AdapterManifestSchema } from '../src/manifest.js'

const base = {
  id: 'fixture',
  displayName: 'Fixture',
  vendor: 'tests',
  apiVersion: 1 as const,
  capabilities: ['code.read'] as const,
}

describe('AdapterManifest — flavor + concurrencyCap', () => {
  it('requires `flavor`', () => {
    const result = AdapterManifestSchema.safeParse(base)
    expect(result.success).toBe(false)
  })

  it('accepts a manifest with flavor=structured', () => {
    const m = AdapterManifestSchema.parse({ ...base, flavor: 'structured' })
    expect(m.flavor).toBe('structured')
    expect(m.concurrencyCap).toBe(1) // default
  })

  it('accepts an explicit concurrencyCap', () => {
    const m = AdapterManifestSchema.parse({
      ...base,
      flavor: 'pty',
      concurrencyCap: 4,
    })
    expect(m.concurrencyCap).toBe(4)
  })

  it('rejects concurrencyCap < 1', () => {
    const result = AdapterManifestSchema.safeParse({
      ...base,
      flavor: 'pty',
      concurrencyCap: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown flavor literal', () => {
    const result = AdapterManifestSchema.safeParse({
      ...base,
      flavor: 'telnet',
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
pnpm --filter @dycode/adapter-sdk test -- manifest
```

Expected: FAIL — `flavor` is unrecognised by the existing `.strict()` schema.

- [ ] **Step 3: Extend the manifest schema**

Replace `packages/adapter-sdk/src/manifest.ts` with:

```ts
import { z } from 'zod'
import { CapabilitySchema } from '@dycode/contracts'
import { AdapterFlavorSchema } from './flavor.js'

export const AdapterManifestSchema = z
  .object({
    id: z.string().min(1),
    displayName: z.string().min(1),
    vendor: z.string().min(1),
    apiVersion: z.literal(1),
    capabilities: z.array(CapabilitySchema).refine((arr) => new Set(arr).size === arr.length, {
      message: 'capabilities must be unique',
    }),
    flavor: AdapterFlavorSchema,
    /**
     * Max number of concurrent live instances of this adapter inside the host.
     * Defaults to 1 — appropriate for most CLIs. Verifier adapters often raise
     * this in their manifest because they are short-lived and pure.
     */
    concurrencyCap: z.number().int().min(1).default(1),
    iconUrl: z.string().url().optional(),
  })
  .strict()

export type AdapterManifest = z.infer<typeof AdapterManifestSchema>
```

- [ ] **Step 4: Run to verify green**

```bash
pnpm --filter @dycode/adapter-sdk test -- manifest
```

Expected: PASS — all new tests green, all pre-existing manifest tests still green (existing manifest test data files updated where needed; if a fixture omitted `flavor` add `flavor: 'pty'` to it).

- [ ] **Step 5: Verify**

```bash
bash scripts/verify.sh
```

Expected: gates 1–4 green.

- [ ] **Step 6: Commit**

```bash
git add packages/adapter-sdk/src/manifest.ts packages/adapter-sdk/tests/manifest.test.ts
git commit -m "feat(adapter-sdk): require flavor + optional concurrencyCap on AdapterManifest"
```

---

### Task 04 · `AdapterPlugin` — optional `configSchema` slot + SDK version bump

**Files:**
- Modify: `packages/adapter-sdk/src/plugin.ts`
- Modify: `packages/adapter-sdk/src/version.ts`
- Modify: `packages/adapter-sdk/package.json`
- Modify: `packages/adapter-sdk/tests/plugin.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `packages/adapter-sdk/tests/plugin.test.ts`:

```ts
import { z } from 'zod'
import { createAdapter } from '../src/create-adapter.js'

describe('AdapterPlugin — optional configSchema', () => {
  it('accepts a plugin with no configSchema', () => {
    const plugin = createAdapter({
      manifest: {
        id: 'a',
        displayName: 'A',
        vendor: 't',
        apiVersion: 1,
        capabilities: [],
        flavor: 'structured',
        concurrencyCap: 1,
      },
      detect: async () => ({ installed: true, version: '1.0.0' }),
      create: () => ({
        async *start() {
          yield { type: 'done', status: 'ok', summary: '' } as const
        },
        async cancel() {},
        async health() {
          return { healthy: true, ts: Date.now() }
        },
        async dispose() {},
      }),
    })
    expect(plugin.configSchema).toBeUndefined()
  })

  it('accepts a plugin with a Zod configSchema', () => {
    const ConfigSchema = z.object({ apiKey: z.string().min(1) }).strict()
    const plugin = createAdapter({
      manifest: {
        id: 'b',
        displayName: 'B',
        vendor: 't',
        apiVersion: 1,
        capabilities: [],
        flavor: 'structured',
        concurrencyCap: 1,
      },
      configSchema: ConfigSchema,
      detect: async () => ({ installed: true, version: '1.0.0' }),
      create: () => ({
        async *start() {
          yield { type: 'done', status: 'ok', summary: '' } as const
        },
        async cancel() {},
        async health() {
          return { healthy: true, ts: Date.now() }
        },
        async dispose() {},
      }),
    })
    expect(plugin.configSchema).toBe(ConfigSchema)
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
pnpm --filter @dycode/adapter-sdk test -- plugin
```

Expected: FAIL with TS error — `configSchema` is not assignable to `AdapterPlugin`.

- [ ] **Step 3: Extend the interface**

Replace the `AdapterPlugin` block in `packages/adapter-sdk/src/plugin.ts` with:

```ts
import type { z } from 'zod'
import type { AdapterManifest } from './manifest.js'
import type { AdapterEvent } from './events.js'
import type { CreateOpts, Prompt, TaskCtx } from './context.js'
import type { DetectionResult, HealthReport } from './health.js'

export interface AdapterPlugin {
  readonly manifest: AdapterManifest
  /**
   * Optional per-adapter user-config schema. The host validates the user-
   * supplied config object against this schema before calling `create()`.
   *
   * NOT on the manifest because Zod schemas aren't JSON-serialisable and the
   * manifest must remain wire-friendly.
   */
  readonly configSchema?: z.ZodTypeAny
  detect(): Promise<DetectionResult>
  create(opts: CreateOpts): AdapterInstance
}

// (AdapterInstance interface block unchanged — keep as-is)
```

(Keep the existing `AdapterInstance` interface in the file untouched.)

- [ ] **Step 4: Bump SDK_VERSION**

`packages/adapter-sdk/src/version.ts`:

```ts
export const SDK_VERSION = '0.2.0'
```

`packages/adapter-sdk/package.json` — change `"version"` to `"0.2.0"`.

- [ ] **Step 5: Run to verify green**

```bash
pnpm --filter @dycode/adapter-sdk test
bash scripts/verify.sh
```

Expected: all tests pass, all verify gates pass.

- [ ] **Step 6: Commit**

```bash
git add packages/adapter-sdk/src/plugin.ts packages/adapter-sdk/src/version.ts packages/adapter-sdk/package.json packages/adapter-sdk/tests/plugin.test.ts
git commit -m "feat(adapter-sdk): expose optional configSchema on AdapterPlugin; bump to 0.2.0"
```

---

### Task 05 · Scaffold `daemons/dycoded/src/adapters/` subtree

**Files:**
- Create: `daemons/dycoded/src/adapters/index.ts`
- Create: empty placeholders for every module the plan will populate (so each subsequent task is a focused Edit, not a Create + Edit churn)

- [ ] **Step 1: Create the directory and barrel**

```bash
mkdir -p daemons/dycoded/src/adapters
```

`daemons/dycoded/src/adapters/index.ts`:

```ts
// Barrel for the adapter-host subtree. Populated task-by-task.
export {}
```

- [ ] **Step 2: Create empty placeholder modules**

Each file gets the same one-line stub (`export {}`) so TS compiles:

```bash
for f in loader discovery registry host capability-gate lifecycle pty health-probe ipc-bridge; do
  printf 'export {}\n' > "daemons/dycoded/src/adapters/${f}.ts"
done
```

- [ ] **Step 3: Verify typecheck**

```bash
pnpm --filter @dycode/dycoded typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add daemons/dycoded/src/adapters/
git commit -m "chore(dycoded): scaffold src/adapters/ subtree with empty modules"
```

---

### Task 06 · Migration `003-adapters` — `adapters` table

**Files:**
- Create: `daemons/dycoded/src/persistence/migrations/003-adapters.ts`
- Create: `daemons/dycoded/tests/persistence/migrations/003-adapters.test.ts`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/persistence/migrations/003-adapters.test.ts`:

```ts
import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { migration as m001 } from '../../../src/persistence/migrations/001-workspaces.js'
import { migration as m002 } from '../../../src/persistence/migrations/002-event-log.js'
import { migration as m003 } from '../../../src/persistence/migrations/003-adapters.js'

describe('migration 003-adapters', () => {
  it('declares the canonical id and description', () => {
    expect(m003.id).toBe('003-adapters')
    expect(m003.description).toMatch(/adapters/i)
  })

  it('creates the adapters table with the expected columns', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    m001.up(db)
    m002.up(db)
    m003.up(db)

    const info = db
      .prepare("PRAGMA table_info('adapters')")
      .all() as Array<{ name: string; type: string; notnull: 0 | 1; pk: 0 | 1 }>

    const names = info.map((c) => c.name)
    expect(names).toEqual([
      'adapter_id',
      'version',
      'source_specifier',
      'config_json',
      'last_health_json',
      'installed_at',
      'updated_at',
    ])

    const pk = info.find((c) => c.pk === 1)
    expect(pk?.name).toBe('adapter_id')
  })

  it('passes its own verify(db) integrity check', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    m001.up(db)
    m002.up(db)
    m003.up(db)
    expect(() => m003.verify(db)).not.toThrow()
  })

  it('verify(db) throws when the table is missing', () => {
    const db = new Database(':memory:')
    expect(() => m003.verify(db)).toThrow(/adapters/)
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
pnpm --filter @dycode/dycoded test -- 003-adapters
```

Expected: FAIL — `Cannot find module '003-adapters.js'`.

- [ ] **Step 3: Implement the migration**

`daemons/dycoded/src/persistence/migrations/003-adapters.ts`:

```ts
import type Database from 'better-sqlite3'
import type { Migration } from '../migrate.js'

const SQL = `
  CREATE TABLE IF NOT EXISTS adapters (
    adapter_id        TEXT PRIMARY KEY,
    version           TEXT NOT NULL,
    source_specifier  TEXT NOT NULL,
    config_json       TEXT NOT NULL DEFAULT '{}',
    last_health_json  TEXT,
    installed_at      INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL
  ) STRICT;
`

export const migration: Migration = {
  id: '003-adapters',
  description: 'Installed adapter rows: id, version, source specifier, config blob, last health, install timestamps.',
  up(db: Database.Database) {
    db.exec(SQL)
  },
  verify(db: Database.Database) {
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='adapters'",
      )
      .get() as { name?: string } | undefined
    if (!row?.name) {
      throw new Error('migration 003-adapters: expected `adapters` table to exist after up()')
    }
    const cols = db.prepare("PRAGMA table_info('adapters')").all() as Array<{
      name: string
    }>
    const expected = [
      'adapter_id',
      'version',
      'source_specifier',
      'config_json',
      'last_health_json',
      'installed_at',
      'updated_at',
    ]
    const got = cols.map((c) => c.name)
    if (JSON.stringify(got) !== JSON.stringify(expected)) {
      throw new Error(
        `migration 003-adapters: column drift. expected=${JSON.stringify(expected)} got=${JSON.stringify(got)}`,
      )
    }
  },
}
```

- [ ] **Step 4: Register with the migration runner**

Open `daemons/dycoded/src/persistence/migrate.ts` and add the import + entry to the migrations array (next to 001 and 002 — Plan 03 set up an explicit array):

```ts
import { migration as m003 } from './migrations/003-adapters.js'
// …
export const MIGRATIONS = [m001, m002, m003]
```

- [ ] **Step 5: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- 003-adapters
pnpm --filter @dycode/dycoded test -- migrate
```

Expected: PASS — new tests green, existing runner tests still green (the runner now records `003-adapters` in `schema_migrations`).

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/persistence/migrations/003-adapters.ts daemons/dycoded/src/persistence/migrate.ts daemons/dycoded/tests/persistence/migrations/003-adapters.test.ts
git commit -m "feat(dycoded): add migration 003-adapters for installed adapter rows"
```

---

### Task 07 · `AdapterRepository` — CRUD over the `adapters` table

**Files:**
- Create: `daemons/dycoded/src/persistence/adapter-repo.ts`
- Create: `daemons/dycoded/tests/persistence/adapter-repo.test.ts`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/persistence/adapter-repo.test.ts`:

```ts
import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../src/persistence/migrate.js'
import {
  type AdapterRecord,
  AdapterRepository,
} from '../../src/persistence/adapter-repo.js'

function freshDb() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  return db
}

const NOW = 1_700_000_000_000

const sample: AdapterRecord = {
  adapterId: 'fixture',
  version: '1.0.0',
  sourceSpecifier: 'file:///fixtures/fixture-adapter',
  config: {},
  lastHealth: null,
  installedAt: NOW,
  updatedAt: NOW,
}

describe('AdapterRepository', () => {
  let repo: AdapterRepository

  beforeEach(() => {
    repo = new AdapterRepository(freshDb(), () => NOW)
  })

  it('insert + get roundtrip', () => {
    repo.insert(sample)
    expect(repo.get('fixture')).toEqual(sample)
  })

  it('insert is idempotent on the same id via upsert semantics', () => {
    repo.insert(sample)
    repo.insert({ ...sample, version: '1.0.1' })
    expect(repo.get('fixture')?.version).toBe('1.0.1')
  })

  it('list() returns rows in installed_at order', () => {
    repo.insert({ ...sample, adapterId: 'a', installedAt: NOW - 1000 })
    repo.insert({ ...sample, adapterId: 'b', installedAt: NOW })
    expect(repo.list().map((r) => r.adapterId)).toEqual(['a', 'b'])
  })

  it('remove() deletes a row', () => {
    repo.insert(sample)
    repo.remove('fixture')
    expect(repo.get('fixture')).toBeUndefined()
  })

  it('remove() is a no-op on a missing id', () => {
    expect(() => repo.remove('does-not-exist')).not.toThrow()
  })

  it('updateConfig() persists config + bumps updatedAt', () => {
    repo.insert(sample)
    repo.updateConfig('fixture', { apiKey: 'sk-test' })
    const row = repo.get('fixture')
    expect(row?.config).toEqual({ apiKey: 'sk-test' })
    expect(row?.updatedAt).toBe(NOW)
  })

  it('updateConfig() throws on a missing adapter', () => {
    expect(() => repo.updateConfig('ghost', {})).toThrow(/ghost/)
  })

  it('updateHealth() persists the report blob', () => {
    repo.insert(sample)
    repo.updateHealth('fixture', { healthy: true, ts: NOW })
    expect(repo.get('fixture')?.lastHealth).toEqual({ healthy: true, ts: NOW })
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
pnpm --filter @dycode/dycoded test -- adapter-repo
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement the repository**

`daemons/dycoded/src/persistence/adapter-repo.ts`:

```ts
import type Database from 'better-sqlite3'

export interface AdapterRecord {
  readonly adapterId: string
  readonly version: string
  readonly sourceSpecifier: string
  readonly config: Readonly<Record<string, unknown>>
  readonly lastHealth: Readonly<Record<string, unknown>> | null
  readonly installedAt: number
  readonly updatedAt: number
}

type Row = {
  adapter_id: string
  version: string
  source_specifier: string
  config_json: string
  last_health_json: string | null
  installed_at: number
  updated_at: number
}

const SELECT = `
  SELECT adapter_id, version, source_specifier, config_json, last_health_json, installed_at, updated_at
  FROM adapters
`

export class AdapterRepository {
  private readonly db: Database.Database
  private readonly now: () => number

  constructor(db: Database.Database, now: () => number = () => Date.now()) {
    this.db = db
    this.now = now
  }

  insert(record: AdapterRecord): void {
    this.db
      .prepare(
        `INSERT INTO adapters
           (adapter_id, version, source_specifier, config_json, last_health_json, installed_at, updated_at)
         VALUES
           (@adapter_id, @version, @source_specifier, @config_json, @last_health_json, @installed_at, @updated_at)
         ON CONFLICT(adapter_id) DO UPDATE SET
           version          = excluded.version,
           source_specifier = excluded.source_specifier,
           config_json      = excluded.config_json,
           last_health_json = excluded.last_health_json,
           updated_at       = excluded.updated_at`,
      )
      .run(this.toRow(record))
  }

  get(adapterId: string): AdapterRecord | undefined {
    const row = this.db.prepare(`${SELECT} WHERE adapter_id = ?`).get(adapterId) as Row | undefined
    return row ? this.fromRow(row) : undefined
  }

  list(): AdapterRecord[] {
    const rows = this.db.prepare(`${SELECT} ORDER BY installed_at ASC, adapter_id ASC`).all() as Row[]
    return rows.map((r) => this.fromRow(r))
  }

  remove(adapterId: string): void {
    this.db.prepare('DELETE FROM adapters WHERE adapter_id = ?').run(adapterId)
  }

  updateConfig(adapterId: string, config: Readonly<Record<string, unknown>>): void {
    const result = this.db
      .prepare('UPDATE adapters SET config_json = ?, updated_at = ? WHERE adapter_id = ?')
      .run(JSON.stringify(config), this.now(), adapterId)
    if (result.changes === 0) {
      throw new Error(`AdapterRepository.updateConfig: no adapter with id=${adapterId}`)
    }
  }

  updateHealth(adapterId: string, health: Readonly<Record<string, unknown>>): void {
    this.db
      .prepare('UPDATE adapters SET last_health_json = ?, updated_at = ? WHERE adapter_id = ?')
      .run(JSON.stringify(health), this.now(), adapterId)
  }

  private toRow(r: AdapterRecord) {
    return {
      adapter_id: r.adapterId,
      version: r.version,
      source_specifier: r.sourceSpecifier,
      config_json: JSON.stringify(r.config),
      last_health_json: r.lastHealth ? JSON.stringify(r.lastHealth) : null,
      installed_at: r.installedAt,
      updated_at: r.updatedAt,
    }
  }

  private fromRow(r: Row): AdapterRecord {
    return {
      adapterId: r.adapter_id,
      version: r.version,
      sourceSpecifier: r.source_specifier,
      config: JSON.parse(r.config_json),
      lastHealth: r.last_health_json ? JSON.parse(r.last_health_json) : null,
      installedAt: r.installed_at,
      updatedAt: r.updated_at,
    }
  }
}
```

- [ ] **Step 4: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- adapter-repo
```

Expected: PASS — 8 tests green.

- [ ] **Step 5: Verify**

```bash
bash scripts/verify.sh
```

Expected: gates 1–4 green.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/persistence/adapter-repo.ts daemons/dycoded/tests/persistence/adapter-repo.test.ts
git commit -m "feat(dycoded): add AdapterRepository CRUD over the adapters table"
```

---

### Task 08 · `loadPluginFromSpecifier()` — dynamic import + manifest validation

**Files:**
- Modify: `daemons/dycoded/src/adapters/loader.ts`
- Create: `daemons/dycoded/tests/adapters/loader.test.ts`
- Create: `daemons/dycoded/tests/fixtures/bad-adapter/index.ts`
- Create: `daemons/dycoded/tests/fixtures/bad-adapter/package.json`
- Create: `daemons/dycoded/tests/fixtures/minimal-adapter/index.ts`
- Create: `daemons/dycoded/tests/fixtures/minimal-adapter/package.json`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/adapters/loader.test.ts`:

```ts
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { LoaderError, loadPluginFromSpecifier } from '../../src/adapters/loader.js'

const here = path.dirname(new URL(import.meta.url).pathname)
const minimal = pathToFileURL(path.join(here, '../fixtures/minimal-adapter/index.ts')).href
const bad = pathToFileURL(path.join(here, '../fixtures/bad-adapter/index.ts')).href

describe('loadPluginFromSpecifier', () => {
  it('loads + manifest-validates a well-formed adapter module', async () => {
    const plugin = await loadPluginFromSpecifier(minimal)
    expect(plugin.manifest.id).toBe('minimal')
    expect(plugin.manifest.flavor).toBe('structured')
    expect(typeof plugin.detect).toBe('function')
    expect(typeof plugin.create).toBe('function')
  })

  it('rejects a module with an invalid manifest', async () => {
    await expect(loadPluginFromSpecifier(bad)).rejects.toBeInstanceOf(LoaderError)
    await expect(loadPluginFromSpecifier(bad)).rejects.toThrow(/manifest/i)
  })

  it('rejects a module that fails to resolve', async () => {
    await expect(loadPluginFromSpecifier('file:///does/not/exist.js')).rejects.toBeInstanceOf(
      LoaderError,
    )
  })
})
```

- [ ] **Step 2: Create the fixtures**

`daemons/dycoded/tests/fixtures/minimal-adapter/package.json`:

```json
{
  "name": "fixture-minimal-adapter",
  "version": "1.0.0",
  "type": "module",
  "main": "index.ts",
  "dycodeAdapter": true
}
```

`daemons/dycoded/tests/fixtures/minimal-adapter/index.ts`:

```ts
import { createAdapter } from '@dycode/adapter-sdk'

export default createAdapter({
  manifest: {
    id: 'minimal',
    displayName: 'Minimal',
    vendor: 'tests',
    apiVersion: 1,
    capabilities: ['code.read'],
    flavor: 'structured',
    concurrencyCap: 1,
  },
  detect: async () => ({ installed: true, version: '1.0.0' }),
  create: () => ({
    async *start() {
      yield { type: 'done', status: 'ok', summary: 'fixture' }
    },
    async cancel() {},
    async health() {
      return { healthy: true, ts: Date.now() }
    },
    async dispose() {},
  }),
})
```

`daemons/dycoded/tests/fixtures/bad-adapter/package.json`:

```json
{
  "name": "fixture-bad-adapter",
  "version": "1.0.0",
  "type": "module",
  "main": "index.ts",
  "dycodeAdapter": true
}
```

`daemons/dycoded/tests/fixtures/bad-adapter/index.ts`:

```ts
// Deliberately missing required manifest fields.
export default {
  manifest: { id: 'bad' },
  detect: async () => ({ installed: false }),
  create: () => ({
    async *start() {},
    async cancel() {},
    async health() {
      return { healthy: false, ts: Date.now() }
    },
    async dispose() {},
  }),
}
```

- [ ] **Step 3: Run to verify red**

```bash
pnpm --filter @dycode/dycoded test -- loader
```

Expected: FAIL — `loadPluginFromSpecifier` not exported.

- [ ] **Step 4: Implement the loader**

Replace `daemons/dycoded/src/adapters/loader.ts`:

```ts
import {
  AdapterManifestSchema,
  type AdapterPlugin,
} from '@dycode/adapter-sdk'

export class LoaderError extends Error {
  readonly specifier: string
  readonly cause: unknown
  constructor(specifier: string, message: string, cause?: unknown) {
    super(`[${specifier}] ${message}`)
    this.name = 'LoaderError'
    this.specifier = specifier
    this.cause = cause
  }
}

/**
 * Dynamically import an adapter module and return its default export
 * after manifest validation. Caller is responsible for restricting which
 * specifiers may be passed (see discovery.ts).
 */
export async function loadPluginFromSpecifier(specifier: string): Promise<AdapterPlugin> {
  let mod: { default?: unknown }
  try {
    mod = (await import(specifier)) as { default?: unknown }
  } catch (cause) {
    throw new LoaderError(specifier, 'failed to import adapter module', cause)
  }
  const candidate = mod.default
  if (!candidate || typeof candidate !== 'object') {
    throw new LoaderError(specifier, 'adapter module must `export default` an AdapterPlugin object')
  }
  const obj = candidate as Record<string, unknown>
  if (!('manifest' in obj) || !('detect' in obj) || !('create' in obj)) {
    throw new LoaderError(
      specifier,
      'adapter plugin is missing one of the required keys: manifest, detect, create',
    )
  }
  const manifestResult = AdapterManifestSchema.safeParse(obj.manifest)
  if (!manifestResult.success) {
    throw new LoaderError(
      specifier,
      `adapter manifest failed schema validation: ${manifestResult.error.message}`,
      manifestResult.error,
    )
  }
  if (typeof obj.detect !== 'function' || typeof obj.create !== 'function') {
    throw new LoaderError(specifier, '`detect` and `create` must be functions')
  }
  // Stamp the validated manifest back onto the object so downstream code
  // works on a known-good shape (defaults applied, unknown keys stripped).
  return {
    ...(obj as unknown as AdapterPlugin),
    manifest: manifestResult.data,
  }
}
```

- [ ] **Step 5: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- loader
```

Expected: PASS — 3 tests green.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/adapters/loader.ts daemons/dycoded/tests/adapters/loader.test.ts daemons/dycoded/tests/fixtures/minimal-adapter daemons/dycoded/tests/fixtures/bad-adapter
git commit -m "feat(dycoded): add loadPluginFromSpecifier with manifest validation"
```

---

### Task 09 · `discoverAdaptersOnDisk()` — walks `~/.dycode/adapters/node_modules`

**Files:**
- Modify: `daemons/dycoded/src/adapters/discovery.ts`
- Create: `daemons/dycoded/tests/adapters/discovery.test.ts`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/adapters/discovery.test.ts`:

```ts
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { discoverAdaptersOnDisk } from '../../src/adapters/discovery.js'

async function writePkg(dir: string, name: string, dycodeAdapter: boolean) {
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name, version: '1.0.0', main: 'index.js', dycodeAdapter }, null, 2),
  )
  await fs.writeFile(path.join(dir, 'index.js'), 'export default {}\n')
}

describe('discoverAdaptersOnDisk', () => {
  let tmp: string
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dycode-discovery-'))
  })
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('returns an empty array when the adapters dir is missing', async () => {
    const result = await discoverAdaptersOnDisk(path.join(tmp, 'nope'))
    expect(result).toEqual([])
  })

  it('finds an unscoped adapter package with dycodeAdapter:true', async () => {
    const pkgDir = path.join(tmp, 'adapters/node_modules/foo')
    await writePkg(pkgDir, 'foo', true)
    const result = await discoverAdaptersOnDisk(path.join(tmp, 'adapters'))
    expect(result).toHaveLength(1)
    expect(result[0]!.packageName).toBe('foo')
    expect(result[0]!.specifier).toMatch(/^file:.*foo\/index\.js$/)
  })

  it('finds a scoped adapter package', async () => {
    const pkgDir = path.join(tmp, 'adapters/node_modules/@dycode/adapter-foo')
    await writePkg(pkgDir, '@dycode/adapter-foo', true)
    const result = await discoverAdaptersOnDisk(path.join(tmp, 'adapters'))
    expect(result.map((r) => r.packageName)).toEqual(['@dycode/adapter-foo'])
  })

  it('skips packages without dycodeAdapter:true', async () => {
    const pkgDir = path.join(tmp, 'adapters/node_modules/nope')
    await writePkg(pkgDir, 'nope', false)
    expect(await discoverAdaptersOnDisk(path.join(tmp, 'adapters'))).toEqual([])
  })

  it('skips packages with no package.json', async () => {
    await fs.mkdir(path.join(tmp, 'adapters/node_modules/half'), { recursive: true })
    expect(await discoverAdaptersOnDisk(path.join(tmp, 'adapters'))).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
pnpm --filter @dycode/dycoded test -- discovery
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement discovery**

Replace `daemons/dycoded/src/adapters/discovery.ts`:

```ts
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export interface DiscoveredAdapter {
  /** Package name (`foo` or `@scope/name`). */
  readonly packageName: string
  /** `file://` URL to the package's resolved entrypoint, ready for `import()`. */
  readonly specifier: string
  /** Absolute filesystem path to the package directory. */
  readonly packageDir: string
  /** Declared `version` from the package.json. */
  readonly version: string
}

interface AdapterPkgJson {
  name?: unknown
  version?: unknown
  main?: unknown
  module?: unknown
  exports?: unknown
  dycodeAdapter?: unknown
}

async function readPkgJson(dir: string): Promise<AdapterPkgJson | undefined> {
  try {
    const raw = await fs.readFile(path.join(dir, 'package.json'), 'utf8')
    return JSON.parse(raw) as AdapterPkgJson
  } catch {
    return undefined
  }
}

function entryPathFromPkg(pkg: AdapterPkgJson): string {
  if (typeof pkg.module === 'string') return pkg.module
  if (typeof pkg.main === 'string') return pkg.main
  return 'index.js'
}

/**
 * Walk `<adaptersRoot>/node_modules` and return one `DiscoveredAdapter`
 * per directory whose `package.json` has `dycodeAdapter: true`.
 *
 * Recognises both unscoped (`foo/`) and scoped (`@scope/name/`) layouts.
 * Returns `[]` when the directory does not exist.
 */
export async function discoverAdaptersOnDisk(
  adaptersRoot: string,
): Promise<DiscoveredAdapter[]> {
  const nodeModules = path.join(adaptersRoot, 'node_modules')
  let topLevel: string[]
  try {
    topLevel = await fs.readdir(nodeModules)
  } catch {
    return []
  }

  const candidates: string[] = []
  for (const entry of topLevel) {
    if (entry.startsWith('@')) {
      // Scoped: @scope/name
      let scoped: string[] = []
      try {
        scoped = await fs.readdir(path.join(nodeModules, entry))
      } catch {
        continue
      }
      for (const inner of scoped) candidates.push(path.join(nodeModules, entry, inner))
    } else {
      candidates.push(path.join(nodeModules, entry))
    }
  }

  const out: DiscoveredAdapter[] = []
  for (const pkgDir of candidates) {
    const pkg = await readPkgJson(pkgDir)
    if (!pkg) continue
    if (pkg.dycodeAdapter !== true) continue
    if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') continue
    const entry = path.join(pkgDir, entryPathFromPkg(pkg))
    out.push({
      packageName: pkg.name,
      version: pkg.version,
      packageDir: pkgDir,
      specifier: pathToFileURL(entry).href,
    })
  }
  return out
}
```

- [ ] **Step 4: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- discovery
```

Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add daemons/dycoded/src/adapters/discovery.ts daemons/dycoded/tests/adapters/discovery.test.ts
git commit -m "feat(dycoded): walk ~/.dycode/adapters/node_modules for dycodeAdapter packages"
```

---

### Task 10 · `AdapterRegistry` — in-memory map

**Files:**
- Modify: `daemons/dycoded/src/adapters/registry.ts`
- Create: `daemons/dycoded/tests/adapters/registry.test.ts`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/adapters/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { AdapterPlugin } from '@dycode/adapter-sdk'
import { AdapterRegistry } from '../../src/adapters/registry.js'

function plugin(id: string): AdapterPlugin {
  return {
    manifest: {
      id,
      displayName: id,
      vendor: 't',
      apiVersion: 1,
      capabilities: [],
      flavor: 'structured',
      concurrencyCap: 1,
    },
    detect: async () => ({ installed: true, version: '1.0.0' }),
    create: () => ({
      async *start() {},
      async cancel() {},
      async health() {
        return { healthy: true, ts: 0 }
      },
      async dispose() {},
    }),
  }
}

describe('AdapterRegistry', () => {
  it('registers and retrieves a plugin by id', () => {
    const r = new AdapterRegistry()
    r.register(plugin('a'))
    expect(r.get('a')?.manifest.id).toBe('a')
    expect(r.has('a')).toBe(true)
  })

  it('register() rejects duplicate ids', () => {
    const r = new AdapterRegistry()
    r.register(plugin('a'))
    expect(() => r.register(plugin('a'))).toThrow(/duplicate/i)
  })

  it('replace() overwrites silently', () => {
    const r = new AdapterRegistry()
    const first = plugin('a')
    const second = plugin('a')
    r.register(first)
    r.replace(second)
    expect(r.get('a')).toBe(second)
  })

  it('list() returns plugins sorted by id', () => {
    const r = new AdapterRegistry()
    r.register(plugin('b'))
    r.register(plugin('a'))
    expect(r.list().map((p) => p.manifest.id)).toEqual(['a', 'b'])
  })

  it('remove() drops a plugin and is a no-op on missing ids', () => {
    const r = new AdapterRegistry()
    r.register(plugin('a'))
    r.remove('a')
    expect(r.has('a')).toBe(false)
    expect(() => r.remove('ghost')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
pnpm --filter @dycode/dycoded test -- 'adapters/registry'
```

Expected: FAIL — `AdapterRegistry` not exported.

- [ ] **Step 3: Implement**

Replace `daemons/dycoded/src/adapters/registry.ts`:

```ts
import type { AdapterPlugin } from '@dycode/adapter-sdk'

export class AdapterRegistry {
  private readonly plugins = new Map<string, AdapterPlugin>()

  register(plugin: AdapterPlugin): void {
    const id = plugin.manifest.id
    if (this.plugins.has(id)) {
      throw new Error(`AdapterRegistry: duplicate adapter id "${id}"`)
    }
    this.plugins.set(id, plugin)
  }

  /** Register or overwrite. Used by hot-reload and bootstrap idempotency. */
  replace(plugin: AdapterPlugin): void {
    this.plugins.set(plugin.manifest.id, plugin)
  }

  get(id: string): AdapterPlugin | undefined {
    return this.plugins.get(id)
  }

  has(id: string): boolean {
    return this.plugins.has(id)
  }

  list(): AdapterPlugin[] {
    return [...this.plugins.values()].sort((a, b) =>
      a.manifest.id.localeCompare(b.manifest.id),
    )
  }

  remove(id: string): void {
    this.plugins.delete(id)
  }
}
```

- [ ] **Step 4: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- 'adapters/registry'
```

Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add daemons/dycoded/src/adapters/registry.ts daemons/dycoded/tests/adapters/registry.test.ts
git commit -m "feat(dycoded): add in-memory AdapterRegistry"
```

---

### Task 11 · `AdapterHost` — composes loader + discovery + registry + repo

**Files:**
- Modify: `daemons/dycoded/src/adapters/host.ts`
- Create: `daemons/dycoded/tests/adapters/host.test.ts`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/adapters/host.test.ts`:

```ts
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../src/persistence/migrate.js'
import { AdapterRepository } from '../../src/persistence/adapter-repo.js'
import { AdapterHost } from '../../src/adapters/host.js'

const here = path.dirname(new URL(import.meta.url).pathname)
const minimalSpecifier = pathToFileURL(
  path.join(here, '../fixtures/minimal-adapter/index.ts'),
).href

describe('AdapterHost', () => {
  let tmp: string
  let host: AdapterHost
  let repo: AdapterRepository

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dycode-host-'))
    const db = new Database(':memory:')
    runMigrations(db)
    repo = new AdapterRepository(db, () => 1)
    host = new AdapterHost({ repo, adaptersRoot: path.join(tmp, 'adapters') })
  })

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('install() persists a row and registers the plugin in memory', async () => {
    const plugin = await host.install({
      specifier: minimalSpecifier,
      packageName: 'minimal',
      version: '1.0.0',
    })
    expect(plugin.manifest.id).toBe('minimal')
    expect(host.registry.has('minimal')).toBe(true)
    expect(repo.get('minimal')?.sourceSpecifier).toBe(minimalSpecifier)
  })

  it('install() rejects when manifest validation fails', async () => {
    const badPath = pathToFileURL(
      path.join(here, '../fixtures/bad-adapter/index.ts'),
    ).href
    await expect(
      host.install({ specifier: badPath, packageName: 'bad', version: '1.0.0' }),
    ).rejects.toThrow(/manifest/i)
    expect(repo.get('bad')).toBeUndefined()
  })

  it('uninstall() drops from registry and repo', async () => {
    await host.install({
      specifier: minimalSpecifier,
      packageName: 'minimal',
      version: '1.0.0',
    })
    await host.uninstall('minimal')
    expect(host.registry.has('minimal')).toBe(false)
    expect(repo.get('minimal')).toBeUndefined()
  })

  it('bootstrap() rehydrates persisted adapters into the registry', async () => {
    // Pre-seed the repo with a record but skip the in-memory registry…
    repo.insert({
      adapterId: 'minimal',
      version: '1.0.0',
      sourceSpecifier: minimalSpecifier,
      config: {},
      lastHealth: null,
      installedAt: 1,
      updatedAt: 1,
    })
    await host.bootstrap()
    expect(host.registry.has('minimal')).toBe(true)
  })

  it('bootstrap() is idempotent — running twice does not throw', async () => {
    repo.insert({
      adapterId: 'minimal',
      version: '1.0.0',
      sourceSpecifier: minimalSpecifier,
      config: {},
      lastHealth: null,
      installedAt: 1,
      updatedAt: 1,
    })
    await host.bootstrap()
    await expect(host.bootstrap()).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
pnpm --filter @dycode/dycoded test -- 'adapters/host'
```

Expected: FAIL.

- [ ] **Step 3: Implement the host**

Replace `daemons/dycoded/src/adapters/host.ts`:

```ts
import type { AdapterPlugin } from '@dycode/adapter-sdk'
import type { AdapterRepository } from '../persistence/adapter-repo.js'
import { discoverAdaptersOnDisk, type DiscoveredAdapter } from './discovery.js'
import { loadPluginFromSpecifier } from './loader.js'
import { AdapterRegistry } from './registry.js'

export interface InstallArgs {
  readonly specifier: string
  readonly packageName: string
  readonly version: string
}

export interface AdapterHostOpts {
  readonly repo: AdapterRepository
  /** Absolute path that contains a `node_modules/` subtree of installed adapters. */
  readonly adaptersRoot: string
  /** Injectable clock for deterministic tests. */
  readonly now?: () => number
}

export class AdapterHost {
  readonly registry = new AdapterRegistry()
  private readonly repo: AdapterRepository
  private readonly adaptersRoot: string
  private readonly now: () => number

  constructor(opts: AdapterHostOpts) {
    this.repo = opts.repo
    this.adaptersRoot = opts.adaptersRoot
    this.now = opts.now ?? (() => Date.now())
  }

  /**
   * Load every adapter recorded in the repo into the in-memory registry.
   * Safe to call multiple times — uses `registry.replace`.
   */
  async bootstrap(): Promise<void> {
    for (const row of this.repo.list()) {
      const plugin = await loadPluginFromSpecifier(row.sourceSpecifier)
      this.registry.replace(plugin)
    }
  }

  /** Run on-disk discovery and return what was found. Does not load anything. */
  async discover(): Promise<DiscoveredAdapter[]> {
    return discoverAdaptersOnDisk(this.adaptersRoot)
  }

  /**
   * Load the adapter at `specifier`, validate its manifest, persist a row,
   * and register the plugin. Rolls back the persisted row if validation
   * or registration fails.
   */
  async install(args: InstallArgs): Promise<AdapterPlugin> {
    const plugin = await loadPluginFromSpecifier(args.specifier)
    const ts = this.now()
    this.repo.insert({
      adapterId: plugin.manifest.id,
      version: args.version,
      sourceSpecifier: args.specifier,
      config: {},
      lastHealth: null,
      installedAt: ts,
      updatedAt: ts,
    })
    try {
      this.registry.replace(plugin)
    } catch (err) {
      this.repo.remove(plugin.manifest.id)
      throw err
    }
    return plugin
  }

  async uninstall(adapterId: string): Promise<void> {
    this.registry.remove(adapterId)
    this.repo.remove(adapterId)
  }
}
```

- [ ] **Step 4: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- 'adapters/host'
```

Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add daemons/dycoded/src/adapters/host.ts daemons/dycoded/tests/adapters/host.test.ts
git commit -m "feat(dycoded): add AdapterHost composing loader+discovery+registry+repo"
```

---

### Task 12 · Capability gate

**Files:**
- Modify: `daemons/dycoded/src/adapters/capability-gate.ts`
- Create: `daemons/dycoded/tests/adapters/capability-gate.test.ts`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/adapters/capability-gate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { AdapterPlugin } from '@dycode/adapter-sdk'
import {
  CapabilityGateError,
  assertCapability,
} from '../../src/adapters/capability-gate.js'
import { AdapterRegistry } from '../../src/adapters/registry.js'

function plugin(id: string, caps: AdapterPlugin['manifest']['capabilities']): AdapterPlugin {
  return {
    manifest: {
      id,
      displayName: id,
      vendor: 't',
      apiVersion: 1,
      capabilities: caps,
      flavor: 'structured',
      concurrencyCap: 1,
    },
    detect: async () => ({ installed: true, version: '1.0.0' }),
    create: () => ({
      async *start() {},
      async cancel() {},
      async health() {
        return { healthy: true, ts: 0 }
      },
      async dispose() {},
    }),
  }
}

describe('assertCapability', () => {
  it('passes when the adapter declares the capability', () => {
    const r = new AdapterRegistry()
    r.register(plugin('a', ['shell.exec']))
    expect(() => assertCapability(r, 'a', 'shell.exec')).not.toThrow()
  })

  it('throws CapabilityGateError when capability is undeclared', () => {
    const r = new AdapterRegistry()
    r.register(plugin('a', ['code.read']))
    expect(() => assertCapability(r, 'a', 'shell.exec')).toThrow(CapabilityGateError)
    try {
      assertCapability(r, 'a', 'shell.exec')
    } catch (e) {
      const err = e as CapabilityGateError
      expect(err.adapterId).toBe('a')
      expect(err.capability).toBe('shell.exec')
    }
  })

  it('throws CapabilityGateError when adapter is unknown', () => {
    const r = new AdapterRegistry()
    expect(() => assertCapability(r, 'ghost', 'shell.exec')).toThrow(/ghost/)
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
pnpm --filter @dycode/dycoded test -- capability-gate
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Replace `daemons/dycoded/src/adapters/capability-gate.ts`:

```ts
import type { Capability } from '@dycode/contracts'
import type { AdapterRegistry } from './registry.js'

export class CapabilityGateError extends Error {
  readonly adapterId: string
  readonly capability: Capability | string
  constructor(adapterId: string, capability: Capability | string, message: string) {
    super(message)
    this.name = 'CapabilityGateError'
    this.adapterId = adapterId
    this.capability = capability
  }
}

/**
 * Throws `CapabilityGateError` unless the adapter identified by `adapterId`
 * has declared `capability` in its manifest. This is the only gate the
 * adapter host trusts — every handler that performs a capability-bearing
 * operation MUST call this first.
 */
export function assertCapability(
  registry: AdapterRegistry,
  adapterId: string,
  capability: Capability,
): void {
  const plugin = registry.get(adapterId)
  if (!plugin) {
    throw new CapabilityGateError(
      adapterId,
      capability,
      `capability check: adapter "${adapterId}" is not registered`,
    )
  }
  if (!plugin.manifest.capabilities.includes(capability)) {
    throw new CapabilityGateError(
      adapterId,
      capability,
      `capability check: adapter "${adapterId}" did not declare "${capability}"`,
    )
  }
}
```

- [ ] **Step 4: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- capability-gate
```

Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add daemons/dycoded/src/adapters/capability-gate.ts daemons/dycoded/tests/adapters/capability-gate.test.ts
git commit -m "feat(dycoded): add capability gate refusing undeclared adapter operations"
```

---

### Task 13 · `InstanceController` — per-instance lifecycle wrapper

**Files:**
- Modify: `daemons/dycoded/src/adapters/lifecycle.ts`
- Create: `daemons/dycoded/tests/adapters/lifecycle.test.ts`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/adapters/lifecycle.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { AdapterPlugin } from '@dycode/adapter-sdk'
import { InstanceController } from '../../src/adapters/lifecycle.js'

function counterPlugin(): { plugin: AdapterPlugin; calls: string[] } {
  const calls: string[] = []
  const plugin: AdapterPlugin = {
    manifest: {
      id: 'counter',
      displayName: 'Counter',
      vendor: 't',
      apiVersion: 1,
      capabilities: ['code.read'],
      flavor: 'structured',
      concurrencyCap: 2,
    },
    detect: async () => ({ installed: true, version: '1.0.0' }),
    create: () => {
      calls.push('create')
      return {
        async *start(prompt) {
          calls.push(`start:${prompt.text}`)
          yield { type: 'output', chunk: prompt.text } as const
          yield { type: 'done', status: 'ok', summary: 'ok' } as const
        },
        async cancel(reason) {
          calls.push(`cancel:${reason}`)
        },
        async health() {
          calls.push('health')
          return { healthy: true, ts: 1 }
        },
        async dispose() {
          calls.push('dispose')
        },
      }
    },
  }
  return { plugin, calls }
}

describe('InstanceController', () => {
  it('create() invokes plugin.create exactly once', () => {
    const { plugin, calls } = counterPlugin()
    const ctl = new InstanceController(plugin, { workspaceRoot: '/w', env: {}, config: {} })
    ctl.create()
    expect(calls).toEqual(['create'])
    expect(ctl.isCreated).toBe(true)
  })

  it('create() throws if called twice', () => {
    const { plugin } = counterPlugin()
    const ctl = new InstanceController(plugin, { workspaceRoot: '/w', env: {}, config: {} })
    ctl.create()
    expect(() => ctl.create()).toThrow(/already created/)
  })

  it('runs start → consumes the event stream → records done', async () => {
    const { plugin, calls } = counterPlugin()
    const ctl = new InstanceController(plugin, { workspaceRoot: '/w', env: {}, config: {} })
    ctl.create()
    const collected: string[] = []
    for await (const ev of ctl.start({ text: 'hi' }, fakeCtx())) {
      collected.push(ev.type)
    }
    expect(collected).toEqual(['output', 'done'])
    expect(calls).toContain('start:hi')
    expect(ctl.lastDone?.status).toBe('ok')
  })

  it('cancel() forwards reason and aborts the ctx signal', async () => {
    const { plugin, calls } = counterPlugin()
    const ctl = new InstanceController(plugin, { workspaceRoot: '/w', env: {}, config: {} })
    ctl.create()
    await ctl.cancel('user-stop')
    expect(calls).toContain('cancel:user-stop')
  })

  it('dispose() is idempotent', async () => {
    const { plugin, calls } = counterPlugin()
    const ctl = new InstanceController(plugin, { workspaceRoot: '/w', env: {}, config: {} })
    ctl.create()
    await ctl.dispose()
    await ctl.dispose()
    expect(calls.filter((c) => c === 'dispose')).toHaveLength(1)
    expect(ctl.isDisposed).toBe(true)
  })

  it('health() returns the latest HealthReport and caches it', async () => {
    const { plugin } = counterPlugin()
    const ctl = new InstanceController(plugin, { workspaceRoot: '/w', env: {}, config: {} })
    ctl.create()
    const report = await ctl.health()
    expect(report.healthy).toBe(true)
    expect(ctl.lastHealth).toEqual(report)
  })
})

function fakeCtx() {
  const ctrl = new AbortController()
  return {
    workspaceId: 'ws_01HXAAAAAAAAAAAAAAAAAAAAAA' as const,
    agentId: 'ag_01HXAAAAAAAAAAAAAAAAAAAAAA' as const,
    taskId: 'tk_01HXAAAAAAAAAAAAAAAAAAAAAA' as const,
    workspaceRoot: '/w',
    env: {},
    signal: ctrl.signal,
  } as never
}
```

- [ ] **Step 2: Run to verify red**

```bash
pnpm --filter @dycode/dycoded test -- 'adapters/lifecycle'
```

Expected: FAIL.

- [ ] **Step 3: Implement the controller**

Replace `daemons/dycoded/src/adapters/lifecycle.ts`:

```ts
import type {
  AdapterEvent,
  AdapterInstance,
  AdapterPlugin,
  CreateOpts,
  HealthReport,
  Prompt,
  TaskCtx,
} from '@dycode/adapter-sdk'

export type DoneSummary = { status: 'ok' | 'error'; summary: string }

/**
 * Wraps a single `AdapterInstance`, tracks its lifecycle state, and surfaces
 * convenience metadata the rest of the host needs (last health, last done,
 * created flag, disposed flag, abort controller for cancellation).
 *
 * The controller is intentionally agnostic of persistence, IPC, or the event
 * bus — those live one layer up.
 */
export class InstanceController {
  readonly plugin: AdapterPlugin
  private readonly opts: CreateOpts
  private instance: AdapterInstance | undefined
  private disposed = false
  private cancelController = new AbortController()
  private _lastHealth: HealthReport | undefined
  private _lastDone: DoneSummary | undefined

  constructor(plugin: AdapterPlugin, opts: CreateOpts) {
    this.plugin = plugin
    this.opts = opts
  }

  create(): void {
    if (this.instance) {
      throw new Error(
        `InstanceController: adapter "${this.plugin.manifest.id}" already created`,
      )
    }
    this.instance = this.plugin.create(this.opts)
  }

  get isCreated(): boolean {
    return this.instance !== undefined
  }

  get isDisposed(): boolean {
    return this.disposed
  }

  get lastHealth(): HealthReport | undefined {
    return this._lastHealth
  }

  get lastDone(): DoneSummary | undefined {
    return this._lastDone
  }

  async *start(prompt: Prompt, ctx: TaskCtx): AsyncIterable<AdapterEvent> {
    const inst = this.requireInstance()
    for await (const event of inst.start(prompt, ctx)) {
      if (event.type === 'done') {
        this._lastDone = { status: event.status, summary: event.summary }
      }
      yield event
    }
  }

  async cancel(reason: string): Promise<void> {
    this.cancelController.abort(new Error(reason))
    this.cancelController = new AbortController()
    await this.requireInstance().cancel(reason)
  }

  async health(): Promise<HealthReport> {
    const report = await this.requireInstance().health()
    this._lastHealth = report
    return report
  }

  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    if (this.instance) await this.instance.dispose()
  }

  private requireInstance(): AdapterInstance {
    if (!this.instance) {
      throw new Error(
        `InstanceController: adapter "${this.plugin.manifest.id}" not created`,
      )
    }
    return this.instance
  }
}
```

- [ ] **Step 4: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- 'adapters/lifecycle'
```

Expected: PASS — 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add daemons/dycoded/src/adapters/lifecycle.ts daemons/dycoded/tests/adapters/lifecycle.test.ts
git commit -m "feat(dycoded): add InstanceController for per-instance adapter lifecycle"
```

---

### Task 14 · IPC bridge — `AdapterEvent → EventLogEntry → EventBus`

**Files:**
- Modify: `daemons/dycoded/src/adapters/ipc-bridge.ts`
- Create: `daemons/dycoded/tests/adapters/ipc-bridge.test.ts`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/adapters/ipc-bridge.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { AdapterEvent } from '@dycode/adapter-sdk'
import { bridgeAdapterEvents } from '../../src/adapters/ipc-bridge.js'

function fakeCtx() {
  return {
    workspaceId: 'ws_01HXAAAAAAAAAAAAAAAAAAAAAA',
    agentId: 'ag_01HXAAAAAAAAAAAAAAAAAAAAAA',
    taskId: 'tk_01HXAAAAAAAAAAAAAAAAAAAAAA',
  } as const
}

class FakeRepo {
  readonly appended: unknown[] = []
  append(entry: unknown) {
    this.appended.push(entry)
  }
}

class FakeBus {
  readonly published: unknown[] = []
  publish(entry: unknown) {
    this.published.push(entry)
  }
}

async function* fromArray<T>(items: T[]) {
  for (const x of items) yield x
}

const SAMPLE_EVENTS: AdapterEvent[] = [
  { type: 'output', chunk: 'hello' },
  { type: 'tool_call', name: 'fs.read', input: { path: '/x' } },
  { type: 'tool_result', name: 'fs.read', out: { bytes: 4 } },
  { type: 'progress', ratio: 0.5, note: 'halfway' },
  { type: 'verify_request', cmd: 'pnpm test' },
  { type: 'done', status: 'ok', summary: 'finished' },
]

describe('bridgeAdapterEvents', () => {
  it('appends every event to the repo and publishes to the bus', async () => {
    const repo = new FakeRepo()
    const bus = new FakeBus()
    let next = 0
    const fakeIds = () => `01H${String(next++).padStart(23, '0').toUpperCase()}A`
    await bridgeAdapterEvents(fromArray(SAMPLE_EVENTS), fakeCtx(), {
      repo: repo as never,
      bus: bus as never,
      ids: fakeIds,
      now: () => 42,
    })
    expect(repo.appended).toHaveLength(SAMPLE_EVENTS.length)
    expect(bus.published).toEqual(repo.appended)
  })

  it('encodes the discriminated `type` on each EventLogEntry', async () => {
    const repo = new FakeRepo()
    const bus = new FakeBus()
    await bridgeAdapterEvents(fromArray(SAMPLE_EVENTS), fakeCtx(), {
      repo: repo as never,
      bus: bus as never,
      ids: () => '01HXAAAAAAAAAAAAAAAAAAAAAA',
      now: () => 1,
    })
    const types = (repo.appended as Array<{ type: string }>).map((e) => e.type)
    expect(types).toEqual([
      'output',
      'tool_call',
      'tool_result',
      'progress',
      'verify_request',
      'done',
    ])
  })

  it('rethrows `error` adapter events and stops iteration', async () => {
    const repo = new FakeRepo()
    const bus = new FakeBus()
    const events: AdapterEvent[] = [
      { type: 'output', chunk: 'a' },
      { type: 'error', message: 'boom', code: 'X' },
      { type: 'output', chunk: 'never' },
    ]
    await expect(
      bridgeAdapterEvents(fromArray(events), fakeCtx(), {
        repo: repo as never,
        bus: bus as never,
        ids: () => '01HXAAAAAAAAAAAAAAAAAAAAAA',
        now: () => 1,
      }),
    ).rejects.toThrow(/boom/)
    // The error itself + the previous output were both appended; the trailing
    // 'output' was never seen because we rethrow on `error`.
    expect((repo.appended as Array<{ type: string }>).map((e) => e.type)).toEqual([
      'output',
      'error',
    ])
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
pnpm --filter @dycode/dycoded test -- ipc-bridge
```

Expected: FAIL.

- [ ] **Step 3: Implement the bridge**

Replace `daemons/dycoded/src/adapters/ipc-bridge.ts`:

```ts
import type { AdapterEvent } from '@dycode/adapter-sdk'
import type { AgentId, EventLogEntry, TaskId, WorkspaceId } from '@dycode/contracts'

export interface BridgeCtx {
  readonly workspaceId: WorkspaceId
  readonly agentId: AgentId
  readonly taskId: TaskId
}

export interface BridgeDeps {
  readonly repo: { append(entry: EventLogEntry): void }
  readonly bus: { publish(entry: EventLogEntry): void }
  readonly ids: () => string
  readonly now: () => number
}

/**
 * Consume an `AsyncIterable<AdapterEvent>`, translate each event into an
 * `EventLogEntry`, append it to the event-log repository, and publish it
 * on the in-process EventBus (which the subscription registry fans out
 * to WS clients as `event.appended`).
 *
 * On an `error` adapter event, the bridge appends + publishes it like any
 * other event, then throws — letting the caller record the failure on the
 * owning task. The trailing iterable is not drained after that.
 */
export async function bridgeAdapterEvents(
  events: AsyncIterable<AdapterEvent>,
  ctx: BridgeCtx,
  deps: BridgeDeps,
): Promise<void> {
  for await (const event of events) {
    const entry: EventLogEntry = {
      id: deps.ids(),
      ts: deps.now(),
      workspaceId: ctx.workspaceId,
      taskId: ctx.taskId,
      agentId: ctx.agentId,
      type: event.type,
      payload: toPayload(event),
    }
    deps.repo.append(entry)
    deps.bus.publish(entry)
    if (event.type === 'error') {
      throw new Error(event.message)
    }
  }
}

function toPayload(event: AdapterEvent): Record<string, unknown> {
  // Drop the discriminator from the payload — it lives on `entry.type` already.
  const { type: _ignored, ...rest } = event
  return rest
}
```

- [ ] **Step 4: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- ipc-bridge
```

Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add daemons/dycoded/src/adapters/ipc-bridge.ts daemons/dycoded/tests/adapters/ipc-bridge.test.ts
git commit -m "feat(dycoded): add ipc-bridge translating AdapterEvent into EventLogEntry"
```

---

### Task 15 · PTY channel for `flavor: 'pty'`

**Files:**
- Modify: `daemons/dycoded/src/adapters/pty.ts`
- Create: `daemons/dycoded/tests/adapters/pty.test.ts`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/adapters/pty.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { openPtyChannel } from '../../src/adapters/pty.js'

const SCRIPT = `
process.stdout.write('hello-pty\\n');
setTimeout(() => process.exit(0), 50);
`

describe('openPtyChannel', () => {
  it('streams stdout chunks via the AsyncIterable', async () => {
    const channel = openPtyChannel({
      cmd: process.execPath,
      args: ['-e', SCRIPT],
      env: { ...process.env },
      cwd: process.cwd(),
      cols: 80,
      rows: 24,
    })

    let combined = ''
    for await (const chunk of channel.output) {
      combined += chunk
    }
    expect(combined).toContain('hello-pty')
    expect(await channel.exit).toBe(0)
  })

  it('kill() terminates the child', async () => {
    const channel = openPtyChannel({
      cmd: process.execPath,
      args: ['-e', 'setInterval(()=>process.stdout.write("tick\\n"),10);'],
      env: { ...process.env },
      cwd: process.cwd(),
      cols: 80,
      rows: 24,
    })
    setTimeout(() => channel.kill('test-stop'), 80)
    let received = ''
    for await (const chunk of channel.output) {
      received += chunk
      if (received.length > 4) break
    }
    expect(received).toContain('tick')
    // Wait for exit — code is non-zero on a kill.
    const code = await channel.exit
    expect(code).not.toBe(0)
  })

  it('write() forwards data to the child stdin', async () => {
    const channel = openPtyChannel({
      cmd: process.execPath,
      args: [
        '-e',
        `process.stdin.setEncoding('utf8');
         let buf = '';
         process.stdin.on('data', (d) => {
           buf += d;
           if (buf.includes('\\n')) {
             process.stdout.write('echo:' + buf.trim() + '\\n');
             process.exit(0);
           }
         });`,
      ],
      env: { ...process.env },
      cwd: process.cwd(),
      cols: 80,
      rows: 24,
    })
    channel.write('ping\n')
    let combined = ''
    for await (const chunk of channel.output) {
      combined += chunk
    }
    expect(combined).toContain('echo:ping')
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
pnpm --filter @dycode/dycoded test -- 'adapters/pty'
```

Expected: FAIL.

- [ ] **Step 3: Implement the channel**

Replace `daemons/dycoded/src/adapters/pty.ts`:

```ts
import * as pty from 'node-pty'

export interface PtyOpenArgs {
  readonly cmd: string
  readonly args: ReadonlyArray<string>
  readonly env: Readonly<Record<string, string>>
  readonly cwd: string
  readonly cols?: number
  readonly rows?: number
}

export interface PtyChannel {
  /** Async iterable of raw stdout chunks (as strings). Terminates on child exit. */
  readonly output: AsyncIterable<string>
  /** Resolves to the exit code when the child terminates. */
  readonly exit: Promise<number>
  /** Push data to the child stdin. */
  write(data: string): void
  /** Resize the PTY window. */
  resize(cols: number, rows: number): void
  /** Send SIGTERM (or SIGKILL after a short grace period if still alive). */
  kill(reason: string): void
}

/**
 * Spawn a child process under a PTY and expose a typed channel.
 * Adapters with `manifest.flavor === 'pty'` use this; everything else (structured,
 * mcp, verifier) bypasses node-pty entirely.
 */
export function openPtyChannel(args: PtyOpenArgs): PtyChannel {
  const child = pty.spawn(args.cmd, [...args.args], {
    name: 'xterm-256color',
    cols: args.cols ?? 80,
    rows: args.rows ?? 24,
    cwd: args.cwd,
    env: args.env as { [k: string]: string },
  })

  const buffer: string[] = []
  let waiter: ((value: IteratorResult<string>) => void) | undefined
  let done = false

  const pushChunk = (chunk: string) => {
    if (done) return
    if (waiter) {
      const w = waiter
      waiter = undefined
      w({ value: chunk, done: false })
    } else {
      buffer.push(chunk)
    }
  }

  const closeStream = () => {
    done = true
    if (waiter) {
      const w = waiter
      waiter = undefined
      w({ value: undefined as never, done: true })
    }
  }

  child.onData((data) => pushChunk(data))
  let resolveExit!: (code: number) => void
  const exit = new Promise<number>((resolve) => {
    resolveExit = resolve
  })
  child.onExit(({ exitCode }) => {
    closeStream()
    resolveExit(exitCode)
  })

  const output: AsyncIterable<string> = {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<string>> {
          if (buffer.length > 0) {
            return Promise.resolve({ value: buffer.shift() as string, done: false })
          }
          if (done) {
            return Promise.resolve({ value: undefined as never, done: true })
          }
          return new Promise((resolve) => {
            waiter = resolve
          })
        },
      }
    },
  }

  return {
    output,
    exit,
    write(data) {
      child.write(data)
    },
    resize(cols, rows) {
      child.resize(cols, rows)
    },
    kill(_reason) {
      try {
        child.kill('SIGTERM')
      } catch {
        // ignore — child may already be gone
      }
      setTimeout(() => {
        try {
          child.kill('SIGKILL')
        } catch {
          // ignore
        }
      }, 200).unref()
    },
  }
}
```

- [ ] **Step 4: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- 'adapters/pty'
```

Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add daemons/dycoded/src/adapters/pty.ts daemons/dycoded/tests/adapters/pty.test.ts
git commit -m "feat(dycoded): add openPtyChannel wrapping node-pty for flavor=pty adapters"
```

---

### Task 16 · Health-probe scheduler

**Files:**
- Modify: `daemons/dycoded/src/adapters/health-probe.ts`
- Create: `daemons/dycoded/tests/adapters/health-probe.test.ts`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/adapters/health-probe.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HealthProbeScheduler } from '../../src/adapters/health-probe.js'

describe('HealthProbeScheduler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('invokes probe() on every interval tick', async () => {
    const probe = vi.fn().mockResolvedValue({ healthy: true, ts: 1 })
    const onChange = vi.fn()
    const scheduler = new HealthProbeScheduler({
      intervalMs: 1000,
      probe,
      onStatusChange: onChange,
    })
    scheduler.add('a')
    scheduler.start()
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(1000)
    expect(probe).toHaveBeenCalledTimes(2)
    expect(probe).toHaveBeenCalledWith('a')
  })

  it('fires onStatusChange only when health changes', async () => {
    const reports = [
      { healthy: true, ts: 1 },
      { healthy: true, ts: 2 },
      { healthy: false, ts: 3 },
      { healthy: false, ts: 4 },
      { healthy: true, ts: 5 },
    ]
    let i = 0
    const probe = vi.fn().mockImplementation(async () => reports[i++])
    const onChange = vi.fn()
    const scheduler = new HealthProbeScheduler({
      intervalMs: 1000,
      probe,
      onStatusChange: onChange,
    })
    scheduler.add('a')
    scheduler.start()
    for (let n = 0; n < 5; n++) await vi.advanceTimersByTimeAsync(1000)
    expect(onChange).toHaveBeenCalledTimes(3) // initial + 2 flips
    expect(onChange.mock.calls.map((c) => c[1].healthy)).toEqual([true, false, true])
  })

  it('stop() halts further probes', async () => {
    const probe = vi.fn().mockResolvedValue({ healthy: true, ts: 1 })
    const scheduler = new HealthProbeScheduler({
      intervalMs: 1000,
      probe,
      onStatusChange: () => {},
    })
    scheduler.add('a')
    scheduler.start()
    await vi.advanceTimersByTimeAsync(1000)
    scheduler.stop()
    await vi.advanceTimersByTimeAsync(5000)
    expect(probe).toHaveBeenCalledTimes(1)
  })

  it('remove() drops an adapter from the rotation', async () => {
    const probe = vi.fn().mockResolvedValue({ healthy: true, ts: 1 })
    const scheduler = new HealthProbeScheduler({
      intervalMs: 1000,
      probe,
      onStatusChange: () => {},
    })
    scheduler.add('a')
    scheduler.add('b')
    scheduler.start()
    await vi.advanceTimersByTimeAsync(1000)
    scheduler.remove('a')
    await vi.advanceTimersByTimeAsync(1000)
    const ids = probe.mock.calls.map((c) => c[0])
    expect(ids.filter((x) => x === 'a')).toHaveLength(1)
    expect(ids.filter((x) => x === 'b')).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
pnpm --filter @dycode/dycoded test -- health-probe
```

Expected: FAIL.

- [ ] **Step 3: Implement the scheduler**

Replace `daemons/dycoded/src/adapters/health-probe.ts`:

```ts
import type { HealthReport } from '@dycode/adapter-sdk'

export interface HealthProbeOpts {
  /** Probe interval in ms. Defaults to 30_000 in production wiring. */
  readonly intervalMs: number
  /** Performs a single health probe for one adapter id. */
  probe(adapterId: string): Promise<HealthReport>
  /** Called when a probe's `healthy` differs from the previously recorded value. */
  onStatusChange(adapterId: string, report: HealthReport): void
}

export class HealthProbeScheduler {
  private readonly opts: HealthProbeOpts
  private readonly tracked = new Map<string, HealthReport | undefined>()
  private timer: NodeJS.Timeout | undefined

  constructor(opts: HealthProbeOpts) {
    this.opts = opts
  }

  add(adapterId: string): void {
    if (!this.tracked.has(adapterId)) this.tracked.set(adapterId, undefined)
  }

  remove(adapterId: string): void {
    this.tracked.delete(adapterId)
  }

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      void this.tick()
    }, this.opts.intervalMs)
  }

  stop(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = undefined
  }

  /** Run one probe round across every tracked adapter. Exposed for tests. */
  async tick(): Promise<void> {
    for (const adapterId of [...this.tracked.keys()]) {
      let report: HealthReport
      try {
        report = await this.opts.probe(adapterId)
      } catch (err) {
        report = {
          healthy: false,
          ts: Date.now(),
          message: err instanceof Error ? err.message : String(err),
        }
      }
      const prev = this.tracked.get(adapterId)
      this.tracked.set(adapterId, report)
      if (!prev || prev.healthy !== report.healthy) {
        this.opts.onStatusChange(adapterId, report)
      }
    }
  }
}
```

- [ ] **Step 4: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- health-probe
```

Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add daemons/dycoded/src/adapters/health-probe.ts daemons/dycoded/tests/adapters/health-probe.test.ts
git commit -m "feat(dycoded): add HealthProbeScheduler emitting on healthy-flag flips"
```

---

### Task 17 · `adapter.list` handler

**Files:**
- Modify: `daemons/dycoded/src/ipc/handlers/adapter.ts`
- Create: `daemons/dycoded/tests/ipc/handlers/adapter.test.ts`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/ipc/handlers/adapter.test.ts`:

```ts
import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/persistence/migrate.js'
import { AdapterRepository } from '../../../src/persistence/adapter-repo.js'
import { AdapterHost } from '../../../src/adapters/host.js'
import { createAdapterHandlers } from '../../../src/ipc/handlers/adapter.js'

function freshHost() {
  const db = new Database(':memory:')
  runMigrations(db)
  const repo = new AdapterRepository(db, () => 100)
  return {
    repo,
    host: new AdapterHost({ repo, adaptersRoot: '/tmp/nope', now: () => 100 }),
  }
}

describe('adapter.list handler', () => {
  let h: ReturnType<typeof createAdapterHandlers>
  let host: AdapterHost

  beforeEach(() => {
    const built = freshHost()
    host = built.host
    h = createAdapterHandlers({ host, repo: built.repo })
  })

  it('returns an empty list when no adapters are installed', async () => {
    const result = await h['adapter.list']({})
    expect(result.adapters).toEqual([])
  })

  it('returns one row per installed adapter', async () => {
    host['repo'].insert({
      adapterId: 'one',
      version: '1.2.3',
      sourceSpecifier: 'file:///x',
      config: {},
      lastHealth: null,
      installedAt: 1,
      updatedAt: 1,
    })
    const result = await h['adapter.list']({})
    expect(result.adapters).toEqual([{ adapterId: 'one', version: '1.2.3', installed: true }])
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
pnpm --filter @dycode/dycoded test -- 'handlers/adapter'
```

Expected: FAIL.

- [ ] **Step 3: Implement the partial handler module**

Replace `daemons/dycoded/src/ipc/handlers/adapter.ts`:

```ts
import {
  adapter_list_paramsSchema,
  adapter_list_resultSchema,
} from '@dycode/contracts'
import type { z } from 'zod'
import type { AdapterHost } from '../../adapters/host.js'
import type { AdapterRepository } from '../../persistence/adapter-repo.js'

export interface AdapterHandlerDeps {
  readonly host: AdapterHost
  readonly repo: AdapterRepository
}

type ListResult = z.infer<typeof adapter_list_resultSchema>

export function createAdapterHandlers(deps: AdapterHandlerDeps) {
  const { repo } = deps

  return {
    async 'adapter.list'(rawParams: unknown): Promise<ListResult> {
      adapter_list_paramsSchema.parse(rawParams)
      const rows = repo.list()
      const adapters = rows.map((r) => ({
        adapterId: r.adapterId,
        version: r.version,
        installed: true as const,
      }))
      return adapter_list_resultSchema.parse({ adapters })
    },
  }
}
```

- [ ] **Step 4: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- 'handlers/adapter'
```

Expected: PASS — 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add daemons/dycoded/src/ipc/handlers/adapter.ts daemons/dycoded/tests/ipc/handlers/adapter.test.ts
git commit -m "feat(dycoded): add adapter.list IPC handler"
```

---

### Task 18 · `adapter.install` handler

**Files:**
- Modify: `daemons/dycoded/src/ipc/handlers/adapter.ts`
- Modify: `daemons/dycoded/tests/ipc/handlers/adapter.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `daemons/dycoded/tests/ipc/handlers/adapter.test.ts`:

```ts
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const minimalSpecifier = pathToFileURL(
  path.join(new URL('.', import.meta.url).pathname, '../../fixtures/minimal-adapter/index.ts'),
).href

describe('adapter.install handler', () => {
  it('installs an adapter that has been discovered on disk', async () => {
    const built = freshHost()
    // Pre-seed discovery by writing a fixture into adaptersRoot; the handler
    // is allowed to install only specifiers that match a discovered package
    // (security model: handlers may not load arbitrary file:// URLs).
    built.host.allowSpecifier(minimalSpecifier, { packageName: 'minimal', version: '1.0.0' })
    const h = createAdapterHandlers({ host: built.host, repo: built.repo })
    const result = await h['adapter.install']({ adapterId: 'minimal' })
    expect(result).toEqual({ adapterId: 'minimal', version: '1.0.0' })
    expect(built.host.registry.has('minimal')).toBe(true)
  })

  it('rejects install of an unknown adapter id', async () => {
    const built = freshHost()
    const h = createAdapterHandlers({ host: built.host, repo: built.repo })
    await expect(h['adapter.install']({ adapterId: 'ghost' })).rejects.toThrow(/ghost/i)
  })
})
```

- [ ] **Step 2: Extend `AdapterHost` with the allowlist API**

In `daemons/dycoded/src/adapters/host.ts` add:

```ts
private readonly allowed = new Map<string, { specifier: string; packageName: string; version: string }>()

/**
 * Register an `adapterId → specifier` mapping the host is permitted to
 * install. Populated by the discovery walker (Task 21 wires this in
 * automatically); exposed here so handlers can install by id, not by URL.
 */
allowAdapter(adapterId: string, args: { specifier: string; packageName: string; version: string }): void {
  this.allowed.set(adapterId, args)
}

resolveAllowedSpecifier(adapterId: string): InstallArgs | undefined {
  const m = this.allowed.get(adapterId)
  return m ? { specifier: m.specifier, packageName: m.packageName, version: m.version } : undefined
}
```

Plus a helper test-only `allowSpecifier` that registers under the manifest id once the plugin has been loaded:

```ts
async allowSpecifier(specifier: string, meta: { packageName: string; version: string }): Promise<void> {
  const plugin = await loadPluginFromSpecifier(specifier)
  this.allowed.set(plugin.manifest.id, { specifier, packageName: meta.packageName, version: meta.version })
}
```

- [ ] **Step 3: Extend the handler**

Append to `createAdapterHandlers()`'s returned object in `daemons/dycoded/src/ipc/handlers/adapter.ts`:

```ts
async 'adapter.install'(rawParams: unknown) {
  const params = adapter_install_paramsSchema.parse(rawParams)
  const allowed = deps.host.resolveAllowedSpecifier(params.adapterId)
  if (!allowed) {
    throw new Error(`adapter.install: unknown adapterId "${params.adapterId}" (not discovered on disk)`)
  }
  const plugin = await deps.host.install(allowed)
  return adapter_install_resultSchema.parse({
    adapterId: plugin.manifest.id,
    version: allowed.version,
  })
},
```

Add the imports:

```ts
import { adapter_install_paramsSchema, adapter_install_resultSchema } from '@dycode/contracts'
```

- [ ] **Step 4: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- 'handlers/adapter'
```

Expected: PASS — install tests green, list tests still green.

- [ ] **Step 5: Commit**

```bash
git add daemons/dycoded/src/ipc/handlers/adapter.ts daemons/dycoded/src/adapters/host.ts daemons/dycoded/tests/ipc/handlers/adapter.test.ts
git commit -m "feat(dycoded): add adapter.install handler with discovered-only allowlist"
```

---

### Task 19 · `adapter.uninstall` handler

**Files:**
- Modify: `daemons/dycoded/src/ipc/handlers/adapter.ts`
- Modify: `daemons/dycoded/tests/ipc/handlers/adapter.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `daemons/dycoded/tests/ipc/handlers/adapter.test.ts`:

```ts
describe('adapter.uninstall handler', () => {
  it('removes an installed adapter and returns ok', async () => {
    const built = freshHost()
    await built.host.allowSpecifier(minimalSpecifier, {
      packageName: 'minimal',
      version: '1.0.0',
    })
    const h = createAdapterHandlers({ host: built.host, repo: built.repo })
    await h['adapter.install']({ adapterId: 'minimal' })
    const result = await h['adapter.uninstall']({ adapterId: 'minimal' })
    expect(result).toEqual({ ok: true })
    expect(built.host.registry.has('minimal')).toBe(false)
    expect(built.repo.get('minimal')).toBeUndefined()
  })

  it('rejects uninstall of an unknown adapter id', async () => {
    const built = freshHost()
    const h = createAdapterHandlers({ host: built.host, repo: built.repo })
    await expect(h['adapter.uninstall']({ adapterId: 'ghost' })).rejects.toThrow(/ghost/i)
  })
})
```

- [ ] **Step 2: Implement**

Append to `createAdapterHandlers()`'s returned object:

```ts
async 'adapter.uninstall'(rawParams: unknown) {
  const params = adapter_uninstall_paramsSchema.parse(rawParams)
  if (!deps.repo.get(params.adapterId)) {
    throw new Error(`adapter.uninstall: unknown adapterId "${params.adapterId}"`)
  }
  await deps.host.uninstall(params.adapterId)
  return adapter_uninstall_resultSchema.parse({ ok: true })
},
```

Add the imports:

```ts
import { adapter_uninstall_paramsSchema, adapter_uninstall_resultSchema } from '@dycode/contracts'
```

- [ ] **Step 3: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- 'handlers/adapter'
```

Expected: PASS — uninstall tests green; install + list still green.

- [ ] **Step 4: Commit**

```bash
git add daemons/dycoded/src/ipc/handlers/adapter.ts daemons/dycoded/tests/ipc/handlers/adapter.test.ts
git commit -m "feat(dycoded): add adapter.uninstall handler"
```

---

### Task 20 · `adapter.configure` handler — validates against per-plugin `configSchema`

**Files:**
- Modify: `daemons/dycoded/src/ipc/handlers/adapter.ts`
- Modify: `daemons/dycoded/tests/ipc/handlers/adapter.test.ts`
- Create: `daemons/dycoded/tests/fixtures/configurable-adapter/package.json`
- Create: `daemons/dycoded/tests/fixtures/configurable-adapter/index.ts`

- [ ] **Step 1: Add a fixture with a configSchema**

`daemons/dycoded/tests/fixtures/configurable-adapter/package.json`:

```json
{
  "name": "fixture-configurable-adapter",
  "version": "1.0.0",
  "type": "module",
  "main": "index.ts",
  "dycodeAdapter": true
}
```

`daemons/dycoded/tests/fixtures/configurable-adapter/index.ts`:

```ts
import { z } from 'zod'
import { createAdapter } from '@dycode/adapter-sdk'

const ConfigSchema = z.object({ apiKey: z.string().min(1) }).strict()

export default createAdapter({
  manifest: {
    id: 'configurable',
    displayName: 'Configurable',
    vendor: 'tests',
    apiVersion: 1,
    capabilities: ['code.read'],
    flavor: 'structured',
    concurrencyCap: 1,
  },
  configSchema: ConfigSchema,
  detect: async () => ({ installed: true, version: '1.0.0' }),
  create: () => ({
    async *start() {
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

- [ ] **Step 2: Write the failing test**

Append to `daemons/dycoded/tests/ipc/handlers/adapter.test.ts`:

```ts
const configurableSpecifier = pathToFileURL(
  path.join(new URL('.', import.meta.url).pathname, '../../fixtures/configurable-adapter/index.ts'),
).href

describe('adapter.configure handler', () => {
  it('persists a valid config blob', async () => {
    const built = freshHost()
    await built.host.allowSpecifier(configurableSpecifier, {
      packageName: 'configurable',
      version: '1.0.0',
    })
    const h = createAdapterHandlers({ host: built.host, repo: built.repo })
    await h['adapter.install']({ adapterId: 'configurable' })
    const result = await h['adapter.configure']({
      adapterId: 'configurable',
      config: { apiKey: 'sk-test' },
    })
    expect(result).toEqual({ ok: true })
    expect(built.repo.get('configurable')?.config).toEqual({ apiKey: 'sk-test' })
  })

  it('rejects a config blob that fails the plugin schema', async () => {
    const built = freshHost()
    await built.host.allowSpecifier(configurableSpecifier, {
      packageName: 'configurable',
      version: '1.0.0',
    })
    const h = createAdapterHandlers({ host: built.host, repo: built.repo })
    await h['adapter.install']({ adapterId: 'configurable' })
    await expect(
      h['adapter.configure']({
        adapterId: 'configurable',
        config: { apiKey: '' }, // fails .min(1)
      }),
    ).rejects.toThrow(/apiKey/)
    // Persisted config remains the empty default.
    expect(built.repo.get('configurable')?.config).toEqual({})
  })

  it('accepts any config when the plugin declares no configSchema', async () => {
    const built = freshHost()
    await built.host.allowSpecifier(minimalSpecifier, {
      packageName: 'minimal',
      version: '1.0.0',
    })
    const h = createAdapterHandlers({ host: built.host, repo: built.repo })
    await h['adapter.install']({ adapterId: 'minimal' })
    const result = await h['adapter.configure']({
      adapterId: 'minimal',
      config: { whatever: 1 },
    })
    expect(result).toEqual({ ok: true })
    expect(built.repo.get('minimal')?.config).toEqual({ whatever: 1 })
  })

  it('rejects configure for an unknown adapter id', async () => {
    const built = freshHost()
    const h = createAdapterHandlers({ host: built.host, repo: built.repo })
    await expect(
      h['adapter.configure']({ adapterId: 'ghost', config: {} }),
    ).rejects.toThrow(/ghost/i)
  })
})
```

- [ ] **Step 3: Implement**

Append to `createAdapterHandlers()`:

```ts
async 'adapter.configure'(rawParams: unknown) {
  const params = adapter_configure_paramsSchema.parse(rawParams)
  const plugin = deps.host.registry.get(params.adapterId)
  if (!plugin) {
    throw new Error(`adapter.configure: unknown adapterId "${params.adapterId}"`)
  }
  if (plugin.configSchema) {
    plugin.configSchema.parse(params.config)
  }
  deps.repo.updateConfig(params.adapterId, params.config)
  return adapter_configure_resultSchema.parse({ ok: true })
},
```

Add the imports:

```ts
import {
  adapter_configure_paramsSchema,
  adapter_configure_resultSchema,
} from '@dycode/contracts'
```

- [ ] **Step 4: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- 'handlers/adapter'
```

Expected: PASS — all four configure tests + install/uninstall/list still green.

- [ ] **Step 5: Commit**

```bash
git add daemons/dycoded/src/ipc/handlers/adapter.ts daemons/dycoded/tests/ipc/handlers/adapter.test.ts daemons/dycoded/tests/fixtures/configurable-adapter
git commit -m "feat(dycoded): add adapter.configure handler honouring per-plugin configSchema"
```

---

### Task 21 · `runtime.scan` handler — invokes `detect()` per plugin, emits `runtime.detected`

**Files:**
- Modify: `daemons/dycoded/src/ipc/handlers/runtime.ts`
- Create: `daemons/dycoded/tests/ipc/handlers/runtime.test.ts`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/ipc/handlers/runtime.test.ts`:

```ts
import Database from 'better-sqlite3'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { runMigrations } from '../../../src/persistence/migrate.js'
import { AdapterRepository } from '../../../src/persistence/adapter-repo.js'
import { AdapterHost } from '../../../src/adapters/host.js'
import { createRuntimeHandlers } from '../../../src/ipc/handlers/runtime.js'

const minimalSpecifier = pathToFileURL(
  path.join(new URL('.', import.meta.url).pathname, '../../fixtures/minimal-adapter/index.ts'),
).href

function freshHost() {
  const db = new Database(':memory:')
  runMigrations(db)
  const repo = new AdapterRepository(db, () => 1)
  const host = new AdapterHost({ repo, adaptersRoot: '/tmp/nope', now: () => 1 })
  return { host, repo }
}

describe('runtime.scan handler', () => {
  it('returns detection rows for each registered adapter', async () => {
    const built = freshHost()
    await built.host.allowSpecifier(minimalSpecifier, {
      packageName: 'minimal',
      version: '1.0.0',
    })
    const plugin = await built.host.install({
      specifier: minimalSpecifier,
      packageName: 'minimal',
      version: '1.0.0',
    })
    expect(plugin.manifest.id).toBe('minimal')

    const emitted: Array<string[]> = []
    const h = createRuntimeHandlers({
      host: built.host,
      emit: (m, p) => {
        if (m === 'runtime.detected') emitted.push((p as { newAdapters: string[] }).newAdapters)
      },
    })
    const result = await h['runtime.scan']({})
    expect(result.detected).toEqual([
      { adapterId: 'minimal', version: '1.0.0', path: expect.any(String) },
    ])
    expect(emitted).toEqual([['minimal']])
  })

  it('does not emit `runtime.detected` on a second scan with no new adapters', async () => {
    const built = freshHost()
    await built.host.allowSpecifier(minimalSpecifier, {
      packageName: 'minimal',
      version: '1.0.0',
    })
    await built.host.install({
      specifier: minimalSpecifier,
      packageName: 'minimal',
      version: '1.0.0',
    })
    const emit = vi.fn()
    const h = createRuntimeHandlers({ host: built.host, emit })
    await h['runtime.scan']({})
    emit.mockClear()
    await h['runtime.scan']({})
    expect(emit).not.toHaveBeenCalled()
  })

  it('omits adapters that report installed=false', async () => {
    const built = freshHost()
    const offlinePlugin = {
      manifest: {
        id: 'offline',
        displayName: 'Offline',
        vendor: 't',
        apiVersion: 1 as const,
        capabilities: [],
        flavor: 'structured' as const,
        concurrencyCap: 1,
      },
      detect: async () => ({ installed: false, reason: 'not on PATH' }),
      create: () => ({
        async *start() {},
        async cancel() {},
        async health() {
          return { healthy: true, ts: 0 }
        },
        async dispose() {},
      }),
    }
    built.host.registry.register(offlinePlugin)
    const h = createRuntimeHandlers({ host: built.host, emit: () => {} })
    const result = await h['runtime.scan']({})
    expect(result.detected).toEqual([])
  })
})
```

- [ ] **Step 2: Implement**

Replace `daemons/dycoded/src/ipc/handlers/runtime.ts`:

```ts
import {
  runtime_scan_paramsSchema,
  runtime_scan_resultSchema,
} from '@dycode/contracts'
import type { AdapterHost } from '../../adapters/host.js'

export interface RuntimeHandlerDeps {
  readonly host: AdapterHost
  /** Server-push notifier — receives `{ method, params }` for fan-out. */
  emit(method: string, params: unknown): void
}

export function createRuntimeHandlers(deps: RuntimeHandlerDeps) {
  // adapterIds we've already announced as detected, so we don't spam
  // `runtime.detected` on every scan.
  const seen = new Set<string>()

  return {
    async 'runtime.scan'(rawParams: unknown) {
      runtime_scan_paramsSchema.parse(rawParams)
      const detected: Array<{ adapterId: string; version: string; path: string }> = []
      const newlyDetected: string[] = []
      for (const plugin of deps.host.registry.list()) {
        const result = await plugin.detect()
        if (!result.installed || !result.version || !result.path) continue
        detected.push({
          adapterId: plugin.manifest.id,
          version: result.version,
          path: result.path,
        })
        if (!seen.has(plugin.manifest.id)) {
          seen.add(plugin.manifest.id)
          newlyDetected.push(plugin.manifest.id)
        }
      }
      if (newlyDetected.length > 0) {
        deps.emit('runtime.detected', { newAdapters: newlyDetected })
      }
      return runtime_scan_resultSchema.parse({ detected })
    },
  }
}
```

Also update the minimal fixture's `detect()` to return a real path so the test's `expect.any(String)` matches:

```ts
detect: async () => ({ installed: true, version: '1.0.0', path: '/usr/local/bin/minimal' }),
```

- [ ] **Step 3: Run to verify green**

```bash
pnpm --filter @dycode/dycoded test -- 'handlers/runtime'
```

Expected: PASS — 3 tests green.

- [ ] **Step 4: Commit**

```bash
git add daemons/dycoded/src/ipc/handlers/runtime.ts daemons/dycoded/tests/ipc/handlers/runtime.test.ts daemons/dycoded/tests/fixtures/minimal-adapter/index.ts
git commit -m "feat(dycoded): add runtime.scan handler emitting runtime.detected on new adapters"
```

---

### Task 22 · Canonical fixture adapter (for the E2E test)

**Files:**
- Create: `daemons/dycoded/tests/fixtures/fixture-adapter/package.json`
- Create: `daemons/dycoded/tests/fixtures/fixture-adapter/index.ts`

(Distinct from the smaller `minimal-adapter` and `configurable-adapter` fixtures from earlier tasks — this one emits the full event-stream variety needed for the E2E lifecycle assertion.)

- [ ] **Step 1: Create the package**

`daemons/dycoded/tests/fixtures/fixture-adapter/package.json`:

```json
{
  "name": "fixture-adapter",
  "version": "0.1.0",
  "type": "module",
  "main": "index.ts",
  "dycodeAdapter": true
}
```

- [ ] **Step 2: Implement the plugin**

`daemons/dycoded/tests/fixtures/fixture-adapter/index.ts`:

```ts
import { z } from 'zod'
import { createAdapter } from '@dycode/adapter-sdk'

const ConfigSchema = z
  .object({ greeting: z.string().min(1).default('hello') })
  .strict()

export default createAdapter({
  manifest: {
    id: 'fixture',
    displayName: 'Fixture',
    vendor: 'dycode-tests',
    apiVersion: 1,
    capabilities: ['code.read', 'shell.exec'],
    flavor: 'structured',
    concurrencyCap: 2,
  },
  configSchema: ConfigSchema,
  detect: async () => ({
    installed: true,
    version: '0.1.0',
    path: '<bundled>',
  }),
  create: (opts) => {
    const cfg = ConfigSchema.parse(opts.config)
    return {
      async *start(prompt) {
        yield { type: 'output', chunk: `${cfg.greeting}, ${prompt.text}` }
        yield { type: 'tool_call', name: 'fs.read', input: { path: '/x' } }
        yield { type: 'tool_result', name: 'fs.read', out: { bytes: 4 } }
        yield { type: 'progress', ratio: 0.5, note: 'halfway' }
        yield { type: 'verify_request', cmd: 'pnpm test' }
        yield { type: 'done', status: 'ok', summary: 'fixture finished' }
      },
      async cancel() {},
      async health() {
        return { healthy: true, ts: Date.now() }
      },
      async dispose() {},
    }
  },
})
```

- [ ] **Step 3: Smoke-test the fixture loads cleanly**

```bash
pnpm --filter @dycode/dycoded test -- loader
```

Expected: PASS — loader already covers `minimal-adapter`; nothing should regress.

- [ ] **Step 4: Commit**

```bash
git add daemons/dycoded/tests/fixtures/fixture-adapter
git commit -m "test(dycoded): add canonical fixture adapter for E2E lifecycle"
```

---

### Task 23 · End-to-end test — install → list → scan → instantiate → events → dispose

**Files:**
- Create: `daemons/dycoded/tests/e2e/adapter-lifecycle.test.ts`

- [ ] **Step 1: Write the failing test**

`daemons/dycoded/tests/e2e/adapter-lifecycle.test.ts`:

```ts
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DycodeClient } from '@dycode/ipc-client'
import { startDaemonInChild, type StartedDaemon } from '../helpers/daemon-child.js'
import { stageFixtureAdapter } from '../helpers/stage-fixture.js'

describe('E2E · adapter lifecycle', () => {
  let daemon: StartedDaemon
  let client: DycodeClient
  let dataDir: string

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dycode-e2e-'))
    await stageFixtureAdapter(dataDir, 'fixture')
    daemon = await startDaemonInChild({ dataDir })
    client = await DycodeClient.connect({
      url: daemon.url,
      token: daemon.token,
    })
  }, 30_000)

  afterAll(async () => {
    await client.close()
    await daemon.stop()
    await fs.rm(dataDir, { recursive: true, force: true })
  })

  it('lists no adapters before install', async () => {
    const r = await client.request('adapter.list', {})
    expect(r.adapters).toEqual([])
  })

  it('runtime.scan discovers the fixture from disk and emits runtime.detected', async () => {
    const detectedEvents: unknown[] = []
    const sub = await client.subscribe('runtime.detected', (p) => detectedEvents.push(p))

    // Trigger discovery + install — the runtime.scan handler in Task 21 announces
    // newly registered ids. The daemon's bootstrap step (Task 24 / boot.ts wiring)
    // pre-registers disk-discovered fixtures via host.allowAdapter() so the
    // install handler can resolve the id.
    await client.request('adapter.install', { adapterId: 'fixture' })
    const scan = await client.request('runtime.scan', {})

    expect(scan.detected).toEqual([
      expect.objectContaining({ adapterId: 'fixture', version: '0.1.0' }),
    ])
    expect(detectedEvents).toEqual([{ newAdapters: ['fixture'] }])
    await sub.unsubscribe()
  })

  it('adapter.configure validates the fixture configSchema', async () => {
    await expect(
      client.request('adapter.configure', { adapterId: 'fixture', config: { greeting: '' } }),
    ).rejects.toThrow(/greeting/)
    const ok = await client.request('adapter.configure', {
      adapterId: 'fixture',
      config: { greeting: 'howdy' },
    })
    expect(ok).toEqual({ ok: true })
  })

  it('drives the fixture through start() and observes every adapter-event kind on the bus', async () => {
    const events: Array<{ type: string }> = []
    const sub = await client.subscribe('event.appended', (p) =>
      events.push(p as { type: string }),
    )
    // Internal API exposed for plan 04: the daemon exposes a privileged
    // method `_test.driveAdapter` ONLY when DYCODE_TEST_HOOKS=1 is set on
    // boot (see Task 24 wiring). It calls InstanceController + ipc-bridge.
    await client.request('_test.driveAdapter' as never, {
      adapterId: 'fixture',
      prompt: { text: 'world' },
      workspaceId: daemon.testWorkspaceId,
      agentId: daemon.testAgentId,
      taskId: daemon.testTaskId,
    } as never)
    await waitFor(() => events.some((e) => e.type === 'done'))
    expect(events.map((e) => e.type)).toEqual([
      'output',
      'tool_call',
      'tool_result',
      'progress',
      'verify_request',
      'done',
    ])
    await sub.unsubscribe()
  })

  it('adapter.uninstall removes the fixture', async () => {
    const ok = await client.request('adapter.uninstall', { adapterId: 'fixture' })
    expect(ok).toEqual({ ok: true })
    const after = await client.request('adapter.list', {})
    expect(after.adapters).toEqual([])
  })
})

async function waitFor(p: () => boolean, timeoutMs = 2000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (p()) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`)
}
```

- [ ] **Step 2: Add the test helpers**

`daemons/dycoded/tests/helpers/stage-fixture.ts`:

```ts
import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Copy a tests/fixtures/<name>/ adapter into <dataDir>/adapters/node_modules/<name>/
 * so the daemon's discovery walker finds it under its DYCODE_DATA_DIR.
 */
export async function stageFixtureAdapter(dataDir: string, name: string): Promise<void> {
  const src = path.resolve(new URL('.', import.meta.url).pathname, '../fixtures', `${name}-adapter`)
  const dst = path.join(dataDir, 'adapters', 'node_modules', name)
  await fs.mkdir(dst, { recursive: true })
  for (const file of await fs.readdir(src)) {
    await fs.copyFile(path.join(src, file), path.join(dst, file))
  }
}
```

`daemons/dycoded/tests/helpers/daemon-child.ts`:

```ts
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export interface StartedDaemon {
  readonly url: string
  readonly token: string
  readonly proc: ChildProcess
  readonly testWorkspaceId: string
  readonly testAgentId: string
  readonly testTaskId: string
  stop(): Promise<void>
}

export async function startDaemonInChild({
  dataDir,
}: {
  dataDir: string
}): Promise<StartedDaemon> {
  const bin = fileURLToPath(new URL('../../bin/dycoded.mjs', import.meta.url))
  const proc = spawn(process.execPath, [bin, 'start'], {
    env: { ...process.env, DYCODE_DATA_DIR: dataDir, DYCODE_TEST_HOOKS: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  // Wait for the runtime.json file to appear (written by Plan 03 boot).
  const registryPath = path.join(dataDir, 'runtime.json')
  const url = await waitForRegistry(registryPath)
  const tokenPath = path.join(dataDir, 'auth.json')
  const token = JSON.parse(await fs.readFile(tokenPath, 'utf8')).token as string

  return {
    url,
    token,
    proc,
    testWorkspaceId: 'ws_01HXAAAAAAAAAAAAAAAAAAAAAA',
    testAgentId: 'ag_01HXAAAAAAAAAAAAAAAAAAAAAA',
    testTaskId: 'tk_01HXAAAAAAAAAAAAAAAAAAAAAA',
    async stop() {
      proc.kill('SIGTERM')
      await new Promise<void>((resolve) => proc.once('exit', () => resolve()))
    },
  }
}

async function waitForRegistry(p: string): Promise<string> {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    try {
      const j = JSON.parse(await fs.readFile(p, 'utf8'))
      if (typeof j.wsUrl === 'string') return j.wsUrl
    } catch {
      // not yet
    }
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error(`daemon did not write ${p} within 10s`)
}
```

- [ ] **Step 3: Run to verify red**

```bash
pnpm --filter @dycode/dycoded test -- adapter-lifecycle
```

Expected: FAIL — `_test.driveAdapter` not yet registered (handled by Task 24's wiring).

- [ ] **Step 4: Commit (red)**

```bash
git add daemons/dycoded/tests/e2e/adapter-lifecycle.test.ts daemons/dycoded/tests/helpers
git commit -m "test(dycoded): add E2E adapter-lifecycle spec (red — wiring lands in next task)"
```

Note: a red commit is acceptable here because the next task (24) wires the missing pieces and re-runs the test green before its own commit. Both commits land in the same PR.

---

### Task 24 · Boot wiring + `dycoded adapter list` CLI + `_test.driveAdapter` hook

**Files:**
- Modify: `daemons/dycoded/src/boot.ts`
- Modify: `daemons/dycoded/src/cli.ts`
- Create: `daemons/dycoded/tests/cli/adapter-list.test.ts`

- [ ] **Step 1: Wire `AdapterHost` into `boot.ts`**

Open `daemons/dycoded/src/boot.ts` and add the composition. The Plan 03 boot module already takes `{ db, server, dispatcher, eventBus, eventLogRepo }`. Extend it:

```ts
import path from 'node:path'
import { AdapterHost } from './adapters/host.js'
import { AdapterRepository } from './persistence/adapter-repo.js'
import { discoverAdaptersOnDisk } from './adapters/discovery.js'
import { createAdapterHandlers } from './ipc/handlers/adapter.js'
import { createRuntimeHandlers } from './ipc/handlers/runtime.js'
import { HealthProbeScheduler } from './adapters/health-probe.js'
import { InstanceController } from './adapters/lifecycle.js'
import { bridgeAdapterEvents } from './adapters/ipc-bridge.js'
import { ulid } from 'ulid'
// …existing imports
```

Inside `boot()`, after the dispatcher is created:

```ts
const adapterRepo = new AdapterRepository(db)
const adapterHost = new AdapterHost({ repo: adapterRepo, adaptersRoot: path.join(dataDir, 'adapters') })

// 1. Walk discovery, register every disk adapter as install-allowed.
for (const discovered of await discoverAdaptersOnDisk(path.join(dataDir, 'adapters'))) {
  // Probe the manifest cheaply by loading the module; if it fails, skip
  // and let the operator see the error on a manual `adapter.install` call.
  try {
    const plugin = await (await import('./adapters/loader.js')).loadPluginFromSpecifier(discovered.specifier)
    adapterHost.allowAdapter(plugin.manifest.id, {
      specifier: discovered.specifier,
      packageName: discovered.packageName,
      version: discovered.version,
    })
  } catch (err) {
    logger.warn({ err, specifier: discovered.specifier }, 'adapter discovery: failed to load module')
  }
}

// 2. Rehydrate registry from persisted rows.
await adapterHost.bootstrap()

// 3. Register handlers with the dispatcher.
const adapterHandlers = createAdapterHandlers({ host: adapterHost, repo: adapterRepo })
const runtimeHandlers = createRuntimeHandlers({
  host: adapterHost,
  emit: (m, p) => eventBus.publishNotification(m, p),
})
for (const [name, fn] of Object.entries({ ...adapterHandlers, ...runtimeHandlers })) {
  dispatcher.register(name, fn)
}

// 4. Health probe scheduler (every 30s in production; configurable for tests).
const healthProbe = new HealthProbeScheduler({
  intervalMs: Number(process.env.DYCODE_HEALTH_INTERVAL_MS ?? 30_000),
  probe: async (id) => {
    const plugin = adapterHost.registry.get(id)
    if (!plugin) throw new Error(`no such adapter ${id}`)
    return plugin.create({ workspaceRoot: dataDir, env: {}, config: {} }).health()
  },
  onStatusChange: (id, report) => {
    eventBus.publishNotification('agent.statusChanged', { agentId: id, status: report.healthy ? 'ready' : 'unhealthy' })
  },
})
healthProbe.start()

// 5. Test-only privileged hook for the E2E lifecycle spec.
if (process.env.DYCODE_TEST_HOOKS === '1') {
  dispatcher.register('_test.driveAdapter', async (rawParams: unknown) => {
    const params = rawParams as {
      adapterId: string
      prompt: { text: string; metadata?: Record<string, unknown> }
      workspaceId: string
      agentId: string
      taskId: string
    }
    const plugin = adapterHost.registry.get(params.adapterId)
    if (!plugin) throw new Error(`_test.driveAdapter: no such adapter ${params.adapterId}`)
    const controller = new InstanceController(plugin, {
      workspaceRoot: dataDir,
      env: {},
      config: adapterRepo.get(params.adapterId)?.config ?? {},
    })
    controller.create()
    await bridgeAdapterEvents(
      controller.start(params.prompt, {
        workspaceId: params.workspaceId as never,
        agentId: params.agentId as never,
        taskId: params.taskId as never,
        workspaceRoot: dataDir,
        env: {},
        signal: new AbortController().signal,
      }),
      { workspaceId: params.workspaceId as never, agentId: params.agentId as never, taskId: params.taskId as never },
      { repo: eventLogRepo, bus: eventBus, ids: () => ulid(), now: () => Date.now() },
    )
    await controller.dispose()
    return { ok: true }
  })
}

// Lifecycle: stop health probe on shutdown.
lifecycle.onShutdown(() => healthProbe.stop())
```

(All identifiers above — `dispatcher`, `eventBus`, `eventLogRepo`, `lifecycle`, `dataDir`, `logger` — are introduced in Plan 03; use whatever names Plan 03 settled on.)

- [ ] **Step 2: Add the `adapter list` CLI subcommand**

In `daemons/dycoded/src/cli.ts` extend the subcommand dispatch:

```ts
case 'adapter': {
  const sub = argv[1]
  if (sub === 'list') {
    return adapterListCommand({ dataDir: resolveDataDir() })
  }
  printUsageAndExit(2, `unknown adapter subcommand: ${sub}`)
  return
}
```

Add the implementation:

```ts
async function adapterListCommand({ dataDir }: { dataDir: string }) {
  const db = openDb(path.join(dataDir, 'dycode.db'))
  runMigrations(db)
  const repo = new AdapterRepository(db)
  const rows = repo.list()
  if (rows.length === 0) {
    process.stdout.write('no adapters installed\n')
    return
  }
  for (const r of rows) {
    process.stdout.write(`${r.adapterId.padEnd(24)} ${r.version}\n`)
  }
}
```

(Import `openDb`, `runMigrations`, `AdapterRepository` from their respective Plan 03 / Plan 04 modules.)

- [ ] **Step 3: Write the CLI test**

`daemons/dycoded/tests/cli/adapter-list.test.ts`:

```ts
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const bin = path.join(new URL('../../bin/dycoded.mjs', import.meta.url).pathname)

describe('dycoded adapter list', () => {
  let dataDir: string
  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dycode-cli-'))
  })
  afterEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true })
  })

  it('prints "no adapters installed" on a fresh data dir', () => {
    const result = spawnSync(process.execPath, [bin, 'adapter', 'list'], {
      env: { ...process.env, DYCODE_DATA_DIR: dataDir },
      encoding: 'utf8',
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('no adapters installed')
  })
})
```

- [ ] **Step 4: Run to verify green (CLI + E2E)**

```bash
pnpm --filter @dycode/dycoded test -- adapter-list
pnpm --filter @dycode/dycoded test -- adapter-lifecycle
```

Expected: both green.

- [ ] **Step 5: Verify the whole package**

```bash
pnpm --filter @dycode/dycoded test
bash scripts/verify.sh
```

Expected: all dycoded tests pass; gates 1–4 green.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/boot.ts daemons/dycoded/src/cli.ts daemons/dycoded/tests/cli/adapter-list.test.ts
git commit -m "feat(dycoded): wire AdapterHost into boot + add 'adapter list' CLI subcommand"
```

---

### Task 25 · Docs — `adapter-host.md`, package maps, root CLAUDE.md

**Files:**
- Create: `docs/architecture/adapter-host.md`
- Modify: `CLAUDE.md`
- Modify: `daemons/dycoded/CLAUDE.md`
- Modify: `packages/adapter-sdk/CLAUDE.md`

- [ ] **Step 1: Write `docs/architecture/adapter-host.md`**

Content (≤200 lines — link out to the spec rather than duplicating):

```markdown
# Adapter host — deep doc

> The component inside `dycoded` that loads adapter plugins, gates their
> capabilities, drives their lifecycle, and translates their events onto the
> daemon's event bus.

## Where it lives

- `daemons/dycoded/src/adapters/` — every module in this subtree
- `daemons/dycoded/src/persistence/adapter-repo.ts` + `migrations/003-adapters.ts`
- `daemons/dycoded/src/ipc/handlers/adapter.ts` + `runtime.ts`

## Module map

| Module                 | Responsibility                                                  |
| ---------------------- | ---------------------------------------------------------------- |
| `discovery.ts`         | Walk `~/.dycode/adapters/node_modules` for `dycodeAdapter:true`  |
| `loader.ts`            | Dynamic `import()` + manifest validation                          |
| `registry.ts`          | In-memory `Map<adapterId, AdapterPlugin>`                         |
| `host.ts`              | Compose loader + discovery + registry + repo; install/uninstall  |
| `capability-gate.ts`   | `assertCapability(host, adapterId, capability)` — the only gate  |
| `lifecycle.ts`         | `InstanceController` — per-instance `create/start/cancel/health/dispose` |
| `pty.ts`               | `openPtyChannel()` for `flavor: 'pty'` via `node-pty`             |
| `health-probe.ts`      | Periodic health probe + `agent.statusChanged` emission           |
| `ipc-bridge.ts`        | `AdapterEvent → EventLogEntry` translator + persistence + publish |

## Lifecycle

```
boot()
  ├─ discoverAdaptersOnDisk() → for each disk pkg: loader.validateManifest → host.allowAdapter(id)
  ├─ host.bootstrap()         → for each persisted row: loader.load + registry.replace
  ├─ dispatcher.register(adapter.*, runtime.scan)
  └─ healthProbe.start()

adapter.install(id)
  → host.resolveAllowedSpecifier(id)
  → host.install({...}) → loader.load → repo.insert → registry.replace

adapter.configure(id, config)
  → registry.get(id).configSchema?.parse(config) → repo.updateConfig

runtime.scan
  → for each registered plugin: plugin.detect()
  → emit runtime.detected if new ids appear

task runtime (Plan 05+)
  → new InstanceController(plugin, opts) → controller.create()
  → bridgeAdapterEvents(controller.start(prompt, ctx), ctx, { repo, bus, ids, now })
  → controller.dispose()
```

## Trust model (MVP)

Adapters load **in-process**. Mitigations:

1. **Capability gate** — every operation that requires a capability calls
   `assertCapability` first. Undeclared capabilities throw `CapabilityGateError`.
2. **Install allowlist** — the `adapter.install` handler can only resolve ids
   that on-disk discovery already found under `<dataDir>/adapters/node_modules`.
   Arbitrary `file://` URLs are not accepted from the network.
3. **Workspace scoping** — `CreateOpts.workspaceRoot` is the only filesystem
   path passed to adapters. Adapters are expected to scope their own writes,
   and the audit trail captures every event in the `event_log` table.

Future hardening (Plan 15): out-of-process worker isolation.

## Adding a new adapter

1. `pnpm add @dycode/adapter-<id>` into `<dataDir>/adapters/`.
2. Restart `dycoded` (it discovers on boot).
3. `dycoded adapter list` shows it.
4. Call `adapter.configure` if it declares a `configSchema`.
5. Plan 05+'s task runtime picks it up when a task requires its capabilities.

## Linked design

- `../superpowers/specs/2026-05-23-dycode-design.md` §5 — Adapter plugin SDK
- `../adapters/sdk.md` — Adapter SDK deep doc
- `../ipc-protocol/spec.md` — `adapter.*` + `runtime.scan` method shapes
```

- [ ] **Step 2: Update root `CLAUDE.md` — "Where to look"**

Append under "Where to look":

```
- **Adapter host (deeper)** → `docs/architecture/adapter-host.md`
```

- [ ] **Step 3: Update `daemons/dycoded/CLAUDE.md`**

Add an `## Adapter host` section pointing to `src/adapters/` and the deep doc. Keep the file ≤100 lines.

- [ ] **Step 4: Update `packages/adapter-sdk/CLAUDE.md`**

Add a one-liner under "Layout":

```
- `src/flavor.ts` — `AdapterFlavor` literal + schema (added in Plan 04)
```

Note the SDK bump under "Versioning" — 0.2.0 (additive: `flavor`/`concurrencyCap`/`configSchema`).

- [ ] **Step 5: Verify**

```bash
bash scripts/verify.sh
```

Expected: gates 1–4 green (only markdown changes — format gate runs on `*.md` if configured; otherwise no-op).

- [ ] **Step 6: Commit**

```bash
git add docs/architecture/adapter-host.md CLAUDE.md daemons/dycoded/CLAUDE.md packages/adapter-sdk/CLAUDE.md
git commit -m "docs(adapter-host): add deep doc; refresh package + root maps"
```

---

### Task 26 · Close-out — `feature_list.json` F15-F20, `PROGRESS.md`, tag

**Files:**
- Modify: `feature_list.json`
- Modify: `PROGRESS.md`
- Modify: `docs/superpowers/plans/README.md` (status row → `shipped`)

- [ ] **Step 1: Append F15-F20 to `feature_list.json`**

```json
{
  "id": "F15",
  "behavior": "@dycode/adapter-sdk publishes AdapterFlavor literal (pty|structured|mcp|verifier), required manifest.flavor field, optional manifest.concurrencyCap field, and an optional AdapterPlugin.configSchema slot.",
  "verification": "pnpm --filter @dycode/adapter-sdk test",
  "state": "passing",
  "evidence": "Plan 04 · Tasks 02-04",
  "blocked_by": null
},
{
  "id": "F16",
  "behavior": "Installed adapter rows persist to SQLite via migration 003 (`adapters` table) and survive daemon restarts: bootstrap() rehydrates them into the in-memory registry.",
  "verification": "pnpm --filter @dycode/dycoded test",
  "state": "passing",
  "evidence": "Plan 04 · Tasks 06, 07, 11",
  "blocked_by": null
},
{
  "id": "F17",
  "behavior": "AdapterHost discovers adapter packages under ~/.dycode/adapters/node_modules, dynamically imports them, validates their manifest against AdapterManifestSchema, and rejects malformed plugins with LoaderError.",
  "verification": "pnpm --filter @dycode/dycoded test",
  "state": "passing",
  "evidence": "Plan 04 · Tasks 08, 09, 11",
  "blocked_by": null
},
{
  "id": "F18",
  "behavior": "assertCapability(registry, adapterId, capability) refuses to perform any operation whose required capability is absent from the adapter's manifest, throwing CapabilityGateError.",
  "verification": "pnpm --filter @dycode/dycoded test -- capability-gate",
  "state": "passing",
  "evidence": "Plan 04 · Task 12",
  "blocked_by": null
},
{
  "id": "F19",
  "behavior": "adapter.list, adapter.install, adapter.uninstall, adapter.configure, runtime.scan IPC handlers are wired through the dispatcher; adapter.configure validates the supplied config against the plugin's configSchema; runtime.scan emits runtime.detected for newly seen adapters.",
  "verification": "pnpm --filter @dycode/dycoded test",
  "state": "passing",
  "evidence": "Plan 04 · Tasks 17-21, 24",
  "blocked_by": null
},
{
  "id": "F20",
  "behavior": "End-to-end fixture adapter exercises the full lifecycle: discover → install → configure → instantiate → drive start() → all 6 non-error AdapterEvent kinds stream to event.appended subscribers → dispose → uninstall.",
  "verification": "pnpm --filter @dycode/dycoded test -- adapter-lifecycle",
  "state": "passing",
  "evidence": "Plan 04 · Tasks 22, 23, 24",
  "blocked_by": null
}
```

- [ ] **Step 2: Append the Plan 04 entry to `PROGRESS.md`**

(Use the same format Plan 03 used — date, plan number, short summary, link to plan file, link to the close-out tag.)

- [ ] **Step 3: Flip the roadmap row**

In `docs/superpowers/plans/README.md`, change the Plan 04 row's status from `not started` to `shipped`.

- [ ] **Step 4: Final verify**

```bash
bash scripts/verify.sh
```

Expected: gates 1–4 green.

- [ ] **Step 5: Commit + tag**

```bash
git add feature_list.json PROGRESS.md docs/superpowers/plans/README.md
git commit -m "docs: close Plan 04 (adapter plugin host shipped); feature_list F15-F20"
git tag v0.0.4-plan-04
```

- [ ] **Step 6: Open the PR**

Per the project conventions in root `CLAUDE.md`:
- Squashed feature branch → `main`
- PR body links to the Plan 04 file + the design spec §5
- Reviewer verdict ≥ 10/10 gates the merge

---

## Self-review checklist

After every task lands, run this checklist against the spec before declaring Plan 04 complete:

1. **Spec coverage (§5):**
   - §5.1 contract → `loader.ts` validates manifest; `lifecycle.ts` drives the four-method contract.
   - §5.2 event stream → `ipc-bridge.ts` covers all 7 AdapterEvent variants.
   - §5.3 three flavors → `AdapterFlavorSchema` literal; `pty.ts` for the PTY case; structured/mcp/verifier handled identically at the host level (per-flavor wiring beyond PTY is the adapter's concern).
   - §5.4 verifier sub-type → the `verifier` flavor literal exists; the first verifier adapter is deferred to Plan 06 (called out under Out of scope).
   - §5.5 lifecycle → `boot.ts` wiring: discover → bootstrap → register handlers → start health probe.
   - §5.6 sandbox & permissions → `capability-gate.ts` + install allowlist + audit log via `ipc-bridge.ts`.
   - §5.7 packaging → discovery walker accepts both `<name>/` and `@scope/<name>/` layouts.
   - §5.8 launch adapters → none ship in Plan 04 (Plan 05/06 land them); the host is exercise-ready via the fixture.

2. **Placeholder scan:** every code step has a complete code block; every command step has explicit expected output. No "TBD", no "implement similar to above", no "handle edge cases".

3. **Type consistency:** `AdapterRecord`, `InstallArgs`, `BridgeCtx`, `BridgeDeps`, `RuntimeHandlerDeps`, `AdapterHandlerDeps`, `HealthProbeOpts` — every type used in a later task is defined exactly once in the task that introduces it. Method names match (`bootstrap`, `install`, `uninstall`, `allowAdapter`, `resolveAllowedSpecifier`, `registry.list`/`register`/`replace`/`get`/`has`/`remove`).

4. **Test rigour:** every code module has a happy-path test + at least one rejection / negative case. The E2E spec covers every method the plan exposes.

If any item above fails, fix it inline before tagging.

---

## Done definition

- `pnpm --filter @dycode/dycoded test` exits 0
- `pnpm --filter @dycode/adapter-sdk test` exits 0
- `pnpm --filter @dycode/ipc-client test` exits 0 (no regressions)
- `pnpm --filter @dycode/contracts test` exits 0 (no regressions)
- `bash scripts/verify.sh` exits 0
- A reviewer (different agent or human) scores the diff 10/10 on consistency, scalability, maintainability, correctness
- `v0.0.4-plan-04` tag exists on `main` with `feat/plan-04-adapter-host` merged in
- Root `CLAUDE.md` "Where to look" links to `docs/architecture/adapter-host.md`
- `feature_list.json` F15-F20 are all `passing`
- Adapter host can be exercised end-to-end through `DycodeClient` against a real spawned daemon child
