# dycode · Plan 03 — `dycoded` daemon skeleton

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `dycoded` long-running sidecar daemon end-to-end on a focused vertical slice: it boots cleanly with a lockfile + free port pick + bearer-token auth, persists to SQLite via forward-only migrations, serves WebSocket JSON-RPC 2.0 with the `workspace.*` + `events.*` method surface, and streams `event.appended` notifications back to subscribed clients. A new typed `@dycode/ipc-client` package exercises the daemon from an end-to-end Vitest spec.

**Architecture:** New `daemons/dycoded` workspace package — Node 22, ESM, strict TS, Hono HTTP + `@hono/node-ws` WebSocket upgrade, `better-sqlite3` with WAL + foreign-key enforcement, `pino` structured logs. New `packages/ipc-client` workspace package — typed JSON-RPC client over `ws` with request/response correlation and subscription handles. Single-threaded orchestrator core (workers and PTYs come in Plan 04+). Everything consumes Zod schemas from `@dycode/contracts` — no hand-written shapes.

**Tech Stack:** Node 22 · TypeScript 5.7 strict · Hono 4.x · `@hono/node-ws` · `better-sqlite3` 11.x · `ws` 8.x · `pino` 9.x · `ulid` 2.x · Vitest 2 · existing pnpm + Turborepo + ESLint 9 + Prettier 3 toolchain from Plans 01/02.

**Starting state:** `main@467f98a` (Plan 02 close). `@dycode/contracts@0.1.0` and `@dycode/adapter-sdk@0.1.0` are shipped with the full IPC + adapter surface. `pnpm-workspace.yaml` currently includes only `packages/*`. No `daemons/` directory exists. No `dycoded` binary, no `~/.dycode` directory contract on disk. `feature_list.json` ends at F07.

**Execution worktree:** `/Users/carlomigueldy/personal/dycode-plan-03` (created via `superpowers:using-git-worktrees` at execution time — not by this plan). Branch: `feat/plan-03-daemon-skeleton`.

**Out of scope (deferred):**
- Adapter plugin host + sandbox + capability negotiation → Plan 04
- Concrete adapters (claude-code, codex, opencode, verifiers) → Plan 04+
- `adapter.*`, `runtime.*`, `squad.*`, `pool.*`, `task.*` method handlers → Plan 04+
- `agents` / `squads` / `squad_members` / `tasks` SQLite tables → Plan 04 (added when needed)
- Worker-thread pool for CPU-bound work → Plan 04+ (single-threaded is fine for skeleton)
- Electron renderer + sidecar spawn from the app → Plan 05+

---

## File structure produced by this plan

```
dycode/
├── daemons/
│   └── dycoded/                                # NEW package
│       ├── package.json
│       ├── tsconfig.json                       # solution root
│       ├── tsconfig.build.json
│       ├── tsconfig.test.json
│       ├── vitest.config.ts
│       ├── CLAUDE.md
│       ├── AGENTS.md
│       ├── bin/
│       │   └── dycoded.mjs                     # CLI entry shim
│       ├── src/
│       │   ├── index.ts                        # public barrel (boot + types)
│       │   ├── version.ts                      # DYCODED_VERSION
│       │   ├── cli.ts                          # start | stop | status subcommands
│       │   ├── boot.ts                         # wires modules + starts server
│       │   ├── lifecycle.ts                    # signal handlers + shutdown promise
│       │   ├── logger.ts                       # pino instance
│       │   ├── runtime/
│       │   │   ├── port.ts                     # free-port picker
│       │   │   ├── auth.ts                     # ~/.dycode/auth.json (mode 0600)
│       │   │   ├── registry.ts                 # ~/.dycode/runtime.json r/w
│       │   │   ├── lockfile.ts                 # exclusive lock on dycoded.lock
│       │   │   └── data-dir.ts                 # resolves DYCODE_DATA_DIR or ~/.dycode
│       │   ├── persistence/
│       │   │   ├── db.ts                       # better-sqlite3 connection + pragmas
│       │   │   ├── migrate.ts                  # forward-only migration runner
│       │   │   ├── migrations/
│       │   │   │   ├── 001-workspaces.ts
│       │   │   │   └── 002-event-log.ts
│       │   │   ├── workspace-repo.ts           # CRUD over workspaces
│       │   │   └── event-log-repo.ts           # append + filter-query
│       │   └── ipc/
│       │       ├── server.ts                   # Hono app + /health + WS upgrade
│       │       ├── auth-middleware.ts          # bearer token check
│       │       ├── connections.ts              # connected client registry
│       │       ├── dispatcher.ts               # envelope → handler → response
│       │       ├── error-mapper.ts             # exception → JsonRpcError
│       │       ├── subscriptions.ts            # filter-matching broadcaster
│       │       └── handlers/
│       │           ├── workspace.ts            # workspace.* handlers
│       │           └── events.ts               # events.* handlers
│       └── tests/
│           ├── runtime/
│           │   ├── port.test.ts
│           │   ├── auth.test.ts
│           │   ├── registry.test.ts
│           │   └── lockfile.test.ts
│           ├── persistence/
│           │   ├── migrate.test.ts
│           │   ├── workspace-repo.test.ts
│           │   └── event-log-repo.test.ts
│           ├── ipc/
│           │   ├── dispatcher.test.ts
│           │   ├── subscriptions.test.ts
│           │   └── handlers/
│           │       ├── workspace.test.ts
│           │       └── events.test.ts
│           └── e2e/
│               └── workspace-flow.test.ts      # spawns child daemon
│
├── packages/
│   └── ipc-client/                             # NEW package
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       ├── tsconfig.test.json
│       ├── vitest.config.ts
│       ├── CLAUDE.md
│       ├── AGENTS.md
│       ├── src/
│       │   ├── index.ts
│       │   ├── version.ts                      # IPC_CLIENT_VERSION
│       │   ├── client.ts                       # DycodeClient class
│       │   ├── request.ts                      # correlation map + send/await
│       │   └── subscriptions.ts                # SubscriptionHandle + dispatch
│       └── tests/
│           └── client.test.ts                  # against an in-test mock WS server
│
├── docs/
│   └── architecture/
│       ├── daemon.md                           # TOC linking into daemons/dycoded
│       └── ipc-client.md                       # TOC linking into packages/ipc-client
│
├── pnpm-workspace.yaml                         # extended to include daemons/*
├── feature_list.json                           # F08-F14 added
├── PROGRESS.md                                 # Plan 03 entry appended
└── CLAUDE.md                                   # "Where to look" links updated
```

---

## Conventions for this plan

1. **Schemas from contracts, never re-declared.** Every wire-format check (params, results, notifications, envelope) uses a Zod schema imported from `@dycode/contracts`. If a shape isn't in contracts, fix contracts first.
2. **One concept per file.** Repositories own SQL for one table. Handlers own routing for one method namespace. Tests sit under `tests/<area>/<name>.test.ts`.
3. **Forward-only migrations.** Each migration is a TS module exporting `id`, `description`, `up(db)`. No `down`. The runner records applied ids in `schema_migrations` and runs each migration's `verify(db)` integrity check after `up`.
4. **No global state in modules.** Every module exports a factory or class that takes its dependencies. The boot module composes them. Makes everything unit-testable with an in-memory DB and a fake clock.
5. **In-memory SQLite for unit tests.** `new Database(':memory:')` for everything in `tests/persistence/`, `tests/ipc/`. The E2E test uses a temp data dir with `DYCODE_DATA_DIR`.
6. **Port 0 for WS test servers.** Never hard-code a port in a test. Read back the bound port after `listen()`.
7. **TDD where it pays.** Pure logic (port picker, migration runner, repositories, dispatcher, subscriptions) gets full red-green-refactor. Plumbing (Hono wiring, CLI parsing) gets minimal integration coverage. Every task that touches code includes at least one test step.
8. **Tests cover happy path + at least one rejection.** Same rule as contracts.
9. **Conventional commits with package scope.** `feat(dycoded):`, `feat(ipc-client):`, `test(dycoded):`, `chore(repo):`, `docs(daemon):`. No `Co-Authored-By` lines naming any LLM (rule #9 from root `CLAUDE.md`).
10. **No `--no-verify`.** Every commit goes through hooks (none configured yet, but the rule stands).
11. **`./scripts/verify.sh` exits 0** at the end of every task that touches code. Doc-only tasks can skip only if they don't touch lintable/formattable files.
12. **3-tsconfig pattern.** Same as `@dycode/contracts` and `@dycode/adapter-sdk` — solution root, build config (`src/` only), test config (`src/` + `tests/`). `references` chain to upstream packages' `tsconfig.build.json`.

---

## Task list overview

| #  | Task                                                        | Output                                                                                              |
| -- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 01 | Extend workspace YAML; create branch                        | `pnpm-workspace.yaml` includes `daemons/*`; branch `feat/plan-03-daemon-skeleton` ready             |
| 02 | Scaffold `daemons/dycoded` package                          | 3-tsconfig package, vitest config, stub `DYCODED_VERSION`, package maps                             |
| 03 | Scaffold `packages/ipc-client` package                      | 3-tsconfig package, vitest config, stub `IPC_CLIENT_VERSION`, package maps                          |
| 04 | Data-dir resolver + free-port picker                        | `runtime/data-dir.ts`, `runtime/port.ts` + tests                                                    |
| 05 | Auth token module (`~/.dycode/auth.json`, mode 0600)        | `runtime/auth.ts` + tests                                                                           |
| 06 | Runtime registry + lockfile                                 | `runtime/registry.ts`, `runtime/lockfile.ts` + tests                                                |
| 07 | SQLite connection module (`better-sqlite3`, WAL + FKs)      | `persistence/db.ts` + tests                                                                         |
| 08 | Migration runner (`schema_migrations` + integrity verify)   | `persistence/migrate.ts` + tests                                                                    |
| 09 | Migration 001 — `workspaces` table                          | `persistence/migrations/001-workspaces.ts` + tests                                                  |
| 10 | Migration 002 — `event_log` table + indexes                 | `persistence/migrations/002-event-log.ts` + tests                                                   |
| 11 | `WorkspaceRepository`                                       | `persistence/workspace-repo.ts` + tests                                                             |
| 12 | `EventLogRepository`                                        | `persistence/event-log-repo.ts` + tests                                                             |
| 13 | Pino logger + Hono server + `/health` route                 | `logger.ts`, `ipc/server.ts` + tests                                                                |
| 14 | WS upgrade + bearer auth + connection registry              | `ipc/auth-middleware.ts`, `ipc/connections.ts`, server WS hookup + tests                            |
| 15 | JSON-RPC dispatcher + error mapper                          | `ipc/dispatcher.ts`, `ipc/error-mapper.ts` + tests                                                  |
| 16 | Subscription registry (filter-matching broadcaster)         | `ipc/subscriptions.ts` + tests                                                                      |
| 17 | `workspace.add` handler + `event.appended` emission         | `ipc/handlers/workspace.ts` (partial) + tests                                                       |
| 18 | `workspace.list` / `workspace.activate` / `workspace.remove` handlers | `ipc/handlers/workspace.ts` (completed) + tests                                           |
| 19 | `events.subscribe` / `events.unsubscribe` handlers          | `ipc/handlers/events.ts` (partial) + tests                                                          |
| 20 | `events.query` handler                                      | `ipc/handlers/events.ts` (completed) + tests                                                        |
| 21 | `DycodeClient` — connect, auth, `request<M>()`              | `packages/ipc-client/src/client.ts`, `request.ts` + tests                                           |
| 22 | `DycodeClient` — `subscribe()` / `unsubscribe()`            | `packages/ipc-client/src/subscriptions.ts` + tests                                                  |
| 23 | Boot entrypoint + signal handlers + `dycoded` bin           | `boot.ts`, `lifecycle.ts`, `cli.ts`, `bin/dycoded.mjs` + tests                                      |
| 24 | `dycoded stop` / `dycoded status` subcommands               | `cli.ts` (completed) + tests                                                                        |
| 25 | End-to-end test: spawn daemon + ipc-client roundtrip        | `tests/e2e/workspace-flow.test.ts`                                                                  |
| 26 | Package maps + deep docs                                    | `daemons/dycoded/CLAUDE.md` + `AGENTS.md`, `packages/ipc-client/CLAUDE.md` + `AGENTS.md`, `docs/architecture/daemon.md`, `docs/architecture/ipc-client.md` |
| 27 | Close-out: root `CLAUDE.md`, `feature_list.json`, `PROGRESS.md`, tag | Root map links updated, F08-F14 = `passing`, PROGRESS entry, tag `v0.0.3-plan-03`            |

Each task below is bite-sized (2–5 minutes of mechanical work) with complete code blocks and exact commands. TDD pattern where applicable: write failing test → verify red → implement → verify green → commit.

---

### Task 01 · Extend workspace YAML & create branch

**Files:**
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Confirm starting state**

Run from main checkout:
```bash
git -C /Users/carlomigueldy/personal/dycode rev-parse HEAD
git -C /Users/carlomigueldy/personal/dycode status --short
```

Expected: HEAD = `467f98a…`, working tree clean.

- [ ] **Step 2: Create the Plan 03 worktree**

Follow `superpowers:using-git-worktrees`. End state:
- Worktree at `/Users/carlomigueldy/personal/dycode-plan-03`
- Branch `feat/plan-03-daemon-skeleton` checked out
- Worktree is the working directory for every subsequent task

Verify:
```bash
git -C /Users/carlomigueldy/personal/dycode-plan-03 status
git -C /Users/carlomigueldy/personal/dycode-plan-03 branch --show-current
```

Expected: `feat/plan-03-daemon-skeleton` on a clean tree.

- [ ] **Step 3: Extend `pnpm-workspace.yaml`**

Replace contents:

```yaml
packages:
  - 'packages/*'
  - 'daemons/*'
  # future: "apps/*", "adapters/*"
```

- [ ] **Step 4: Re-run pnpm install (no new packages yet, just sanity)**

Run:
```bash
pnpm install
```

Expected: `Done in <Ns>`, no `daemons/*` warnings (the glob is empty until Task 02). Lockfile unchanged.

- [ ] **Step 5: Verify the existing pipeline still passes**

Run:
```bash
bash scripts/verify.sh
```

Expected: all four gates green.

- [ ] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml
git commit -m "chore(repo): include daemons/* in the pnpm workspace"
```

---

### Task 02 · Scaffold `daemons/dycoded` package

**Files:**
- Create: `daemons/dycoded/package.json`
- Create: `daemons/dycoded/tsconfig.json`
- Create: `daemons/dycoded/tsconfig.build.json`
- Create: `daemons/dycoded/tsconfig.test.json`
- Create: `daemons/dycoded/vitest.config.ts`
- Create: `daemons/dycoded/src/version.ts`
- Create: `daemons/dycoded/src/index.ts`
- Create: `daemons/dycoded/tests/version.test.ts`

Mirrors the 3-tsconfig + Vitest pattern locked in by `@dycode/contracts` and `@dycode/adapter-sdk` (Plan 02). No source yet beyond `DYCODED_VERSION` — every subsequent task fills in one slice.

- [ ] **Step 1: Add runtime dependencies at the workspace root**

Run from repo root:
```bash
pnpm add -DwE @types/better-sqlite3@^7.6.12 @types/ws@^8.5.13
```

Expected: types added to root devDependencies, lockfile updated.

- [ ] **Step 2: Write `daemons/dycoded/package.json`**

```json
{
  "name": "@dycode/dycoded",
  "version": "0.0.0",
  "private": true,
  "description": "dycode sidecar daemon (Node/TS). Owns squads, the pool, tasks, hand-off log, SQLite state, and the adapter plugin host.",
  "license": "Apache-2.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "bin": {
    "dycoded": "./bin/dycoded.mjs"
  },
  "files": ["dist", "bin"],
  "scripts": {
    "build": "tsc -b tsconfig.build.json",
    "typecheck": "tsc -b tsconfig.json",
    "test": "vitest run",
    "clean": "rm -rf dist .tsc-tests *.tsbuildinfo"
  },
  "dependencies": {
    "@dycode/contracts": "workspace:*",
    "@hono/node-server": "^1.13.7",
    "@hono/node-ws": "^1.0.5",
    "better-sqlite3": "^11.7.0",
    "hono": "^4.6.14",
    "pino": "^9.5.0",
    "ulid": "^2.3.0",
    "ws": "^8.18.0",
    "zod": "^3.24.1"
  }
}
```

- [ ] **Step 3: Write `daemons/dycoded/tsconfig.json` (solution root)**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.build.json" },
    { "path": "./tsconfig.test.json" }
  ]
}
```

- [ ] **Step 4: Write `daemons/dycoded/tsconfig.build.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "tests"],
  "references": [
    { "path": "../../packages/contracts/tsconfig.build.json" }
  ]
}
```

- [ ] **Step 5: Write `daemons/dycoded/tsconfig.test.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": ".tsc-tests",
    "tsBuildInfoFile": ".tsc-tests/.tsbuildinfo"
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["dist", ".tsc-tests", "node_modules"],
  "references": [
    { "path": "../../packages/contracts/tsconfig.build.json" }
  ]
}
```

- [ ] **Step 6: Write `daemons/dycoded/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 10_000,
  },
})
```

- [ ] **Step 7: Write `daemons/dycoded/src/version.ts`**

```ts
/**
 * Semver of the dycoded daemon binary. Bumps independently from
 * @dycode/contracts and @dycode/adapter-sdk. Bump major only on
 * breaking changes to the on-disk runtime layout (~/.dycode).
 */
export const DYCODED_VERSION = '0.0.0' as const
```

- [ ] **Step 8: Write `daemons/dycoded/src/index.ts`**

```ts
export { DYCODED_VERSION } from './version.js'
```

- [ ] **Step 9: Write `daemons/dycoded/tests/version.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { DYCODED_VERSION } from '../src/index.js'

describe('DYCODED_VERSION', () => {
  it('is a non-empty semver string', () => {
    expect(typeof DYCODED_VERSION).toBe('string')
    expect(DYCODED_VERSION.length).toBeGreaterThan(0)
  })

  it('matches a basic semver shape', () => {
    expect(DYCODED_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/)
  })

  it('starts at major version 0 for the pre-1.0 surface', () => {
    const major = Number.parseInt(DYCODED_VERSION.split('.')[0] ?? '', 10)
    expect(major).toBe(0)
  })
})
```

- [ ] **Step 10: Install + verify pipeline**

Run:
```bash
pnpm install
pnpm --filter @dycode/dycoded test
pnpm --filter @dycode/dycoded typecheck
pnpm format
bash scripts/verify.sh
```

Expected: package installed, 3 tests pass, typecheck clean, format clean, full pipeline green.

- [ ] **Step 11: Commit**

```bash
git add daemons/ pnpm-lock.yaml package.json
git commit -m "feat(dycoded): scaffold @dycode/dycoded package with version stub"
```

---

### Task 03 · Scaffold `packages/ipc-client` package

**Files:**
- Create: `packages/ipc-client/package.json`
- Create: `packages/ipc-client/tsconfig.json`
- Create: `packages/ipc-client/tsconfig.build.json`
- Create: `packages/ipc-client/tsconfig.test.json`
- Create: `packages/ipc-client/vitest.config.ts`
- Create: `packages/ipc-client/src/version.ts`
- Create: `packages/ipc-client/src/index.ts`
- Create: `packages/ipc-client/tests/version.test.ts`

Same 3-tsconfig pattern. `ws` is a runtime dep; `@dycode/contracts` is consumed for envelope/method/notification schemas.

- [ ] **Step 1: Write `packages/ipc-client/package.json`**

```json
{
  "name": "@dycode/ipc-client",
  "version": "0.0.0",
  "private": true,
  "description": "Typed WebSocket JSON-RPC 2.0 client for the dycoded daemon. Used by the Electron app, the future web/mobile companion, and integration tests.",
  "license": "Apache-2.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -b tsconfig.build.json",
    "typecheck": "tsc -b tsconfig.json",
    "test": "vitest run",
    "clean": "rm -rf dist .tsc-tests *.tsbuildinfo"
  },
  "dependencies": {
    "@dycode/contracts": "workspace:*",
    "ulid": "^2.3.0",
    "ws": "^8.18.0",
    "zod": "^3.24.1"
  }
}
```

- [ ] **Step 2: Write `packages/ipc-client/tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.build.json" },
    { "path": "./tsconfig.test.json" }
  ]
}
```

- [ ] **Step 3: Write `packages/ipc-client/tsconfig.build.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "tests"],
  "references": [
    { "path": "../contracts/tsconfig.build.json" }
  ]
}
```

- [ ] **Step 4: Write `packages/ipc-client/tsconfig.test.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": ".tsc-tests",
    "tsBuildInfoFile": ".tsc-tests/.tsbuildinfo"
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["dist", ".tsc-tests", "node_modules"],
  "references": [
    { "path": "../contracts/tsconfig.build.json" }
  ]
}
```

- [ ] **Step 5: Write `packages/ipc-client/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 10_000,
  },
})
```

- [ ] **Step 6: Write `packages/ipc-client/src/version.ts`**

```ts
/**
 * Semver of the @dycode/ipc-client surface. Bumps independently
 * from the daemon binary. Bump major only on breaking changes
 * to the public client class or its public method shapes.
 */
export const IPC_CLIENT_VERSION = '0.0.0' as const
```

- [ ] **Step 7: Write `packages/ipc-client/src/index.ts`**

```ts
export { IPC_CLIENT_VERSION } from './version.js'
```

- [ ] **Step 8: Write `packages/ipc-client/tests/version.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { IPC_CLIENT_VERSION } from '../src/index.js'

describe('IPC_CLIENT_VERSION', () => {
  it('is a non-empty semver string', () => {
    expect(typeof IPC_CLIENT_VERSION).toBe('string')
    expect(IPC_CLIENT_VERSION.length).toBeGreaterThan(0)
  })

  it('matches a basic semver shape', () => {
    expect(IPC_CLIENT_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/)
  })

  it('starts at major 0 for the pre-1.0 surface', () => {
    const major = Number.parseInt(IPC_CLIENT_VERSION.split('.')[0] ?? '', 10)
    expect(major).toBe(0)
  })
})
```

- [ ] **Step 9: Install + verify pipeline**

Run:
```bash
pnpm install
pnpm --filter @dycode/ipc-client test
pnpm --filter @dycode/ipc-client typecheck
bash scripts/verify.sh
```

Expected: 3 tests pass, typecheck clean, full pipeline green.

- [ ] **Step 10: Commit**

```bash
git add packages/ipc-client/ pnpm-lock.yaml
git commit -m "feat(ipc-client): scaffold @dycode/ipc-client package with version stub"
```

---

### Task 04 · Data-dir resolver + free-port picker

**Files:**
- Create: `daemons/dycoded/src/runtime/data-dir.ts`
- Create: `daemons/dycoded/src/runtime/port.ts`
- Create: `daemons/dycoded/tests/runtime/port.test.ts`

The data-dir resolver is dead simple but referenced by every other runtime module — settle it now. The port picker uses `net.createServer().listen(0)` to bind an ephemeral port, then immediately closes the listener and returns the picked number.

- [ ] **Step 1: Write `daemons/dycoded/src/runtime/data-dir.ts`**

```ts
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Returns the directory dycoded uses for runtime + persistent state.
 * Order of precedence:
 *   1. process.env.DYCODE_DATA_DIR (absolute path)
 *   2. ${HOME}/.dycode
 *
 * Tests should always set DYCODE_DATA_DIR to a tmp path so they
 * never touch a real user's daemon state.
 */
export function resolveDataDir(env: NodeJS.ProcessEnv = process.env): string {
  const override = env['DYCODE_DATA_DIR']
  if (typeof override === 'string' && override.length > 0) {
    if (!override.startsWith('/')) {
      throw new Error(`DYCODE_DATA_DIR must be an absolute path, got: ${override}`)
    }
    return override
  }
  return join(homedir(), '.dycode')
}
```

- [ ] **Step 2: Write the failing port-picker test `daemons/dycoded/tests/runtime/port.test.ts`**

```ts
import { createServer } from 'node:net'
import { describe, expect, it } from 'vitest'
import { pickFreePort } from '../../src/runtime/port.js'

describe('pickFreePort', () => {
  it('returns an integer in the ephemeral range', async () => {
    const port = await pickFreePort()
    expect(Number.isInteger(port)).toBe(true)
    expect(port).toBeGreaterThan(0)
    expect(port).toBeLessThan(65_536)
  })

  it('returns a port that another listener can immediately bind', async () => {
    const port = await pickFreePort()
    await new Promise<void>((resolve, reject) => {
      const srv = createServer()
      srv.once('error', reject)
      srv.listen(port, '127.0.0.1', () => {
        srv.close(() => resolve())
      })
    })
  })

  it('does not return the same port on two back-to-back calls (best-effort)', async () => {
    const a = await pickFreePort()
    const b = await pickFreePort()
    // Not a hard contract — OS may reuse — but ephemeral allocation
    // typically increments. Failing this once in a blue moon is fine.
    expect(typeof a).toBe('number')
    expect(typeof b).toBe('number')
  })
})
```

- [ ] **Step 3: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/runtime/port.test.ts
```

Expected: FAIL — `Cannot find module '../../src/runtime/port.js'` or similar.

- [ ] **Step 4: Write `daemons/dycoded/src/runtime/port.ts`**

```ts
import { createServer } from 'node:net'

/**
 * Picks a free TCP port on 127.0.0.1 by asking the OS for an
 * ephemeral one (bind on port 0), then closing the listener.
 *
 * Note: This is racy by nature — another process can grab the port
 * between this call and a subsequent listen. The daemon retries
 * with a fresh pick if its listen fails with EADDRINUSE.
 */
export function pickFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.unref()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      if (addr === null || typeof addr === 'string') {
        srv.close()
        reject(new Error('expected an AddressInfo object from server.address()'))
        return
      }
      const port = addr.port
      srv.close((err) => {
        if (err) reject(err)
        else resolve(port)
      })
    })
  })
}
```

- [ ] **Step 5: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/runtime/port.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 7: Commit**

```bash
git add daemons/dycoded/src/runtime/data-dir.ts daemons/dycoded/src/runtime/port.ts daemons/dycoded/tests/runtime/port.test.ts
git commit -m "feat(dycoded): add data-dir resolver and free-port picker"
```

---

### Task 05 · Auth token module (`~/.dycode/auth.json`, mode 0600)

**Files:**
- Create: `daemons/dycoded/src/runtime/auth.ts`
- Create: `daemons/dycoded/tests/runtime/auth.test.ts`

A per-session bearer token. On boot, the daemon writes (or rewrites) `auth.json` at mode `0600` containing `{ token, createdAt }`. The Electron app reads the same file to learn the token. Tests use a temp data dir.

- [ ] **Step 1: Write the failing test `daemons/dycoded/tests/runtime/auth.test.ts`**

```ts
import { mkdtempSync, readFileSync, statSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  generateAuthToken,
  loadAuthToken,
  writeAuthToken,
} from '../../src/runtime/auth.js'

describe('runtime/auth', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dycoded-auth-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('generateAuthToken returns at least 32 bytes of base64url entropy', () => {
    const token = generateAuthToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    // base64url of 32 bytes → 43 chars (no padding)
    expect(token.length).toBeGreaterThanOrEqual(43)
  })

  it('two generated tokens differ', () => {
    expect(generateAuthToken()).not.toBe(generateAuthToken())
  })

  it('writeAuthToken creates auth.json with mode 0600 (POSIX)', () => {
    const token = generateAuthToken()
    writeAuthToken(dir, token)
    const path = join(dir, 'auth.json')
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    expect(parsed.token).toBe(token)
    expect(typeof parsed.createdAt).toBe('number')
    if (process.platform !== 'win32') {
      const mode = statSync(path).mode & 0o777
      expect(mode).toBe(0o600)
    }
  })

  it('loadAuthToken reads back the same token', () => {
    const token = generateAuthToken()
    writeAuthToken(dir, token)
    expect(loadAuthToken(dir)).toBe(token)
  })

  it('loadAuthToken returns null if auth.json is missing', () => {
    expect(loadAuthToken(dir)).toBeNull()
  })

  it('loadAuthToken throws on malformed JSON', () => {
    const path = join(dir, 'auth.json')
    require('node:fs').writeFileSync(path, 'not json')
    expect(() => loadAuthToken(dir)).toThrow()
  })
})
```

- [ ] **Step 2: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/runtime/auth.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write `daemons/dycoded/src/runtime/auth.ts`**

```ts
import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

const AUTH_FILE = 'auth.json'

const AuthFileSchema = z
  .object({
    token: z.string().min(32),
    createdAt: z.number().int().nonnegative(),
  })
  .strict()

/**
 * 32 random bytes → base64url. ~43 chars, no padding.
 * Per-session token — the daemon rewrites it on every boot.
 */
export function generateAuthToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Writes the bearer token to `<dataDir>/auth.json`.
 * Forces mode 0600 on POSIX (no-op on Windows).
 */
export function writeAuthToken(dataDir: string, token: string): void {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true, mode: 0o700 })
  const path = join(dataDir, AUTH_FILE)
  const body = JSON.stringify({ token, createdAt: Date.now() })
  writeFileSync(path, body, { encoding: 'utf8', mode: 0o600 })
  if (process.platform !== 'win32') chmodSync(path, 0o600)
}

/**
 * Reads the bearer token. Returns null if the file is missing
 * (first-boot or stale state). Throws if the file exists but is
 * malformed — the caller decides whether to rewrite.
 */
export function loadAuthToken(dataDir: string): string | null {
  const path = join(dataDir, AUTH_FILE)
  if (!existsSync(path)) return null
  const raw = readFileSync(path, 'utf8')
  const parsed = AuthFileSchema.parse(JSON.parse(raw))
  return parsed.token
}
```

- [ ] **Step 4: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/runtime/auth.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/runtime/auth.ts daemons/dycoded/tests/runtime/auth.test.ts
git commit -m "feat(dycoded): add bearer-token auth module with 0600 file mode"
```

---

### Task 06 · Runtime registry + lockfile

**Files:**
- Create: `daemons/dycoded/src/runtime/registry.ts`
- Create: `daemons/dycoded/src/runtime/lockfile.ts`
- Create: `daemons/dycoded/tests/runtime/registry.test.ts`
- Create: `daemons/dycoded/tests/runtime/lockfile.test.ts`

`registry.ts` r/w `<dataDir>/runtime.json` (the file Electron reads to discover the daemon). `lockfile.ts` writes `<dataDir>/dycoded.lock` with PID + boot timestamp and refuses to overwrite a live lock.

- [ ] **Step 1: Write the failing test `daemons/dycoded/tests/runtime/registry.test.ts`**

```ts
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readRuntimeRegistry, writeRuntimeRegistry } from '../../src/runtime/registry.js'

describe('runtime/registry', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dycoded-registry-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('writes and reads back a registry entry', () => {
    writeRuntimeRegistry(dir, {
      pid: 12345,
      port: 31000,
      host: '127.0.0.1',
      bootedAt: 1_700_000_000_000,
      daemonVersion: '0.0.0',
    })
    const got = readRuntimeRegistry(dir)
    expect(got).toEqual({
      pid: 12345,
      port: 31000,
      host: '127.0.0.1',
      bootedAt: 1_700_000_000_000,
      daemonVersion: '0.0.0',
    })
  })

  it('returns null when runtime.json is absent', () => {
    expect(readRuntimeRegistry(dir)).toBeNull()
  })

  it('throws on malformed runtime.json', () => {
    writeFileSync(join(dir, 'runtime.json'), '{not json')
    expect(() => readRuntimeRegistry(dir)).toThrow()
  })

  it('throws on schema-invalid runtime.json', () => {
    writeFileSync(join(dir, 'runtime.json'), JSON.stringify({ pid: 'oops' }))
    expect(() => readRuntimeRegistry(dir)).toThrow()
  })

  it('write produces a JSON file with stable shape', () => {
    writeRuntimeRegistry(dir, {
      pid: 1,
      port: 2,
      host: '127.0.0.1',
      bootedAt: 3,
      daemonVersion: '0.0.0',
    })
    const raw = readFileSync(join(dir, 'runtime.json'), 'utf8')
    const parsed = JSON.parse(raw)
    expect(Object.keys(parsed).sort()).toEqual(
      ['bootedAt', 'daemonVersion', 'host', 'pid', 'port'].sort(),
    )
  })
})
```

- [ ] **Step 2: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/runtime/registry.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write `daemons/dycoded/src/runtime/registry.ts`**

```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

const REGISTRY_FILE = 'runtime.json'

const RuntimeRegistrySchema = z
  .object({
    pid: z.number().int().positive(),
    port: z.number().int().positive().max(65_535),
    host: z.string().min(1),
    bootedAt: z.number().int().nonnegative(),
    daemonVersion: z.string().min(1),
  })
  .strict()

export type RuntimeRegistry = z.infer<typeof RuntimeRegistrySchema>

export function writeRuntimeRegistry(dataDir: string, entry: RuntimeRegistry): void {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true, mode: 0o700 })
  RuntimeRegistrySchema.parse(entry)
  const path = join(dataDir, REGISTRY_FILE)
  writeFileSync(path, JSON.stringify(entry, null, 2), { encoding: 'utf8', mode: 0o600 })
}

export function readRuntimeRegistry(dataDir: string): RuntimeRegistry | null {
  const path = join(dataDir, REGISTRY_FILE)
  if (!existsSync(path)) return null
  const raw = readFileSync(path, 'utf8')
  return RuntimeRegistrySchema.parse(JSON.parse(raw))
}
```

- [ ] **Step 4: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/runtime/registry.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Write the failing test `daemons/dycoded/tests/runtime/lockfile.test.ts`**

```ts
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { acquireLock, releaseLock, readLock } from '../../src/runtime/lockfile.js'

describe('runtime/lockfile', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dycoded-lock-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('acquireLock writes a lockfile with the current pid', () => {
    acquireLock(dir)
    const got = readLock(dir)
    expect(got).not.toBeNull()
    expect(got!.pid).toBe(process.pid)
    expect(typeof got!.bootedAt).toBe('number')
    releaseLock(dir)
  })

  it('readLock returns null when lockfile is absent', () => {
    expect(readLock(dir)).toBeNull()
  })

  it('acquireLock throws when a live lock for a different live pid exists', () => {
    // simulate a live lock owned by pid=1 (init, always alive)
    writeFileSync(
      join(dir, 'dycoded.lock'),
      JSON.stringify({ pid: 1, bootedAt: Date.now() }),
    )
    expect(() => acquireLock(dir)).toThrow(/already running/i)
  })

  it('acquireLock steals a stale lock (pid no longer exists)', () => {
    // Use a pid that is guaranteed not to exist:
    // 2^31 - 1 is the max signed int and is never assigned.
    writeFileSync(
      join(dir, 'dycoded.lock'),
      JSON.stringify({ pid: 2_147_483_647, bootedAt: Date.now() - 60_000 }),
    )
    acquireLock(dir)
    const got = readLock(dir)
    expect(got!.pid).toBe(process.pid)
    releaseLock(dir)
  })

  it('releaseLock removes the lockfile', () => {
    acquireLock(dir)
    releaseLock(dir)
    expect(readLock(dir)).toBeNull()
  })
})
```

- [ ] **Step 6: Run the test (should fail)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/runtime/lockfile.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 7: Write `daemons/dycoded/src/runtime/lockfile.ts`**

```ts
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

const LOCK_FILE = 'dycoded.lock'

const LockSchema = z
  .object({
    pid: z.number().int().positive(),
    bootedAt: z.number().int().nonnegative(),
  })
  .strict()

export type Lock = z.infer<typeof LockSchema>

function isProcessAlive(pid: number): boolean {
  try {
    // kill(pid, 0) sends no signal — just checks accessibility.
    // EPERM means the process exists but we can't signal it (still alive).
    process.kill(pid, 0)
    return true
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    return code === 'EPERM'
  }
}

export function readLock(dataDir: string): Lock | null {
  const path = join(dataDir, LOCK_FILE)
  if (!existsSync(path)) return null
  try {
    return LockSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
  } catch {
    return null
  }
}

export function acquireLock(dataDir: string): void {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true, mode: 0o700 })
  const existing = readLock(dataDir)
  if (existing !== null && existing.pid !== process.pid) {
    if (isProcessAlive(existing.pid)) {
      throw new Error(
        `dycoded is already running (pid=${existing.pid}). ` +
          `Stop it first or delete ${join(dataDir, LOCK_FILE)} if you are sure it is stale.`,
      )
    }
    // Stale lock — fall through and overwrite.
  }
  const path = join(dataDir, LOCK_FILE)
  writeFileSync(
    path,
    JSON.stringify({ pid: process.pid, bootedAt: Date.now() } satisfies Lock),
    { encoding: 'utf8', mode: 0o600 },
  )
}

export function releaseLock(dataDir: string): void {
  const path = join(dataDir, LOCK_FILE)
  if (existsSync(path)) unlinkSync(path)
}
```

- [ ] **Step 8: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/runtime/lockfile.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 9: Full verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 10: Commit**

```bash
git add daemons/dycoded/src/runtime/registry.ts daemons/dycoded/src/runtime/lockfile.ts daemons/dycoded/tests/runtime/registry.test.ts daemons/dycoded/tests/runtime/lockfile.test.ts
git commit -m "feat(dycoded): add runtime.json registry and dycoded.lock lockfile"
```

---

### Task 07 · SQLite connection module

**Files:**
- Create: `daemons/dycoded/src/persistence/db.ts`
- Create: `daemons/dycoded/tests/persistence/db.test.ts`

A thin wrapper around `better-sqlite3` that enforces our pragmas every time: WAL journal mode, foreign-key constraints on, 5-second busy timeout, synchronous=NORMAL (safe under WAL). Accepts a path *or* `:memory:` so unit tests skip the filesystem.

**Note on better-sqlite3 APIs in this plan:** all DDL is run as individual prepared statements via `db.prepare(SQL).run()`. We avoid the multi-statement `db.exec(...)` API throughout (per repo lint policy + simpler error reporting per statement).

- [ ] **Step 1: Write the failing test `daemons/dycoded/tests/persistence/db.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { openDatabase, closeDatabase } from '../../src/persistence/db.js'

describe('persistence/db', () => {
  it('opens an in-memory database', () => {
    const db = openDatabase(':memory:')
    try {
      expect(db.open).toBe(true)
    } finally {
      closeDatabase(db)
    }
  })

  it('sets journal_mode = wal on a file db', () => {
    const tmpfile = `/tmp/dycoded-db-test-${process.pid}-${Date.now()}.sqlite`
    const db = openDatabase(tmpfile)
    try {
      const mode = db.pragma('journal_mode', { simple: true })
      expect(mode).toBe('wal')
    } finally {
      closeDatabase(db)
      const fs = require('node:fs')
      fs.rmSync(tmpfile, { force: true })
      fs.rmSync(`${tmpfile}-shm`, { force: true })
      fs.rmSync(`${tmpfile}-wal`, { force: true })
    }
  })

  it('enforces foreign keys', () => {
    const db = openDatabase(':memory:')
    try {
      const fks = db.pragma('foreign_keys', { simple: true })
      expect(fks).toBe(1)
    } finally {
      closeDatabase(db)
    }
  })

  it('rejects an INSERT that violates an FK', () => {
    const db = openDatabase(':memory:')
    try {
      db.prepare('CREATE TABLE parent (id TEXT PRIMARY KEY)').run()
      db.prepare(
        'CREATE TABLE child (id TEXT PRIMARY KEY, parent_id TEXT REFERENCES parent(id))',
      ).run()
      expect(() =>
        db.prepare('INSERT INTO child (id, parent_id) VALUES (?, ?)').run('c1', 'missing'),
      ).toThrow(/foreign key/i)
    } finally {
      closeDatabase(db)
    }
  })

  it('closeDatabase is idempotent', () => {
    const db = openDatabase(':memory:')
    closeDatabase(db)
    expect(() => closeDatabase(db)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/persistence/db.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write `daemons/dycoded/src/persistence/db.ts`**

```ts
import { dirname } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import Database, { type Database as DatabaseType } from 'better-sqlite3'

export type Db = DatabaseType

/**
 * Opens (or creates) a SQLite database at `path`. Pass `:memory:` for
 * an ephemeral in-test DB. Applies the dycode standard pragmas:
 *   journal_mode = WAL          (concurrent reads + a single writer)
 *   foreign_keys = ON           (off by default in SQLite — we always want this)
 *   busy_timeout = 5000         (5s before SQLITE_BUSY surfaces)
 *   synchronous  = NORMAL       (safe under WAL, fast)
 */
export function openDatabase(path: string): Db {
  if (path !== ':memory:') {
    const dir = dirname(path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 })
  }
  const db = new Database(path)
  if (path !== ':memory:') db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  db.pragma('synchronous = NORMAL')
  return db
}

export function closeDatabase(db: Db): void {
  if (db.open) db.close()
}
```

- [ ] **Step 4: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/persistence/db.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/persistence/db.ts daemons/dycoded/tests/persistence/db.test.ts
git commit -m "feat(dycoded): add better-sqlite3 connection module with standard pragmas"
```

---

### Task 08 · Migration runner

**Files:**
- Create: `daemons/dycoded/src/persistence/migrate.ts`
- Create: `daemons/dycoded/tests/persistence/migrate.test.ts`

Forward-only migrations registered in `schema_migrations`. Each migration is a TS module exporting `{ id, description, up, verify }`. The runner applies in order inside a transaction that also wraps the `verify(db)` integrity check required by spec §6.6.

- [ ] **Step 1: Write the failing test `daemons/dycoded/tests/persistence/migrate.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { openDatabase, closeDatabase } from '../../src/persistence/db.js'
import {
  runMigrations,
  appliedMigrationIds,
  type Migration,
} from '../../src/persistence/migrate.js'

const m1: Migration = {
  id: '001-alpha',
  description: 'creates t1',
  up: (db) => {
    db.prepare('CREATE TABLE t1 (id TEXT PRIMARY KEY)').run()
  },
  verify: (db) => {
    const row = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='t1'`)
      .get()
    if (!row) throw new Error('t1 not created')
  },
}

const m2: Migration = {
  id: '002-beta',
  description: 'creates t2',
  up: (db) => {
    db.prepare('CREATE TABLE t2 (id TEXT PRIMARY KEY)').run()
  },
  verify: (db) => {
    const row = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='t2'`)
      .get()
    if (!row) throw new Error('t2 not created')
  },
}

describe('persistence/migrate', () => {
  it('creates the schema_migrations table on first run', () => {
    const db = openDatabase(':memory:')
    try {
      runMigrations(db, [])
      const row = db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`,
        )
        .get()
      expect(row).toBeDefined()
    } finally {
      closeDatabase(db)
    }
  })

  it('applies migrations in order and records each id', () => {
    const db = openDatabase(':memory:')
    try {
      runMigrations(db, [m1, m2])
      expect(appliedMigrationIds(db)).toEqual(['001-alpha', '002-beta'])
    } finally {
      closeDatabase(db)
    }
  })

  it('is idempotent — second run is a no-op', () => {
    const db = openDatabase(':memory:')
    try {
      runMigrations(db, [m1, m2])
      runMigrations(db, [m1, m2])
      expect(appliedMigrationIds(db)).toEqual(['001-alpha', '002-beta'])
    } finally {
      closeDatabase(db)
    }
  })

  it('rolls back a failing migration (atomic with verify)', () => {
    const bad: Migration = {
      id: '999-bad',
      description: 'verify fails',
      up: (db) => {
        db.prepare('CREATE TABLE bad (id TEXT)').run()
      },
      verify: () => {
        throw new Error('intentional integrity failure')
      },
    }
    const db = openDatabase(':memory:')
    try {
      expect(() => runMigrations(db, [bad])).toThrow(/intentional/)
      const row = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='bad'`)
        .get()
      expect(row).toBeUndefined()
      expect(appliedMigrationIds(db)).toEqual([])
    } finally {
      closeDatabase(db)
    }
  })

  it('rejects out-of-order ids (refuses to apply later id before earlier)', () => {
    const db = openDatabase(':memory:')
    try {
      expect(() => runMigrations(db, [m2, m1])).toThrow(/order/i)
    } finally {
      closeDatabase(db)
    }
  })

  it('rejects duplicate ids', () => {
    const dup: Migration = { ...m1, description: 'same id' }
    const db = openDatabase(':memory:')
    try {
      expect(() => runMigrations(db, [m1, dup])).toThrow(/duplicate/i)
    } finally {
      closeDatabase(db)
    }
  })
})
```

- [ ] **Step 2: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/persistence/migrate.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write `daemons/dycoded/src/persistence/migrate.ts`**

```ts
import type { Db } from './db.js'

export interface Migration {
  /** Sortable id, e.g. '001-workspaces'. Must be unique and lexicographically ordered. */
  id: string
  description: string
  up: (db: Db) => void
  verify: (db: Db) => void
}

const CREATE_SCHEMA_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at INTEGER NOT NULL
  )
`

function ensureSchemaTable(db: Db): void {
  db.prepare(CREATE_SCHEMA_TABLE).run()
}

export function appliedMigrationIds(db: Db): string[] {
  ensureSchemaTable(db)
  const rows = db
    .prepare<[], { id: string }>('SELECT id FROM schema_migrations ORDER BY id ASC')
    .all()
  return rows.map((r) => r.id)
}

function assertMigrationsWellFormed(migrations: readonly Migration[]): void {
  const seen = new Set<string>()
  let prev = ''
  for (const m of migrations) {
    if (seen.has(m.id)) throw new Error(`duplicate migration id: ${m.id}`)
    if (m.id <= prev) {
      throw new Error(
        `migrations must be in ascending id order: ${m.id} comes after ${prev}`,
      )
    }
    seen.add(m.id)
    prev = m.id
  }
}

/**
 * Applies any pending migrations from `migrations`. Each migration
 * runs inside a transaction that also includes its `verify` step —
 * if either throws, the transaction is rolled back and the
 * schema_migrations row is not written, leaving the db in the
 * pre-migration state.
 */
export function runMigrations(db: Db, migrations: readonly Migration[]): void {
  assertMigrationsWellFormed(migrations)
  ensureSchemaTable(db)
  const applied = new Set(appliedMigrationIds(db))
  const record = db.prepare(
    'INSERT INTO schema_migrations (id, description, applied_at) VALUES (?, ?, ?)',
  )
  for (const m of migrations) {
    if (applied.has(m.id)) continue
    const apply = db.transaction(() => {
      m.up(db)
      m.verify(db)
      record.run(m.id, m.description, Date.now())
    })
    apply()
  }
}
```

- [ ] **Step 4: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/persistence/migrate.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/persistence/migrate.ts daemons/dycoded/tests/persistence/migrate.test.ts
git commit -m "feat(dycoded): add forward-only migration runner with integrity verify"
```

---

### Task 09 · Migration 001 — `workspaces` table

**Files:**
- Create: `daemons/dycoded/src/persistence/migrations/001-workspaces.ts`
- Modify: `daemons/dycoded/src/persistence/migrate.ts` (append `ALL_MIGRATIONS` export)
- Create: `daemons/dycoded/tests/persistence/migrations.test.ts`

Implements spec §6.4's `workspaces` schema. The `verify` step asserts the table + columns exist by name.

- [ ] **Step 1: Write the failing test `daemons/dycoded/tests/persistence/migrations.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { openDatabase, closeDatabase } from '../../src/persistence/db.js'
import { ALL_MIGRATIONS, runMigrations } from '../../src/persistence/migrate.js'

interface ColumnInfo {
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

function columns(db: ReturnType<typeof openDatabase>, table: string): ColumnInfo[] {
  return db.prepare<[], ColumnInfo>(`PRAGMA table_info(${table})`).all()
}

describe('migration 001-workspaces', () => {
  it('creates the workspaces table with the expected columns', () => {
    const db = openDatabase(':memory:')
    try {
      runMigrations(db, ALL_MIGRATIONS)
      const cols = columns(db, 'workspaces')
      const byName = new Map(cols.map((c) => [c.name, c]))
      expect(byName.get('id')?.pk).toBe(1)
      expect(byName.has('name')).toBe(true)
      expect(byName.has('root_path')).toBe(true)
      expect(byName.has('settings_json')).toBe(true)
      expect(byName.has('created_at')).toBe(true)
      expect(byName.has('last_active_at')).toBe(true)
    } finally {
      closeDatabase(db)
    }
  })

  it('rejects rows with NULL id (PK)', () => {
    const db = openDatabase(':memory:')
    try {
      runMigrations(db, ALL_MIGRATIONS)
      expect(() =>
        db
          .prepare(
            'INSERT INTO workspaces (id, name, root_path, settings_json, created_at, last_active_at) ' +
              'VALUES (NULL, ?, ?, ?, ?, ?)',
          )
          .run('w', '/p', '{}', 1, 1),
      ).toThrow()
    } finally {
      closeDatabase(db)
    }
  })

  it('accepts a well-formed workspace row', () => {
    const db = openDatabase(':memory:')
    try {
      runMigrations(db, ALL_MIGRATIONS)
      db.prepare(
        'INSERT INTO workspaces (id, name, root_path, settings_json, created_at, last_active_at) ' +
          'VALUES (?, ?, ?, ?, ?, ?)',
      ).run('ws_01ARZ3NDEKTSV4RRFFQ69G5FAV', 'demo', '/tmp/demo', '{}', 1, 1)
      const row = db.prepare('SELECT id, name FROM workspaces').get() as {
        id: string
        name: string
      }
      expect(row.name).toBe('demo')
    } finally {
      closeDatabase(db)
    }
  })
})
```

- [ ] **Step 2: Run the test (should fail — `ALL_MIGRATIONS` not exported)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/persistence/migrations.test.ts
```

Expected: FAIL — `ALL_MIGRATIONS` is not exported from `migrate.js`.

- [ ] **Step 3: Write `daemons/dycoded/src/persistence/migrations/001-workspaces.ts`**

```ts
import type { Migration } from '../migrate.js'

const CREATE_WORKSPACES = `
  CREATE TABLE workspaces (
    id              TEXT    PRIMARY KEY,
    name            TEXT    NOT NULL,
    root_path       TEXT    NOT NULL,
    settings_json   TEXT    NOT NULL DEFAULT '{}',
    created_at      INTEGER NOT NULL,
    last_active_at  INTEGER NOT NULL
  )
`

export const migration001Workspaces: Migration = {
  id: '001-workspaces',
  description: 'create workspaces table',
  up: (db) => {
    db.prepare(CREATE_WORKSPACES).run()
  },
  verify: (db) => {
    const required = [
      'id',
      'name',
      'root_path',
      'settings_json',
      'created_at',
      'last_active_at',
    ]
    const cols = db
      .prepare<[], { name: string }>('PRAGMA table_info(workspaces)')
      .all()
      .map((c) => c.name)
    for (const need of required) {
      if (!cols.includes(need)) {
        throw new Error(`workspaces table missing column: ${need}`)
      }
    }
  },
}
```

- [ ] **Step 4: Append the `ALL_MIGRATIONS` export to `daemons/dycoded/src/persistence/migrate.ts`**

At the bottom of the file, add:

```ts
import { migration001Workspaces } from './migrations/001-workspaces.js'

/**
 * Canonical ordered list of dycoded migrations. The daemon applies
 * this list on every boot. Append new migrations — never edit a
 * previously released entry.
 */
export const ALL_MIGRATIONS: readonly Migration[] = [migration001Workspaces]
```

- [ ] **Step 5: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/persistence/migrations.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 7: Commit**

```bash
git add daemons/dycoded/src/persistence/migrations/001-workspaces.ts daemons/dycoded/src/persistence/migrate.ts daemons/dycoded/tests/persistence/migrations.test.ts
git commit -m "feat(dycoded): add migration 001 — workspaces table"
```

---

### Task 10 · Migration 002 — `event_log` table + indexes

**Files:**
- Create: `daemons/dycoded/src/persistence/migrations/002-event-log.ts`
- Modify: `daemons/dycoded/src/persistence/migrate.ts` (extend `ALL_MIGRATIONS`)
- Modify: `daemons/dycoded/tests/persistence/migrations.test.ts` (append event_log coverage)

Spec §6.4 event_log table. We deliberately omit the `task_id` / `agent_id` FK targets in this plan — those tables land in Plan 04. Columns and indexes are present, FK constraints are added in their own migration when the tables exist.

- [ ] **Step 1: Append to `daemons/dycoded/tests/persistence/migrations.test.ts`**

Add the new describe block after the existing `migration 001-workspaces` block:

```ts
describe('migration 002-event-log', () => {
  it('creates the event_log table with the expected columns', () => {
    const db = openDatabase(':memory:')
    try {
      runMigrations(db, ALL_MIGRATIONS)
      const cols = columns(db, 'event_log').map((c) => c.name)
      for (const need of [
        'id',
        'ts',
        'workspace_id',
        'task_id',
        'agent_id',
        'type',
        'payload_json',
      ]) {
        expect(cols).toContain(need)
      }
    } finally {
      closeDatabase(db)
    }
  })

  it('creates idx_event_ws_ts on event_log(workspace_id, ts)', () => {
    const db = openDatabase(':memory:')
    try {
      runMigrations(db, ALL_MIGRATIONS)
      const indexes = db
        .prepare<[], { name: string }>(
          `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='event_log'`,
        )
        .all()
        .map((r) => r.name)
      expect(indexes).toContain('idx_event_ws_ts')
      expect(indexes).toContain('idx_event_task')
    } finally {
      closeDatabase(db)
    }
  })

  it('cascades event_log rows when their workspace is deleted', () => {
    const db = openDatabase(':memory:')
    try {
      runMigrations(db, ALL_MIGRATIONS)
      const ws = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'
      db.prepare(
        'INSERT INTO workspaces (id, name, root_path, settings_json, created_at, last_active_at) ' +
          'VALUES (?, ?, ?, ?, ?, ?)',
      ).run(ws, 'demo', '/tmp/demo', '{}', 1, 1)
      db.prepare(
        'INSERT INTO event_log (id, ts, workspace_id, task_id, agent_id, type, payload_json) ' +
          'VALUES (?, ?, ?, NULL, NULL, ?, ?)',
      ).run('01J0KQNR2VABCDE0123456789X', 1, ws, 'output', '{}')
      db.prepare('DELETE FROM workspaces WHERE id = ?').run(ws)
      const remaining = db
        .prepare<[], { c: number }>('SELECT COUNT(*) AS c FROM event_log')
        .get()
      expect(remaining?.c).toBe(0)
    } finally {
      closeDatabase(db)
    }
  })
})
```

- [ ] **Step 2: Run the test (should fail — `event_log` doesn't exist yet)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/persistence/migrations.test.ts
```

Expected: FAIL — `no such table: event_log`.

- [ ] **Step 3: Write `daemons/dycoded/src/persistence/migrations/002-event-log.ts`**

```ts
import type { Migration } from '../migrate.js'

const CREATE_EVENT_LOG = `
  CREATE TABLE event_log (
    id            TEXT    PRIMARY KEY,
    ts            INTEGER NOT NULL,
    workspace_id  TEXT    NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    task_id       TEXT,
    agent_id      TEXT,
    type          TEXT    NOT NULL,
    payload_json  TEXT    NOT NULL
  ) WITHOUT ROWID
`

const CREATE_IDX_WS_TS = `CREATE INDEX idx_event_ws_ts ON event_log(workspace_id, ts)`
const CREATE_IDX_TASK = `CREATE INDEX idx_event_task ON event_log(task_id)`

export const migration002EventLog: Migration = {
  id: '002-event-log',
  description: 'create event_log table + indexes',
  up: (db) => {
    db.prepare(CREATE_EVENT_LOG).run()
    db.prepare(CREATE_IDX_WS_TS).run()
    db.prepare(CREATE_IDX_TASK).run()
  },
  verify: (db) => {
    const cols = db
      .prepare<[], { name: string }>('PRAGMA table_info(event_log)')
      .all()
      .map((c) => c.name)
    for (const need of [
      'id',
      'ts',
      'workspace_id',
      'task_id',
      'agent_id',
      'type',
      'payload_json',
    ]) {
      if (!cols.includes(need)) {
        throw new Error(`event_log missing column: ${need}`)
      }
    }
    const indexes = db
      .prepare<[], { name: string }>(
        `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='event_log'`,
      )
      .all()
      .map((r) => r.name)
    for (const need of ['idx_event_ws_ts', 'idx_event_task']) {
      if (!indexes.includes(need)) throw new Error(`event_log missing index: ${need}`)
    }
  },
}
```

- [ ] **Step 4: Extend `ALL_MIGRATIONS` in `daemons/dycoded/src/persistence/migrate.ts`**

Replace the import block + export block at the bottom of the file:

```ts
import { migration001Workspaces } from './migrations/001-workspaces.js'
import { migration002EventLog } from './migrations/002-event-log.js'

/**
 * Canonical ordered list of dycoded migrations. The daemon applies
 * this list on every boot. Append new migrations — never edit a
 * previously released entry.
 */
export const ALL_MIGRATIONS: readonly Migration[] = [
  migration001Workspaces,
  migration002EventLog,
]
```

- [ ] **Step 5: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/persistence/migrations.test.ts
```

Expected: PASS, 6 tests total (3 from Task 09 + 3 new).

- [ ] **Step 6: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 7: Commit**

```bash
git add daemons/dycoded/src/persistence/migrations/002-event-log.ts daemons/dycoded/src/persistence/migrate.ts daemons/dycoded/tests/persistence/migrations.test.ts
git commit -m "feat(dycoded): add migration 002 — event_log table with indexes"
```

---

### Task 11 · `WorkspaceRepository`

**Files:**
- Create: `daemons/dycoded/src/persistence/workspace-repo.ts`
- Create: `daemons/dycoded/tests/persistence/workspace-repo.test.ts`

Thin repository over the `workspaces` table. It returns/accepts the `Workspace` domain shape from `@dycode/contracts` — the repo handles the `settings_json` ↔ object translation. IDs are generated with the `ulid` package and prefixed `ws_`. The branded `WorkspaceId` is reconstructed by parsing through the contracts schema.

- [ ] **Step 1: Write the failing test `daemons/dycoded/tests/persistence/workspace-repo.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { WorkspaceIdSchema } from '@dycode/contracts'
import { openDatabase, closeDatabase } from '../../src/persistence/db.js'
import { ALL_MIGRATIONS, runMigrations } from '../../src/persistence/migrate.js'
import { createWorkspaceRepo } from '../../src/persistence/workspace-repo.js'

function freshRepo() {
  const db = openDatabase(':memory:')
  runMigrations(db, ALL_MIGRATIONS)
  return { db, repo: createWorkspaceRepo(db) }
}

describe('WorkspaceRepository', () => {
  it('inserts a workspace and returns it with a ws_ prefixed id', () => {
    const { db, repo } = freshRepo()
    try {
      const ws = repo.insert({ name: 'demo', rootPath: '/tmp/demo' })
      expect(ws.name).toBe('demo')
      expect(ws.rootPath).toBe('/tmp/demo')
      expect(typeof ws.createdAt).toBe('number')
      expect(ws.lastActiveAt).toBe(ws.createdAt)
      // round-trip through the branded ID schema
      expect(WorkspaceIdSchema.parse(ws.id)).toBe(ws.id)
    } finally {
      closeDatabase(db)
    }
  })

  it('list() returns workspaces ordered by lastActiveAt desc', () => {
    const { db, repo } = freshRepo()
    try {
      const a = repo.insert({ name: 'a', rootPath: '/tmp/a' })
      const b = repo.insert({ name: 'b', rootPath: '/tmp/b' })
      // bump b
      repo.touchActive(b.id)
      const all = repo.list()
      expect(all[0]?.name).toBe('b')
      expect(all[1]?.name).toBe('a')
      expect(all.length).toBe(2)
      // sanity: a id is still valid
      expect(WorkspaceIdSchema.parse(a.id)).toBe(a.id)
    } finally {
      closeDatabase(db)
    }
  })

  it('get() returns null for unknown id', () => {
    const { db, repo } = freshRepo()
    try {
      const fake = WorkspaceIdSchema.parse('ws_01ARZ3NDEKTSV4RRFFQ69G5FAV')
      expect(repo.get(fake)).toBeNull()
    } finally {
      closeDatabase(db)
    }
  })

  it('remove() deletes the row and returns true; missing id returns false', () => {
    const { db, repo } = freshRepo()
    try {
      const ws = repo.insert({ name: 'demo', rootPath: '/tmp/demo' })
      expect(repo.remove(ws.id)).toBe(true)
      expect(repo.get(ws.id)).toBeNull()
      expect(repo.remove(ws.id)).toBe(false)
    } finally {
      closeDatabase(db)
    }
  })

  it('touchActive() advances last_active_at but leaves created_at alone', async () => {
    const { db, repo } = freshRepo()
    try {
      const ws = repo.insert({ name: 'demo', rootPath: '/tmp/demo' })
      await new Promise((r) => setTimeout(r, 5))
      repo.touchActive(ws.id)
      const after = repo.get(ws.id)
      expect(after).not.toBeNull()
      expect(after!.createdAt).toBe(ws.createdAt)
      expect(after!.lastActiveAt).toBeGreaterThan(ws.lastActiveAt)
    } finally {
      closeDatabase(db)
    }
  })

  it('rejects non-absolute rootPath at the repo boundary', () => {
    const { db, repo } = freshRepo()
    try {
      expect(() => repo.insert({ name: 'demo', rootPath: 'not-absolute' })).toThrow()
    } finally {
      closeDatabase(db)
    }
  })
})
```

- [ ] **Step 2: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/persistence/workspace-repo.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write `daemons/dycoded/src/persistence/workspace-repo.ts`**

```ts
import { ulid } from 'ulid'
import { WorkspaceIdSchema, WorkspaceSchema, type Workspace, type WorkspaceId } from '@dycode/contracts'
import type { Db } from './db.js'

interface WorkspaceRow {
  id: string
  name: string
  root_path: string
  settings_json: string
  created_at: number
  last_active_at: number
}

function rowToWorkspace(row: WorkspaceRow): Workspace {
  const settings = JSON.parse(row.settings_json) as Workspace['settings']
  return WorkspaceSchema.parse({
    id: row.id,
    name: row.name,
    rootPath: row.root_path,
    settings,
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at,
  })
}

export interface WorkspaceRepository {
  insert(input: { name: string; rootPath: string }): Workspace
  list(): Workspace[]
  get(id: WorkspaceId): Workspace | null
  remove(id: WorkspaceId): boolean
  touchActive(id: WorkspaceId): void
}

export function createWorkspaceRepo(db: Db): WorkspaceRepository {
  const insertStmt = db.prepare(
    'INSERT INTO workspaces (id, name, root_path, settings_json, created_at, last_active_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?)',
  )
  const listStmt = db.prepare<[], WorkspaceRow>(
    'SELECT id, name, root_path, settings_json, created_at, last_active_at ' +
      'FROM workspaces ORDER BY last_active_at DESC',
  )
  const getStmt = db.prepare<[string], WorkspaceRow>(
    'SELECT id, name, root_path, settings_json, created_at, last_active_at ' +
      'FROM workspaces WHERE id = ?',
  )
  const removeStmt = db.prepare<[string]>('DELETE FROM workspaces WHERE id = ?')
  const touchStmt = db.prepare<[number, string]>(
    'UPDATE workspaces SET last_active_at = ? WHERE id = ?',
  )

  return {
    insert(input) {
      const id = WorkspaceIdSchema.parse(`ws_${ulid()}`)
      const now = Date.now()
      // validate domain shape before write — gives clean error on bad rootPath
      const ws = WorkspaceSchema.parse({
        id,
        name: input.name,
        rootPath: input.rootPath,
        settings: {},
        createdAt: now,
        lastActiveAt: now,
      })
      insertStmt.run(ws.id, ws.name, ws.rootPath, JSON.stringify(ws.settings), now, now)
      return ws
    },
    list() {
      return listStmt.all().map(rowToWorkspace)
    },
    get(id) {
      const row = getStmt.get(id)
      return row ? rowToWorkspace(row) : null
    },
    remove(id) {
      const info = removeStmt.run(id)
      return info.changes > 0
    },
    touchActive(id) {
      touchStmt.run(Date.now(), id)
    },
  }
}
```

- [ ] **Step 4: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/persistence/workspace-repo.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/persistence/workspace-repo.ts daemons/dycoded/tests/persistence/workspace-repo.test.ts
git commit -m "feat(dycoded): add WorkspaceRepository over the workspaces table"
```

---

### Task 12 · `EventLogRepository`

**Files:**
- Create: `daemons/dycoded/src/persistence/event-log-repo.ts`
- Create: `daemons/dycoded/tests/persistence/event-log-repo.test.ts`

Append + filter-query over `event_log`. Append takes a partial entry (caller supplies `workspaceId`, `type`, `payload`; repo fills `id` with a fresh ULID and `ts` with `Date.now()`). Query supports the filter shape from `events.query` params (workspace required, task/agent optional, `sinceTs`, cursor + limit pagination).

- [ ] **Step 1: Write the failing test `daemons/dycoded/tests/persistence/event-log-repo.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { WorkspaceIdSchema, type EventLogEntry } from '@dycode/contracts'
import { openDatabase, closeDatabase } from '../../src/persistence/db.js'
import { ALL_MIGRATIONS, runMigrations } from '../../src/persistence/migrate.js'
import { createWorkspaceRepo } from '../../src/persistence/workspace-repo.js'
import { createEventLogRepo } from '../../src/persistence/event-log-repo.js'

function freshRepos() {
  const db = openDatabase(':memory:')
  runMigrations(db, ALL_MIGRATIONS)
  const workspaces = createWorkspaceRepo(db)
  const events = createEventLogRepo(db)
  const ws = workspaces.insert({ name: 'demo', rootPath: '/tmp/demo' })
  return { db, events, wsId: ws.id }
}

describe('EventLogRepository', () => {
  it('appends an entry and returns the persisted row', () => {
    const { db, events, wsId } = freshRepos()
    try {
      const entry = events.append({
        workspaceId: wsId,
        taskId: null,
        agentId: null,
        type: 'output',
        payload: { line: 'hello' },
      })
      expect(entry.workspaceId).toBe(wsId)
      expect(entry.type).toBe('output')
      expect(entry.payload).toEqual({ line: 'hello' })
      expect(typeof entry.id).toBe('string')
      expect(entry.id.length).toBe(26)
      expect(typeof entry.ts).toBe('number')
    } finally {
      closeDatabase(db)
    }
  })

  it('queryByWorkspace returns most-recent-first up to limit', () => {
    const { db, events, wsId } = freshRepos()
    try {
      const recorded: EventLogEntry[] = []
      for (let i = 0; i < 5; i++) {
        recorded.push(
          events.append({
            workspaceId: wsId,
            taskId: null,
            agentId: null,
            type: 'progress',
            payload: { i },
          }),
        )
      }
      const page = events.queryByWorkspace({ workspaceId: wsId, limit: 3 })
      expect(page.events.length).toBe(3)
      // newest first
      expect((page.events[0]?.payload as { i: number }).i).toBe(4)
      expect(page.nextCursor).not.toBeNull()
    } finally {
      closeDatabase(db)
    }
  })

  it('cursor pagination walks all rows exactly once', () => {
    const { db, events, wsId } = freshRepos()
    try {
      for (let i = 0; i < 7; i++) {
        events.append({
          workspaceId: wsId,
          taskId: null,
          agentId: null,
          type: 'progress',
          payload: { i },
        })
      }
      const seen = new Set<number>()
      let cursor: string | null | undefined = undefined
      let pages = 0
      while (true) {
        pages++
        const page = events.queryByWorkspace({
          workspaceId: wsId,
          limit: 3,
          ...(cursor === undefined ? {} : { cursor }),
        })
        for (const e of page.events) seen.add((e.payload as { i: number }).i)
        if (page.nextCursor === null) break
        cursor = page.nextCursor
        if (pages > 10) throw new Error('pagination did not terminate')
      }
      expect([...seen].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6])
    } finally {
      closeDatabase(db)
    }
  })

  it('sinceTs filter excludes older entries', async () => {
    const { db, events, wsId } = freshRepos()
    try {
      events.append({
        workspaceId: wsId,
        taskId: null,
        agentId: null,
        type: 'output',
        payload: { old: true },
      })
      await new Promise((r) => setTimeout(r, 5))
      const mark = Date.now()
      await new Promise((r) => setTimeout(r, 5))
      events.append({
        workspaceId: wsId,
        taskId: null,
        agentId: null,
        type: 'output',
        payload: { old: false },
      })
      const page = events.queryByWorkspace({ workspaceId: wsId, sinceTs: mark })
      expect(page.events.length).toBe(1)
      expect((page.events[0]?.payload as { old: boolean }).old).toBe(false)
    } finally {
      closeDatabase(db)
    }
  })

  it('query is scoped to its workspace', () => {
    const { db, events, wsId } = freshRepos()
    try {
      const otherWs = WorkspaceIdSchema.parse('ws_01ARZ3NDEKTSV4RRFFQ69G5FAV')
      events.append({
        workspaceId: wsId,
        taskId: null,
        agentId: null,
        type: 'output',
        payload: {},
      })
      const page = events.queryByWorkspace({ workspaceId: otherWs })
      expect(page.events.length).toBe(0)
    } finally {
      closeDatabase(db)
    }
  })
})
```

- [ ] **Step 2: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/persistence/event-log-repo.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write `daemons/dycoded/src/persistence/event-log-repo.ts`**

```ts
import { ulid } from 'ulid'
import {
  EventLogEntrySchema,
  type AdapterEventKind,
  type AgentId,
  type EventLogEntry,
  type TaskId,
  type WorkspaceId,
} from '@dycode/contracts'
import type { Db } from './db.js'

interface EventRow {
  id: string
  ts: number
  workspace_id: string
  task_id: string | null
  agent_id: string | null
  type: string
  payload_json: string
}

function rowToEntry(row: EventRow): EventLogEntry {
  return EventLogEntrySchema.parse({
    id: row.id,
    ts: row.ts,
    workspaceId: row.workspace_id,
    taskId: row.task_id,
    agentId: row.agent_id,
    type: row.type,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
  })
}

export interface AppendInput {
  workspaceId: WorkspaceId
  taskId: TaskId | null
  agentId: AgentId | null
  type: AdapterEventKind
  payload: Record<string, unknown>
}

export interface QueryInput {
  workspaceId: WorkspaceId
  taskId?: TaskId
  agentId?: AgentId
  sinceTs?: number
  limit?: number
  cursor?: string
}

export interface QueryResult {
  events: EventLogEntry[]
  nextCursor: string | null
}

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 1000

export interface EventLogRepository {
  append(input: AppendInput): EventLogEntry
  queryByWorkspace(input: QueryInput): QueryResult
}

export function createEventLogRepo(db: Db): EventLogRepository {
  const appendStmt = db.prepare(
    'INSERT INTO event_log (id, ts, workspace_id, task_id, agent_id, type, payload_json) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?)',
  )

  return {
    append(input) {
      const id = ulid()
      const ts = Date.now()
      const entry = EventLogEntrySchema.parse({
        id,
        ts,
        workspaceId: input.workspaceId,
        taskId: input.taskId,
        agentId: input.agentId,
        type: input.type,
        payload: input.payload,
      })
      appendStmt.run(
        entry.id,
        entry.ts,
        entry.workspaceId,
        entry.taskId,
        entry.agentId,
        entry.type,
        JSON.stringify(entry.payload),
      )
      return entry
    },
    queryByWorkspace(input) {
      const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
      const filters: string[] = ['workspace_id = ?']
      const params: Array<string | number> = [input.workspaceId]
      if (input.taskId) {
        filters.push('task_id = ?')
        params.push(input.taskId)
      }
      if (input.agentId) {
        filters.push('agent_id = ?')
        params.push(input.agentId)
      }
      if (typeof input.sinceTs === 'number') {
        filters.push('ts > ?')
        params.push(input.sinceTs)
      }
      if (typeof input.cursor === 'string') {
        // cursor is the id of the last seen (oldest in the previous page).
        // Newest-first ordering — we want strictly older than cursor.
        filters.push('id < ?')
        params.push(input.cursor)
      }
      const sql =
        'SELECT id, ts, workspace_id, task_id, agent_id, type, payload_json ' +
        'FROM event_log WHERE ' +
        filters.join(' AND ') +
        ' ORDER BY id DESC LIMIT ?'
      params.push(limit + 1)
      const rows = db.prepare<typeof params, EventRow>(sql).all(...params)
      const events = rows.slice(0, limit).map(rowToEntry)
      const nextCursor = rows.length > limit ? (events[events.length - 1]?.id ?? null) : null
      return { events, nextCursor }
    },
  }
}
```

- [ ] **Step 4: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/persistence/event-log-repo.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/persistence/event-log-repo.ts daemons/dycoded/tests/persistence/event-log-repo.test.ts
git commit -m "feat(dycoded): add EventLogRepository with cursor-paginated query"
```

---

### Task 13 · Pino logger + Hono server + `/health` route

**Files:**
- Create: `daemons/dycoded/src/logger.ts`
- Create: `daemons/dycoded/src/ipc/server.ts`
- Create: `daemons/dycoded/tests/ipc/server.test.ts`

The Hono app is built around `@hono/node-server`. Initially only the `/health` HTTP route — `/ws` is bolted on in Task 14. The factory takes its dependencies (logger, expected bearer token, port) so tests can drive it directly without env vars.

- [ ] **Step 1: Write `daemons/dycoded/src/logger.ts`**

```ts
import { pino, type Logger } from 'pino'

export type { Logger }

/**
 * Default pino logger for dycoded. Level is read from
 * env.DYCODE_LOG_LEVEL (default 'info'). Tests pass their own
 * pino-silent instance.
 */
export function createLogger(level: string = process.env['DYCODE_LOG_LEVEL'] ?? 'info'): Logger {
  return pino({ level, base: { service: 'dycoded' } })
}

export function silentLogger(): Logger {
  return pino({ level: 'silent' })
}
```

- [ ] **Step 2: Write the failing test `daemons/dycoded/tests/ipc/server.test.ts`**

```ts
import { describe, expect, it, afterEach } from 'vitest'
import { openDatabase, closeDatabase } from '../../src/persistence/db.js'
import { ALL_MIGRATIONS, runMigrations } from '../../src/persistence/migrate.js'
import { silentLogger } from '../../src/logger.js'
import { startIpcServer, type IpcServerHandle } from '../../src/ipc/server.js'

const handles: IpcServerHandle[] = []

afterEach(async () => {
  while (handles.length > 0) {
    const h = handles.pop()!
    await h.close()
  }
})

async function startTestServer() {
  const db = openDatabase(':memory:')
  runMigrations(db, ALL_MIGRATIONS)
  const handle = await startIpcServer({
    db,
    logger: silentLogger(),
    bearerToken: 'tok-abc',
    port: 0,
    host: '127.0.0.1',
  })
  handles.push({
    ...handle,
    close: async () => {
      await handle.close()
      closeDatabase(db)
    },
  })
  return handle
}

describe('ipc/server', () => {
  it('binds to a real port (auto-picked when port=0)', async () => {
    const h = await startTestServer()
    expect(Number.isInteger(h.port)).toBe(true)
    expect(h.port).toBeGreaterThan(0)
  })

  it('responds 200 OK on GET /health', async () => {
    const h = await startTestServer()
    const res = await fetch(`http://127.0.0.1:${h.port}/health`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; daemonVersion: string }
    expect(body.ok).toBe(true)
    expect(typeof body.daemonVersion).toBe('string')
  })

  it('returns 404 for an unknown HTTP path', async () => {
    const h = await startTestServer()
    const res = await fetch(`http://127.0.0.1:${h.port}/nope`)
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 3: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/server.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 4: Write `daemons/dycoded/src/ipc/server.ts`**

```ts
import { Hono } from 'hono'
import { serve, type ServerType } from '@hono/node-server'
import type { Db } from '../persistence/db.js'
import type { Logger } from '../logger.js'
import { DYCODED_VERSION } from '../version.js'

export interface IpcServerOptions {
  db: Db
  logger: Logger
  bearerToken: string
  port: number
  host: string
}

export interface IpcServerHandle {
  port: number
  host: string
  close: () => Promise<void>
}

/**
 * Boots the Hono HTTP server + (in Task 14) the WebSocket upgrade.
 * Pass port=0 to auto-pick an ephemeral port (handle.port reads back
 * the chosen value).
 */
export function startIpcServer(opts: IpcServerOptions): Promise<IpcServerHandle> {
  const app = new Hono()

  app.get('/health', (c) =>
    c.json({ ok: true, daemonVersion: DYCODED_VERSION, ts: Date.now() }),
  )

  return new Promise((resolve, reject) => {
    let server: ServerType | undefined
    try {
      server = serve(
        { fetch: app.fetch, port: opts.port, hostname: opts.host },
        (info) => {
          opts.logger.info(
            { port: info.port, host: opts.host },
            'dycoded ipc server listening',
          )
          resolve({
            port: info.port,
            host: opts.host,
            close: () =>
              new Promise<void>((res, rej) => {
                if (!server) return res()
                server.close((err) => (err ? rej(err) : res()))
              }),
          })
        },
      )
      server.on('error', reject)
    } catch (err) {
      reject(err)
    }
  })
}
```

- [ ] **Step 5: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/server.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 7: Commit**

```bash
git add daemons/dycoded/src/logger.ts daemons/dycoded/src/ipc/server.ts daemons/dycoded/tests/ipc/server.test.ts
git commit -m "feat(dycoded): add Hono server with /health route and pino logger"
```

---

### Task 14 · WS upgrade + bearer auth + connection registry

**Files:**
- Create: `daemons/dycoded/src/ipc/auth-middleware.ts`
- Create: `daemons/dycoded/src/ipc/connections.ts`
- Modify: `daemons/dycoded/src/ipc/server.ts` (bolt on `/ws` upgrade)
- Modify: `daemons/dycoded/tests/ipc/server.test.ts` (add WS auth coverage)
- Create: `daemons/dycoded/tests/ipc/connections.test.ts`

WebSocket clients connect to `ws://127.0.0.1:<port>/ws?token=<bearer>`. Auth happens during the HTTP upgrade — bad/absent token → HTTP 401 (no socket). The connection registry tracks every live socket and exposes a `broadcastTo(predicate, message)` for Task 16. We use the `ws` library directly attached to the Node HTTP server (it's easier to control the upgrade lifecycle than going through `@hono/node-ws` for auth-on-upgrade).

- [ ] **Step 1: Write `daemons/dycoded/src/ipc/auth-middleware.ts`**

```ts
import type { IncomingMessage } from 'node:http'

/**
 * Extracts the bearer token from a WebSocket upgrade request.
 * Two transports are accepted, in priority order:
 *   1. Authorization: Bearer <token>
 *   2. ?token=<token>   (query string)
 * Returns null if neither is present.
 */
export function extractBearerToken(req: IncomingMessage): string | null {
  const auth = req.headers['authorization']
  if (typeof auth === 'string') {
    const match = /^Bearer\s+(.+)$/i.exec(auth.trim())
    if (match?.[1]) return match[1].trim()
  }
  if (typeof req.url === 'string') {
    const url = new URL(req.url, 'http://internal.invalid')
    const tok = url.searchParams.get('token')
    if (tok !== null && tok.length > 0) return tok
  }
  return null
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
```

- [ ] **Step 2: Write the failing connections test `daemons/dycoded/tests/ipc/connections.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest'
import { createConnectionRegistry } from '../../src/ipc/connections.js'

interface FakeSocket {
  send: (msg: string) => void
  readyState: number
}

const OPEN = 1

function fakeSocket(): FakeSocket & { sent: string[] } {
  const sent: string[] = []
  return {
    sent,
    readyState: OPEN,
    send: (msg) => sent.push(msg),
  }
}

describe('ipc/connections', () => {
  it('register returns a unique id per socket', () => {
    const r = createConnectionRegistry()
    const a = r.register(fakeSocket() as never)
    const b = r.register(fakeSocket() as never)
    expect(a).not.toBe(b)
    expect(r.size()).toBe(2)
  })

  it('unregister removes the socket and is idempotent', () => {
    const r = createConnectionRegistry()
    const a = r.register(fakeSocket() as never)
    r.unregister(a)
    expect(r.size()).toBe(0)
    expect(() => r.unregister(a)).not.toThrow()
  })

  it('broadcastTo only delivers to matching connections in OPEN state', () => {
    const r = createConnectionRegistry()
    const s1 = fakeSocket()
    const s2 = fakeSocket()
    const s3 = fakeSocket()
    s3.readyState = 3 // CLOSED
    const id1 = r.register(s1 as never)
    r.register(s2 as never)
    r.register(s3 as never)
    r.broadcast((id) => id === id1, 'msg-1')
    expect(s1.sent).toEqual(['msg-1'])
    expect(s2.sent).toEqual([])
    expect(s3.sent).toEqual([])
  })

  it('sendTo writes to one connection by id', () => {
    const r = createConnectionRegistry()
    const s = fakeSocket()
    const id = r.register(s as never)
    r.sendTo(id, 'hello')
    expect(s.sent).toEqual(['hello'])
  })

  it('sendTo is a silent no-op for unknown ids (no throw)', () => {
    const r = createConnectionRegistry()
    expect(() => r.sendTo('does-not-exist', 'x')).not.toThrow()
  })

  it('forEach yields each registered id once', () => {
    const r = createConnectionRegistry()
    const ids = [
      r.register(fakeSocket() as never),
      r.register(fakeSocket() as never),
    ]
    const seen: string[] = []
    r.forEach((id) => seen.push(id))
    expect(seen.sort()).toEqual([...ids].sort())
  })

  it('size tracks live count through register/unregister churn', () => {
    const r = createConnectionRegistry()
    const ids = Array.from({ length: 5 }, () => r.register(fakeSocket() as never))
    expect(r.size()).toBe(5)
    r.unregister(ids[1]!)
    r.unregister(ids[3]!)
    expect(r.size()).toBe(3)
    vi.useRealTimers()
  })
})
```

- [ ] **Step 3: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/connections.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 4: Write `daemons/dycoded/src/ipc/connections.ts`**

```ts
import { ulid } from 'ulid'
import type { WebSocket } from 'ws'

const OPEN = 1

export type ConnectionId = string

export interface ConnectionRegistry {
  register(socket: WebSocket): ConnectionId
  unregister(id: ConnectionId): void
  size(): number
  sendTo(id: ConnectionId, payload: string): void
  broadcast(predicate: (id: ConnectionId) => boolean, payload: string): void
  forEach(fn: (id: ConnectionId, socket: WebSocket) => void): void
}

export function createConnectionRegistry(): ConnectionRegistry {
  const sockets = new Map<ConnectionId, WebSocket>()
  return {
    register(socket) {
      const id = ulid()
      sockets.set(id, socket)
      return id
    },
    unregister(id) {
      sockets.delete(id)
    },
    size() {
      return sockets.size
    },
    sendTo(id, payload) {
      const s = sockets.get(id)
      if (s && s.readyState === OPEN) s.send(payload)
    },
    broadcast(predicate, payload) {
      for (const [id, s] of sockets) {
        if (s.readyState === OPEN && predicate(id)) s.send(payload)
      }
    },
    forEach(fn) {
      for (const [id, s] of sockets) fn(id, s)
    },
  }
}
```

- [ ] **Step 5: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/connections.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 6: Extend `daemons/dycoded/src/ipc/server.ts` — replace the file**

```ts
import { Hono } from 'hono'
import { serve, type ServerType } from '@hono/node-server'
import { WebSocketServer, type WebSocket } from 'ws'
import type { Db } from '../persistence/db.js'
import type { Logger } from '../logger.js'
import { DYCODED_VERSION } from '../version.js'
import { extractBearerToken, timingSafeEqual } from './auth-middleware.js'
import { createConnectionRegistry, type ConnectionRegistry } from './connections.js'

export interface IpcServerOptions {
  db: Db
  logger: Logger
  bearerToken: string
  port: number
  host: string
}

export interface IpcServerHandle {
  port: number
  host: string
  connections: ConnectionRegistry
  close: () => Promise<void>
}

export function startIpcServer(opts: IpcServerOptions): Promise<IpcServerHandle> {
  const app = new Hono()
  app.get('/health', (c) =>
    c.json({ ok: true, daemonVersion: DYCODED_VERSION, ts: Date.now() }),
  )

  const connections = createConnectionRegistry()

  return new Promise((resolve, reject) => {
    let server: ServerType | undefined
    let wss: WebSocketServer | undefined
    try {
      server = serve(
        { fetch: app.fetch, port: opts.port, hostname: opts.host },
        (info) => {
          wss = new WebSocketServer({ noServer: true })
          server!.on('upgrade', (req, socket, head) => {
            if (req.url === undefined || !req.url.startsWith('/ws')) {
              socket.destroy()
              return
            }
            const token = extractBearerToken(req)
            if (token === null || !timingSafeEqual(token, opts.bearerToken)) {
              socket.write(
                'HTTP/1.1 401 Unauthorized\r\n' +
                  'Connection: close\r\n' +
                  'Content-Length: 0\r\n\r\n',
              )
              socket.destroy()
              return
            }
            wss!.handleUpgrade(req, socket, head, (ws: WebSocket) => {
              const id = connections.register(ws)
              opts.logger.debug({ connectionId: id }, 'ws client connected')
              ws.on('close', () => {
                connections.unregister(id)
                opts.logger.debug({ connectionId: id }, 'ws client disconnected')
              })
              ws.on('error', (err) =>
                opts.logger.warn({ connectionId: id, err }, 'ws error'),
              )
            })
          })
          opts.logger.info(
            { port: info.port, host: opts.host },
            'dycoded ipc server listening',
          )
          resolve({
            port: info.port,
            host: opts.host,
            connections,
            close: () =>
              new Promise<void>((res, rej) => {
                wss?.clients.forEach((c) => c.terminate())
                wss?.close()
                if (!server) return res()
                server.close((err) => (err ? rej(err) : res()))
              }),
          })
        },
      )
      server.on('error', reject)
    } catch (err) {
      reject(err)
    }
  })
}
```

- [ ] **Step 7: Extend `daemons/dycoded/tests/ipc/server.test.ts` — append WS auth coverage**

Append the following inside the `describe('ipc/server', ...)` block (after the existing `it` blocks):

```ts
  it('rejects /ws upgrade with no token (HTTP 401)', async () => {
    const h = await startTestServer()
    const WebSocket = (await import('ws')).default
    const ws = new WebSocket(`ws://127.0.0.1:${h.port}/ws`)
    const status = await new Promise<number>((resolve) => {
      ws.once('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0))
      ws.once('open', () => resolve(200))
    })
    expect(status).toBe(401)
    ws.terminate()
  })

  it('rejects /ws upgrade with wrong token (HTTP 401)', async () => {
    const h = await startTestServer()
    const WebSocket = (await import('ws')).default
    const ws = new WebSocket(`ws://127.0.0.1:${h.port}/ws?token=wrong`)
    const status = await new Promise<number>((resolve) => {
      ws.once('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0))
      ws.once('open', () => resolve(200))
    })
    expect(status).toBe(401)
    ws.terminate()
  })

  it('accepts /ws upgrade with correct token (Authorization header)', async () => {
    const h = await startTestServer()
    const WebSocket = (await import('ws')).default
    const ws = new WebSocket(`ws://127.0.0.1:${h.port}/ws`, {
      headers: { Authorization: 'Bearer tok-abc' },
    })
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve())
      ws.once('error', reject)
    })
    expect(h.connections.size()).toBe(1)
    ws.close()
    await new Promise((r) => setTimeout(r, 50))
    expect(h.connections.size()).toBe(0)
  })

  it('accepts /ws upgrade with correct token (?token query)', async () => {
    const h = await startTestServer()
    const WebSocket = (await import('ws')).default
    const ws = new WebSocket(`ws://127.0.0.1:${h.port}/ws?token=tok-abc`)
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve())
      ws.once('error', reject)
    })
    ws.close()
  })
```

- [ ] **Step 8: Run server tests (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/server.test.ts
```

Expected: PASS, 7 tests (3 from Task 13 + 4 new).

- [ ] **Step 9: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 10: Commit**

```bash
git add daemons/dycoded/src/ipc/auth-middleware.ts daemons/dycoded/src/ipc/connections.ts daemons/dycoded/src/ipc/server.ts daemons/dycoded/tests/ipc/connections.test.ts daemons/dycoded/tests/ipc/server.test.ts
git commit -m "feat(dycoded): add WS upgrade with bearer auth and connection registry"
```

---

### Task 15 · JSON-RPC dispatcher + error mapper

**Files:**
- Create: `daemons/dycoded/src/ipc/error-mapper.ts`
- Create: `daemons/dycoded/src/ipc/dispatcher.ts`
- Create: `daemons/dycoded/tests/ipc/error-mapper.test.ts`
- Create: `daemons/dycoded/tests/ipc/dispatcher.test.ts`

The dispatcher takes a raw incoming string, validates the envelope against `JsonRpcRequestEnvelopeSchema`, looks up the handler by `method`, validates `params`, runs the handler, validates the result, and returns the response envelope. Every failure path maps to a `JsonRpcError` with the correct numeric code from `@dycode/contracts`.

- [ ] **Step 1: Write the failing error-mapper test `daemons/dycoded/tests/ipc/error-mapper.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { ERROR_CODE } from '@dycode/contracts'
import { ZodError, z } from 'zod'
import { mapError } from '../../src/ipc/error-mapper.js'

describe('ipc/error-mapper', () => {
  it('maps a ZodError to INVALID_PARAMS with issue details', () => {
    let zerr: ZodError
    try {
      z.object({ a: z.string() }).parse({ a: 1 })
      throw new Error('should not reach')
    } catch (err) {
      zerr = err as ZodError
    }
    const e = mapError(zerr)
    expect(e.code).toBe(ERROR_CODE.INVALID_PARAMS)
    expect(typeof e.message).toBe('string')
    expect(Array.isArray((e.data as { issues: unknown[] }).issues)).toBe(true)
  })

  it('maps a plain Error to INTERNAL_ERROR with the message preserved', () => {
    const e = mapError(new Error('boom'))
    expect(e.code).toBe(ERROR_CODE.INTERNAL_ERROR)
    expect(e.message).toBe('boom')
  })

  it('maps a known dycode error code passthrough via DycodeRpcError', async () => {
    const { DycodeRpcError } = await import('../../src/ipc/error-mapper.js')
    const e = mapError(
      new DycodeRpcError(ERROR_CODE.WORKSPACE_NOT_FOUND, 'no such workspace', {
        workspaceId: 'ws_X',
      }),
    )
    expect(e.code).toBe(ERROR_CODE.WORKSPACE_NOT_FOUND)
    expect(e.message).toBe('no such workspace')
    expect((e.data as { workspaceId: string }).workspaceId).toBe('ws_X')
  })

  it('maps unknown (non-Error throw) to INTERNAL_ERROR with stringified value', () => {
    const e = mapError('something weird')
    expect(e.code).toBe(ERROR_CODE.INTERNAL_ERROR)
    expect(e.message).toContain('something weird')
  })
})
```

- [ ] **Step 2: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/error-mapper.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write `daemons/dycoded/src/ipc/error-mapper.ts`**

```ts
import { ZodError } from 'zod'
import { ERROR_CODE, type ErrorCode, type JsonRpcError } from '@dycode/contracts'

/**
 * Thrown by IPC method handlers to surface a specific dycode error
 * code. Anything else thrown maps to INTERNAL_ERROR.
 */
export class DycodeRpcError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message)
    this.name = 'DycodeRpcError'
  }
}

export function mapError(err: unknown): JsonRpcError {
  if (err instanceof DycodeRpcError) {
    return err.data === undefined
      ? { code: err.code, message: err.message }
      : { code: err.code, message: err.message, data: err.data }
  }
  if (err instanceof ZodError) {
    return {
      code: ERROR_CODE.INVALID_PARAMS,
      message: 'params failed validation',
      data: { issues: err.issues },
    }
  }
  if (err instanceof Error) {
    return { code: ERROR_CODE.INTERNAL_ERROR, message: err.message }
  }
  return {
    code: ERROR_CODE.INTERNAL_ERROR,
    message: `non-error thrown: ${String(err)}`,
  }
}
```

- [ ] **Step 4: Run error-mapper test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/error-mapper.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing dispatcher test `daemons/dycoded/tests/ipc/dispatcher.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { ERROR_CODE } from '@dycode/contracts'
import { z } from 'zod'
import { createDispatcher, type RpcMethodHandler } from '../../src/ipc/dispatcher.js'

const echoHandler: RpcMethodHandler = {
  params: z.object({ msg: z.string() }).strict(),
  result: z.object({ echoed: z.string() }).strict(),
  handle: async ({ params }) => ({ echoed: (params as { msg: string }).msg }),
}

const failingHandler: RpcMethodHandler = {
  params: z.object({}).strict(),
  result: z.object({}).strict(),
  handle: async () => {
    throw new Error('handler exploded')
  },
}

function makeDispatcher(extra: Record<string, RpcMethodHandler> = {}) {
  return createDispatcher({
    methods: {
      'echo.say': echoHandler,
      'echo.fail': failingHandler,
      ...extra,
    },
  })
}

describe('ipc/dispatcher', () => {
  it('routes a valid request to its handler and validates the result', async () => {
    const d = makeDispatcher()
    const res = await d.handle({
      raw: JSON.stringify({
        jsonrpc: '2.0',
        id: '01',
        method: 'echo.say',
        params: { msg: 'hi' },
        protocolVersion: 1,
      }),
      connectionId: 'c1',
    })
    expect(res).toEqual({
      jsonrpc: '2.0',
      id: '01',
      result: { echoed: 'hi' },
    })
  })

  it('returns PARSE_ERROR on non-JSON input', async () => {
    const d = makeDispatcher()
    const res = await d.handle({ raw: '{not json', connectionId: 'c1' })
    expect(res.error?.code).toBe(ERROR_CODE.PARSE_ERROR)
  })

  it('returns INVALID_REQUEST on a malformed envelope', async () => {
    const d = makeDispatcher()
    const res = await d.handle({
      raw: JSON.stringify({ jsonrpc: '1.0', method: 'x' }),
      connectionId: 'c1',
    })
    expect(res.error?.code).toBe(ERROR_CODE.INVALID_REQUEST)
  })

  it('returns PROTOCOL_VERSION_MISMATCH when protocolVersion != 1', async () => {
    const d = makeDispatcher()
    const res = await d.handle({
      raw: JSON.stringify({
        jsonrpc: '2.0',
        id: '02',
        method: 'echo.say',
        params: { msg: 'hi' },
        protocolVersion: 2,
      }),
      connectionId: 'c1',
    })
    expect(res.error?.code).toBe(ERROR_CODE.PROTOCOL_VERSION_MISMATCH)
  })

  it('returns METHOD_NOT_FOUND for unknown method', async () => {
    const d = makeDispatcher()
    const res = await d.handle({
      raw: JSON.stringify({
        jsonrpc: '2.0',
        id: '03',
        method: 'no.such.method',
        params: {},
        protocolVersion: 1,
      }),
      connectionId: 'c1',
    })
    expect(res.error?.code).toBe(ERROR_CODE.METHOD_NOT_FOUND)
  })

  it('returns INVALID_PARAMS when params fail the handler schema', async () => {
    const d = makeDispatcher()
    const res = await d.handle({
      raw: JSON.stringify({
        jsonrpc: '2.0',
        id: '04',
        method: 'echo.say',
        params: { msg: 42 },
        protocolVersion: 1,
      }),
      connectionId: 'c1',
    })
    expect(res.error?.code).toBe(ERROR_CODE.INVALID_PARAMS)
  })

  it('returns INTERNAL_ERROR when the handler throws', async () => {
    const d = makeDispatcher()
    const res = await d.handle({
      raw: JSON.stringify({
        jsonrpc: '2.0',
        id: '05',
        method: 'echo.fail',
        params: {},
        protocolVersion: 1,
      }),
      connectionId: 'c1',
    })
    expect(res.error?.code).toBe(ERROR_CODE.INTERNAL_ERROR)
    expect(res.error?.message).toContain('handler exploded')
  })
})
```

- [ ] **Step 6: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/dispatcher.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 7: Write `daemons/dycoded/src/ipc/dispatcher.ts`**

```ts
import { z, type ZodTypeAny } from 'zod'
import {
  ERROR_CODE,
  JsonRpcRequestEnvelopeSchema,
  type JsonRpcError,
  type JsonRpcResponseEnvelope,
} from '@dycode/contracts'
import { DycodeRpcError, mapError } from './error-mapper.js'

export interface RpcMethodContext {
  connectionId: string
  params: unknown
}

export interface RpcMethodHandler {
  params: ZodTypeAny
  result: ZodTypeAny
  handle: (ctx: RpcMethodContext) => Promise<unknown> | unknown
}

export interface DispatcherOptions {
  methods: Record<string, RpcMethodHandler>
}

export interface DispatcherInput {
  raw: string
  connectionId: string
}

export interface Dispatcher {
  handle(input: DispatcherInput): Promise<JsonRpcResponseEnvelope>
}

function errorResponse(id: string, error: JsonRpcError): JsonRpcResponseEnvelope {
  return { jsonrpc: '2.0', id, error }
}

const FALLBACK_ID = '0'

export function createDispatcher(opts: DispatcherOptions): Dispatcher {
  const methods = opts.methods

  return {
    async handle({ raw, connectionId }) {
      // 1. Parse JSON
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch (err) {
        return errorResponse(FALLBACK_ID, {
          code: ERROR_CODE.PARSE_ERROR,
          message: (err as Error).message,
        })
      }

      // 2. Validate envelope shape
      const env = JsonRpcRequestEnvelopeSchema.safeParse(parsed)
      if (!env.success) {
        const candidateId =
          typeof (parsed as { id?: unknown }).id === 'string'
            ? (parsed as { id: string }).id
            : FALLBACK_ID
        return errorResponse(candidateId, {
          code: ERROR_CODE.INVALID_REQUEST,
          message: 'envelope failed validation',
          data: { issues: env.error.issues },
        })
      }
      const req = env.data

      // 3. Protocol version
      if (req.protocolVersion !== 1) {
        return errorResponse(req.id, {
          code: ERROR_CODE.PROTOCOL_VERSION_MISMATCH,
          message: `unsupported protocolVersion: ${String(req.protocolVersion)}`,
          data: { supported: [1] },
        })
      }

      // 4. Method lookup
      const handler = methods[req.method]
      if (!handler) {
        return errorResponse(req.id, {
          code: ERROR_CODE.METHOD_NOT_FOUND,
          message: `unknown method: ${req.method}`,
        })
      }

      // 5. Validate params
      const paramsRes = handler.params.safeParse(req.params ?? {})
      if (!paramsRes.success) {
        return errorResponse(req.id, mapError(paramsRes.error))
      }

      // 6. Run handler
      try {
        const out = await handler.handle({ connectionId, params: paramsRes.data })
        const resultRes = handler.result.safeParse(out)
        if (!resultRes.success) {
          // Handler returned an internally-inconsistent value — that's a bug,
          // surface as INTERNAL_ERROR with details.
          return errorResponse(req.id, {
            code: ERROR_CODE.INTERNAL_ERROR,
            message: 'handler result failed validation',
            data: { issues: resultRes.error.issues },
          })
        }
        return { jsonrpc: '2.0', id: req.id, result: resultRes.data }
      } catch (err) {
        // Bubble DycodeRpcError verbatim; map everything else.
        if (err instanceof DycodeRpcError) {
          return errorResponse(req.id, mapError(err))
        }
        return errorResponse(req.id, mapError(err))
      }
    },
  }
}

// Re-export helpers so handler authors don't need a second import.
export { DycodeRpcError, mapError }
export { z }
```

- [ ] **Step 8: Run dispatcher test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/dispatcher.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 9: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 10: Commit**

```bash
git add daemons/dycoded/src/ipc/error-mapper.ts daemons/dycoded/src/ipc/dispatcher.ts daemons/dycoded/tests/ipc/error-mapper.test.ts daemons/dycoded/tests/ipc/dispatcher.test.ts
git commit -m "feat(dycoded): add JSON-RPC dispatcher with envelope validation and error mapping"
```

---

### Task 16 · Subscription registry (filter-matching broadcaster)

**Files:**
- Create: `daemons/dycoded/src/ipc/subscriptions.ts`
- Create: `daemons/dycoded/tests/ipc/subscriptions.test.ts`

A subscription is `{ subscriptionId, connectionId, filter: { workspaceId?, taskId?, agentId? } }`. When the daemon emits an event, the registry computes which subscriptions match and returns the unique connection ids that should receive it. The dispatcher / server tasks (Task 14, Task 17) hand those ids to `connections.sendTo`.

- [ ] **Step 1: Write the failing test `daemons/dycoded/tests/ipc/subscriptions.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { WorkspaceIdSchema, AgentIdSchema, TaskIdSchema } from '@dycode/contracts'
import {
  createSubscriptionRegistry,
  type EventFilter,
} from '../../src/ipc/subscriptions.js'

const WS_A = WorkspaceIdSchema.parse('ws_01ARZ3NDEKTSV4RRFFQ69G5AAA')
const WS_B = WorkspaceIdSchema.parse('ws_01ARZ3NDEKTSV4RRFFQ69G5BBB')
const T_X = TaskIdSchema.parse('tk_01ARZ3NDEKTSV4RRFFQ69G5XXX')
const AG_1 = AgentIdSchema.parse('ag_01ARZ3NDEKTSV4RRFFQ69G5111')

describe('ipc/subscriptions', () => {
  it('subscribe returns a unique subscriptionId tied to a connection', () => {
    const r = createSubscriptionRegistry()
    const a = r.subscribe('c1', {})
    const b = r.subscribe('c1', {})
    expect(a).not.toBe(b)
  })

  it('unsubscribe removes a subscription and is idempotent', () => {
    const r = createSubscriptionRegistry()
    const id = r.subscribe('c1', {})
    expect(r.unsubscribe(id)).toBe(true)
    expect(r.unsubscribe(id)).toBe(false)
  })

  it('unsubscribeConnection removes every subscription owned by a connection', () => {
    const r = createSubscriptionRegistry()
    r.subscribe('c1', {})
    r.subscribe('c1', {})
    r.subscribe('c2', {})
    const removed = r.unsubscribeConnection('c1')
    expect(removed).toBe(2)
  })

  it('an empty filter matches every event (workspace-anchored)', () => {
    const r = createSubscriptionRegistry()
    r.subscribe('c1', {})
    const targets = r.targetsFor({
      workspaceId: WS_A,
      taskId: null,
      agentId: null,
    })
    expect(targets).toEqual(['c1'])
  })

  it('workspaceId filter narrows to its workspace', () => {
    const r = createSubscriptionRegistry()
    r.subscribe('c1', { workspaceId: WS_A } satisfies EventFilter)
    r.subscribe('c2', { workspaceId: WS_B } satisfies EventFilter)
    const targets = r.targetsFor({
      workspaceId: WS_A,
      taskId: null,
      agentId: null,
    })
    expect(targets).toEqual(['c1'])
  })

  it('returns each connection at most once even with multiple matching subs', () => {
    const r = createSubscriptionRegistry()
    r.subscribe('c1', {})
    r.subscribe('c1', { workspaceId: WS_A } satisfies EventFilter)
    r.subscribe('c1', { taskId: T_X } satisfies EventFilter)
    const targets = r.targetsFor({
      workspaceId: WS_A,
      taskId: T_X,
      agentId: null,
    })
    expect(targets).toEqual(['c1'])
  })

  it('taskId/agentId filters require the event to carry that id', () => {
    const r = createSubscriptionRegistry()
    r.subscribe('c1', { taskId: T_X } satisfies EventFilter)
    r.subscribe('c2', { agentId: AG_1 } satisfies EventFilter)
    // Event with no task/agent matches neither
    expect(
      r.targetsFor({ workspaceId: WS_A, taskId: null, agentId: null }),
    ).toEqual([])
    // Event with task only
    expect(
      r.targetsFor({ workspaceId: WS_A, taskId: T_X, agentId: null }).sort(),
    ).toEqual(['c1'])
    // Event with agent only
    expect(
      r.targetsFor({ workspaceId: WS_A, taskId: null, agentId: AG_1 }).sort(),
    ).toEqual(['c2'])
  })
})
```

- [ ] **Step 2: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/subscriptions.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write `daemons/dycoded/src/ipc/subscriptions.ts`**

```ts
import { ulid } from 'ulid'
import type { AgentId, TaskId, WorkspaceId } from '@dycode/contracts'

export interface EventFilter {
  workspaceId?: WorkspaceId
  taskId?: TaskId
  agentId?: AgentId
}

export interface EventTarget {
  workspaceId: WorkspaceId
  taskId: TaskId | null
  agentId: AgentId | null
}

interface SubscriptionRecord {
  subscriptionId: string
  connectionId: string
  filter: EventFilter
}

export interface SubscriptionRegistry {
  subscribe(connectionId: string, filter: EventFilter): string
  unsubscribe(subscriptionId: string): boolean
  unsubscribeConnection(connectionId: string): number
  targetsFor(event: EventTarget): string[]
}

function filterMatches(filter: EventFilter, event: EventTarget): boolean {
  if (filter.workspaceId !== undefined && filter.workspaceId !== event.workspaceId) {
    return false
  }
  if (filter.taskId !== undefined && filter.taskId !== event.taskId) {
    return false
  }
  if (filter.agentId !== undefined && filter.agentId !== event.agentId) {
    return false
  }
  return true
}

export function createSubscriptionRegistry(): SubscriptionRegistry {
  const subs = new Map<string, SubscriptionRecord>()

  return {
    subscribe(connectionId, filter) {
      const subscriptionId = ulid()
      subs.set(subscriptionId, { subscriptionId, connectionId, filter })
      return subscriptionId
    },
    unsubscribe(subscriptionId) {
      return subs.delete(subscriptionId)
    },
    unsubscribeConnection(connectionId) {
      let removed = 0
      for (const [id, rec] of subs) {
        if (rec.connectionId === connectionId) {
          subs.delete(id)
          removed++
        }
      }
      return removed
    },
    targetsFor(event) {
      const out = new Set<string>()
      for (const rec of subs.values()) {
        if (filterMatches(rec.filter, event)) out.add(rec.connectionId)
      }
      return [...out]
    },
  }
}
```

- [ ] **Step 4: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/subscriptions.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/ipc/subscriptions.ts daemons/dycoded/tests/ipc/subscriptions.test.ts
git commit -m "feat(dycoded): add filter-matching subscription registry"
```

---

### Task 17 · `workspace.add` handler + event bus

**Files:**
- Create: `daemons/dycoded/src/event-bus.ts`
- Create: `daemons/dycoded/src/ipc/handlers/workspace.ts`
- Create: `daemons/dycoded/tests/event-bus.test.ts`
- Create: `daemons/dycoded/tests/ipc/handlers/workspace.test.ts`

The event bus is the single entry point for "something happened" — it appends to the event log, then fans out `event.appended` notifications to every connection whose subscription matches. Workspace lifecycle events are encoded as adapter events of kind `output` with a structured `kind` discriminator in the payload (`workspace.added`, `workspace.activated`, `workspace.removed`). This keeps Plan 03 inside the contracts schema; Plan 04 will refine the event taxonomy when adapters land.

- [ ] **Step 1: Write the failing event-bus test `daemons/dycoded/tests/event-bus.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { openDatabase, closeDatabase } from '../src/persistence/db.js'
import { ALL_MIGRATIONS, runMigrations } from '../src/persistence/migrate.js'
import { createWorkspaceRepo } from '../src/persistence/workspace-repo.js'
import { createEventLogRepo } from '../src/persistence/event-log-repo.js'
import { createConnectionRegistry } from '../src/ipc/connections.js'
import { createSubscriptionRegistry } from '../src/ipc/subscriptions.js'
import { createEventBus } from '../src/event-bus.js'

function freshBus() {
  const db = openDatabase(':memory:')
  runMigrations(db, ALL_MIGRATIONS)
  const workspaces = createWorkspaceRepo(db)
  const eventLog = createEventLogRepo(db)
  const connections = createConnectionRegistry()
  const subscriptions = createSubscriptionRegistry()
  const bus = createEventBus({ eventLog, subscriptions, connections })
  const ws = workspaces.insert({ name: 'demo', rootPath: '/tmp/demo' })
  return { db, bus, workspaces, eventLog, subscriptions, connections, wsId: ws.id }
}

describe('event-bus', () => {
  it('emit appends to the event log and returns the persisted entry', () => {
    const { db, bus, eventLog, wsId } = freshBus()
    try {
      const entry = bus.emit({
        workspaceId: wsId,
        taskId: null,
        agentId: null,
        type: 'output',
        payload: { kind: 'workspace.added', workspaceId: wsId, name: 'demo' },
      })
      expect(entry.workspaceId).toBe(wsId)
      const page = eventLog.queryByWorkspace({ workspaceId: wsId })
      expect(page.events.length).toBe(1)
      expect(page.events[0]?.id).toBe(entry.id)
    } finally {
      closeDatabase(db)
    }
  })

  it('fans out event.appended notifications to matching subscribers', () => {
    const { db, bus, subscriptions, connections, wsId } = freshBus()
    try {
      const sent: string[] = []
      const fakeSocket = {
        readyState: 1,
        send: (msg: string) => sent.push(msg),
      }
      const connId = connections.register(fakeSocket as never)
      subscriptions.subscribe(connId, { workspaceId: wsId })
      bus.emit({
        workspaceId: wsId,
        taskId: null,
        agentId: null,
        type: 'output',
        payload: { kind: 'workspace.added', workspaceId: wsId },
      })
      expect(sent.length).toBe(1)
      const parsed = JSON.parse(sent[0]!) as {
        jsonrpc: string
        method: string
        params: { workspaceId: string }
      }
      expect(parsed.jsonrpc).toBe('2.0')
      expect(parsed.method).toBe('event.appended')
      expect(parsed.params.workspaceId).toBe(wsId)
    } finally {
      closeDatabase(db)
    }
  })

  it('does not notify connections whose filter excludes the event', () => {
    const { db, bus, subscriptions, connections, wsId } = freshBus()
    try {
      const sent: string[] = []
      const sock = {
        readyState: 1,
        send: (m: string) => sent.push(m),
      }
      const connId = connections.register(sock as never)
      const otherWs = wsId.replace(/.$/, 'Z')
      subscriptions.subscribe(connId, { workspaceId: otherWs as typeof wsId })
      bus.emit({
        workspaceId: wsId,
        taskId: null,
        agentId: null,
        type: 'output',
        payload: { kind: 'workspace.added', workspaceId: wsId },
      })
      expect(sent.length).toBe(0)
    } finally {
      closeDatabase(db)
    }
  })
})
```

- [ ] **Step 2: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/event-bus.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write `daemons/dycoded/src/event-bus.ts`**

```ts
import { EventAppendedNotificationSchema, type EventLogEntry } from '@dycode/contracts'
import type {
  AppendInput,
  EventLogRepository,
} from './persistence/event-log-repo.js'
import type { ConnectionRegistry } from './ipc/connections.js'
import type { SubscriptionRegistry } from './ipc/subscriptions.js'

export interface EventBus {
  emit(input: AppendInput): EventLogEntry
}

export interface EventBusDeps {
  eventLog: EventLogRepository
  subscriptions: SubscriptionRegistry
  connections: ConnectionRegistry
}

export function createEventBus(deps: EventBusDeps): EventBus {
  return {
    emit(input) {
      const entry = deps.eventLog.append(input)
      const notification = EventAppendedNotificationSchema.parse({
        jsonrpc: '2.0',
        method: 'event.appended',
        params: entry,
      })
      const payload = JSON.stringify(notification)
      const targets = deps.subscriptions.targetsFor({
        workspaceId: entry.workspaceId,
        taskId: entry.taskId,
        agentId: entry.agentId,
      })
      for (const connectionId of targets) {
        deps.connections.sendTo(connectionId, payload)
      }
      return entry
    },
  }
}
```

- [ ] **Step 4: Run the event-bus test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/event-bus.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing handler test `daemons/dycoded/tests/ipc/handlers/workspace.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { workspace_add_paramsSchema } from '@dycode/contracts'
import { openDatabase, closeDatabase } from '../../../src/persistence/db.js'
import { ALL_MIGRATIONS, runMigrations } from '../../../src/persistence/migrate.js'
import { createWorkspaceRepo } from '../../../src/persistence/workspace-repo.js'
import { createEventLogRepo } from '../../../src/persistence/event-log-repo.js'
import { createConnectionRegistry } from '../../../src/ipc/connections.js'
import { createSubscriptionRegistry } from '../../../src/ipc/subscriptions.js'
import { createEventBus } from '../../../src/event-bus.js'
import { makeWorkspaceHandlers } from '../../../src/ipc/handlers/workspace.js'

function freshContext() {
  const db = openDatabase(':memory:')
  runMigrations(db, ALL_MIGRATIONS)
  const workspaces = createWorkspaceRepo(db)
  const eventLog = createEventLogRepo(db)
  const connections = createConnectionRegistry()
  const subscriptions = createSubscriptionRegistry()
  const eventBus = createEventBus({ eventLog, subscriptions, connections })
  const handlers = makeWorkspaceHandlers({ workspaces, eventBus })
  return { db, handlers, workspaces, eventLog, connections, subscriptions, eventBus }
}

describe('handlers/workspace.add', () => {
  it('inserts a workspace and returns it under the result envelope', async () => {
    const { db, handlers, workspaces } = freshContext()
    try {
      const params = workspace_add_paramsSchema.parse({
        name: 'demo',
        rootPath: '/tmp/demo',
      })
      const out = await handlers['workspace.add']!.handle({
        connectionId: 'c1',
        params,
      })
      expect((out as { workspace: { name: string } }).workspace.name).toBe('demo')
      expect(workspaces.list().length).toBe(1)
    } finally {
      closeDatabase(db)
    }
  })

  it('appends an event_log entry and notifies subscribers', async () => {
    const { db, handlers, eventLog, subscriptions, connections } = freshContext()
    try {
      const sent: string[] = []
      const sock = { readyState: 1, send: (m: string) => sent.push(m) }
      const connId = connections.register(sock as never)
      // empty filter — receive everything
      subscriptions.subscribe(connId, {})
      await handlers['workspace.add']!.handle({
        connectionId: 'c1',
        params: { name: 'demo', rootPath: '/tmp/demo' },
      })
      expect(sent.length).toBe(1)
      const notice = JSON.parse(sent[0]!) as {
        method: string
        params: { type: string; payload: { kind: string } }
      }
      expect(notice.method).toBe('event.appended')
      expect(notice.params.type).toBe('output')
      expect(notice.params.payload.kind).toBe('workspace.added')
      // Persisted to event_log too
      const ws = (
        await (async () => {
          const list = (
            await handlers['workspace.add']!.handle({
              connectionId: 'c1',
              params: { name: 'second', rootPath: '/tmp/second' },
            })
          ) as { workspace: { id: string } }
          return list.workspace
        })()
      )
      const page = eventLog.queryByWorkspace({ workspaceId: ws.id as never })
      expect(page.events[0]?.payload).toMatchObject({ kind: 'workspace.added' })
    } finally {
      closeDatabase(db)
    }
  })

  it('rejects a non-absolute rootPath via params schema (caught by dispatcher in prod)', () => {
    const { db, handlers } = freshContext()
    try {
      const parse = handlers['workspace.add']!.params.safeParse({
        name: 'demo',
        rootPath: 'not-absolute',
      })
      expect(parse.success).toBe(false)
    } finally {
      closeDatabase(db)
    }
  })
})
```

- [ ] **Step 6: Run the handler test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/handlers/workspace.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 7: Write `daemons/dycoded/src/ipc/handlers/workspace.ts` (workspace.add only — Task 18 fills in the rest)**

```ts
import {
  workspace_add_paramsSchema,
  workspace_add_resultSchema,
} from '@dycode/contracts'
import type { WorkspaceRepository } from '../../persistence/workspace-repo.js'
import type { EventBus } from '../../event-bus.js'
import type { RpcMethodHandler } from '../dispatcher.js'

export interface WorkspaceHandlerDeps {
  workspaces: WorkspaceRepository
  eventBus: EventBus
}

export function makeWorkspaceHandlers(
  deps: WorkspaceHandlerDeps,
): Record<string, RpcMethodHandler> {
  return {
    'workspace.add': {
      params: workspace_add_paramsSchema,
      result: workspace_add_resultSchema,
      handle: async ({ params }) => {
        const input = params as { name: string; rootPath: string }
        const workspace = deps.workspaces.insert(input)
        deps.eventBus.emit({
          workspaceId: workspace.id,
          taskId: null,
          agentId: null,
          type: 'output',
          payload: {
            kind: 'workspace.added',
            workspaceId: workspace.id,
            name: workspace.name,
            rootPath: workspace.rootPath,
          },
        })
        return { workspace }
      },
    },
  }
}
```

- [ ] **Step 8: Run the handler test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/handlers/workspace.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 9: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 10: Commit**

```bash
git add daemons/dycoded/src/event-bus.ts daemons/dycoded/src/ipc/handlers/workspace.ts daemons/dycoded/tests/event-bus.test.ts daemons/dycoded/tests/ipc/handlers/workspace.test.ts
git commit -m "feat(dycoded): add event bus and workspace.add handler"
```

---

### Task 18 · `workspace.list` / `workspace.activate` / `workspace.remove` handlers

**Files:**
- Modify: `daemons/dycoded/src/ipc/handlers/workspace.ts` (add three handlers)
- Modify: `daemons/dycoded/tests/ipc/handlers/workspace.test.ts` (append coverage)

`workspace.list` is a pure read (no event). `workspace.activate` updates `last_active_at` and emits `workspace.activated`. `workspace.remove` deletes the workspace; the FK cascade purges its event_log rows, so we emit the `workspace.removed` event *before* deletion so the notification still reaches subscribers.

- [ ] **Step 1: Append the failing tests to `daemons/dycoded/tests/ipc/handlers/workspace.test.ts`**

Add these describe blocks after the existing `handlers/workspace.add` block:

```ts
describe('handlers/workspace.list', () => {
  it('returns workspaces ordered most-recent first', async () => {
    const { db, handlers } = freshContext()
    try {
      await handlers['workspace.add']!.handle({
        connectionId: 'c1',
        params: { name: 'a', rootPath: '/tmp/a' },
      })
      await handlers['workspace.add']!.handle({
        connectionId: 'c1',
        params: { name: 'b', rootPath: '/tmp/b' },
      })
      const out = (await handlers['workspace.list']!.handle({
        connectionId: 'c1',
        params: {},
      })) as { workspaces: Array<{ name: string }> }
      expect(out.workspaces.map((w) => w.name)).toEqual(['b', 'a'])
    } finally {
      closeDatabase(db)
    }
  })
})

describe('handlers/workspace.activate', () => {
  it('advances last_active_at and emits workspace.activated', async () => {
    const { db, handlers, connections, subscriptions } = freshContext()
    try {
      const sent: string[] = []
      const sock = { readyState: 1, send: (m: string) => sent.push(m) }
      const connId = connections.register(sock as never)
      subscriptions.subscribe(connId, {})

      const added = (await handlers['workspace.add']!.handle({
        connectionId: 'c1',
        params: { name: 'demo', rootPath: '/tmp/demo' },
      })) as { workspace: { id: string; lastActiveAt: number } }

      await new Promise((r) => setTimeout(r, 5))
      const before = added.workspace.lastActiveAt
      sent.length = 0

      const ok = (await handlers['workspace.activate']!.handle({
        connectionId: 'c1',
        params: { workspaceId: added.workspace.id },
      })) as { ok: true }
      expect(ok.ok).toBe(true)

      const list = (await handlers['workspace.list']!.handle({
        connectionId: 'c1',
        params: {},
      })) as { workspaces: Array<{ id: string; lastActiveAt: number }> }
      const updated = list.workspaces.find((w) => w.id === added.workspace.id)
      expect(updated!.lastActiveAt).toBeGreaterThan(before)

      expect(sent.length).toBe(1)
      const notice = JSON.parse(sent[0]!) as {
        params: { payload: { kind: string } }
      }
      expect(notice.params.payload.kind).toBe('workspace.activated')
    } finally {
      closeDatabase(db)
    }
  })

  it('throws WORKSPACE_NOT_FOUND for an unknown id', async () => {
    const { db, handlers } = freshContext()
    try {
      const fakeId = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'
      await expect(
        handlers['workspace.activate']!.handle({
          connectionId: 'c1',
          params: { workspaceId: fakeId },
        }),
      ).rejects.toThrow(/not found/i)
    } finally {
      closeDatabase(db)
    }
  })
})

describe('handlers/workspace.remove', () => {
  it('deletes the workspace and emits workspace.removed first', async () => {
    const { db, handlers, workspaces, connections, subscriptions } = freshContext()
    try {
      const sent: string[] = []
      const sock = { readyState: 1, send: (m: string) => sent.push(m) }
      const connId = connections.register(sock as never)
      subscriptions.subscribe(connId, {})

      const added = (await handlers['workspace.add']!.handle({
        connectionId: 'c1',
        params: { name: 'demo', rootPath: '/tmp/demo' },
      })) as { workspace: { id: string } }
      sent.length = 0

      const ok = (await handlers['workspace.remove']!.handle({
        connectionId: 'c1',
        params: { workspaceId: added.workspace.id },
      })) as { ok: true }
      expect(ok.ok).toBe(true)
      expect(workspaces.list().length).toBe(0)

      // The 'workspace.removed' notification was emitted; FK cascade then
      // purged the event log, so subscribers see exactly one removed event.
      expect(sent.length).toBe(1)
      const notice = JSON.parse(sent[0]!) as {
        params: { payload: { kind: string } }
      }
      expect(notice.params.payload.kind).toBe('workspace.removed')
    } finally {
      closeDatabase(db)
    }
  })

  it('throws WORKSPACE_NOT_FOUND for an unknown id', async () => {
    const { db, handlers } = freshContext()
    try {
      await expect(
        handlers['workspace.remove']!.handle({
          connectionId: 'c1',
          params: { workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV' },
        }),
      ).rejects.toThrow(/not found/i)
    } finally {
      closeDatabase(db)
    }
  })
})
```

- [ ] **Step 2: Run the tests (should fail — handlers not registered)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/handlers/workspace.test.ts
```

Expected: FAIL with `Cannot read properties of undefined (reading 'handle')` on the missing handlers.

- [ ] **Step 3: Replace `daemons/dycoded/src/ipc/handlers/workspace.ts`**

```ts
import {
  ERROR_CODE,
  workspace_activate_paramsSchema,
  workspace_activate_resultSchema,
  workspace_add_paramsSchema,
  workspace_add_resultSchema,
  workspace_list_paramsSchema,
  workspace_list_resultSchema,
  workspace_remove_paramsSchema,
  workspace_remove_resultSchema,
  type WorkspaceId,
} from '@dycode/contracts'
import type { WorkspaceRepository } from '../../persistence/workspace-repo.js'
import type { EventBus } from '../../event-bus.js'
import { DycodeRpcError } from '../error-mapper.js'
import type { RpcMethodHandler } from '../dispatcher.js'

export interface WorkspaceHandlerDeps {
  workspaces: WorkspaceRepository
  eventBus: EventBus
}

function notFound(workspaceId: WorkspaceId): never {
  throw new DycodeRpcError(
    ERROR_CODE.WORKSPACE_NOT_FOUND,
    `workspace not found: ${workspaceId}`,
    { workspaceId },
  )
}

export function makeWorkspaceHandlers(
  deps: WorkspaceHandlerDeps,
): Record<string, RpcMethodHandler> {
  return {
    'workspace.add': {
      params: workspace_add_paramsSchema,
      result: workspace_add_resultSchema,
      handle: async ({ params }) => {
        const input = params as { name: string; rootPath: string }
        const workspace = deps.workspaces.insert(input)
        deps.eventBus.emit({
          workspaceId: workspace.id,
          taskId: null,
          agentId: null,
          type: 'output',
          payload: {
            kind: 'workspace.added',
            workspaceId: workspace.id,
            name: workspace.name,
            rootPath: workspace.rootPath,
          },
        })
        return { workspace }
      },
    },

    'workspace.list': {
      params: workspace_list_paramsSchema,
      result: workspace_list_resultSchema,
      handle: async () => ({ workspaces: deps.workspaces.list() }),
    },

    'workspace.activate': {
      params: workspace_activate_paramsSchema,
      result: workspace_activate_resultSchema,
      handle: async ({ params }) => {
        const { workspaceId } = params as { workspaceId: WorkspaceId }
        const existing = deps.workspaces.get(workspaceId)
        if (existing === null) notFound(workspaceId)
        deps.workspaces.touchActive(workspaceId)
        deps.eventBus.emit({
          workspaceId,
          taskId: null,
          agentId: null,
          type: 'output',
          payload: { kind: 'workspace.activated', workspaceId },
        })
        return { ok: true }
      },
    },

    'workspace.remove': {
      params: workspace_remove_paramsSchema,
      result: workspace_remove_resultSchema,
      handle: async ({ params }) => {
        const { workspaceId } = params as { workspaceId: WorkspaceId }
        const existing = deps.workspaces.get(workspaceId)
        if (existing === null) notFound(workspaceId)
        // Emit BEFORE delete: the FK cascade wipes event_log rows when
        // the workspace row goes, but the in-memory broadcast has
        // already fanned out to subscribed sockets by then.
        deps.eventBus.emit({
          workspaceId,
          taskId: null,
          agentId: null,
          type: 'output',
          payload: {
            kind: 'workspace.removed',
            workspaceId,
            name: existing.name,
          },
        })
        deps.workspaces.remove(workspaceId)
        return { ok: true }
      },
    },
  }
}
```

- [ ] **Step 4: Run the tests (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/handlers/workspace.test.ts
```

Expected: PASS, 8 tests (3 from Task 17 + 5 new).

- [ ] **Step 5: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/ipc/handlers/workspace.ts daemons/dycoded/tests/ipc/handlers/workspace.test.ts
git commit -m "feat(dycoded): add workspace.list/activate/remove handlers"
```

---

### Task 19 · `events.subscribe` + `events.unsubscribe` handlers

**Files:**
- Create: `daemons/dycoded/src/ipc/handlers/events.ts`
- Create: `daemons/dycoded/tests/ipc/handlers/events.test.ts`

`events.subscribe` takes an optional filter and returns a `subscriptionId`. `events.unsubscribe` takes the id and returns `{ ok: true }`. Both use the SubscriptionRegistry from Task 16. The handler captures the caller's `connectionId` so the cleanup on socket close can wipe subscriptions owned by that connection (wired in Task 23).

- [ ] **Step 1: Write the failing test `daemons/dycoded/tests/ipc/handlers/events.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { openDatabase, closeDatabase } from '../../../src/persistence/db.js'
import { ALL_MIGRATIONS, runMigrations } from '../../../src/persistence/migrate.js'
import { createWorkspaceRepo } from '../../../src/persistence/workspace-repo.js'
import { createEventLogRepo } from '../../../src/persistence/event-log-repo.js'
import { createConnectionRegistry } from '../../../src/ipc/connections.js'
import { createSubscriptionRegistry } from '../../../src/ipc/subscriptions.js'
import { createEventBus } from '../../../src/event-bus.js'
import { makeEventsHandlers } from '../../../src/ipc/handlers/events.js'

function freshContext() {
  const db = openDatabase(':memory:')
  runMigrations(db, ALL_MIGRATIONS)
  const workspaces = createWorkspaceRepo(db)
  const eventLog = createEventLogRepo(db)
  const connections = createConnectionRegistry()
  const subscriptions = createSubscriptionRegistry()
  const eventBus = createEventBus({ eventLog, subscriptions, connections })
  const handlers = makeEventsHandlers({ eventLog, subscriptions })
  const ws = workspaces.insert({ name: 'demo', rootPath: '/tmp/demo' })
  return { db, handlers, eventLog, subscriptions, eventBus, wsId: ws.id }
}

describe('handlers/events.subscribe', () => {
  it('returns a subscriptionId tied to the caller connection', async () => {
    const { db, handlers } = freshContext()
    try {
      const out = (await handlers['events.subscribe']!.handle({
        connectionId: 'c1',
        params: {},
      })) as { subscriptionId: string }
      expect(typeof out.subscriptionId).toBe('string')
      expect(out.subscriptionId.length).toBe(26)
    } finally {
      closeDatabase(db)
    }
  })

  it('accepts a filter and routes matching events only', async () => {
    const { db, handlers, subscriptions, eventBus, wsId } = freshContext()
    try {
      await handlers['events.subscribe']!.handle({
        connectionId: 'c1',
        params: { filter: { workspaceId: wsId } },
      })
      const targets = subscriptions.targetsFor({
        workspaceId: wsId,
        taskId: null,
        agentId: null,
      })
      expect(targets).toEqual(['c1'])
      eventBus.emit({
        workspaceId: wsId,
        taskId: null,
        agentId: null,
        type: 'output',
        payload: { kind: 'workspace.added', workspaceId: wsId },
      })
    } finally {
      closeDatabase(db)
    }
  })
})

describe('handlers/events.unsubscribe', () => {
  it('removes the subscription by id', async () => {
    const { db, handlers, subscriptions } = freshContext()
    try {
      const sub = (await handlers['events.subscribe']!.handle({
        connectionId: 'c1',
        params: {},
      })) as { subscriptionId: string }
      const out = (await handlers['events.unsubscribe']!.handle({
        connectionId: 'c1',
        params: { subscriptionId: sub.subscriptionId },
      })) as { ok: true }
      expect(out.ok).toBe(true)
      expect(
        subscriptions.targetsFor({
          workspaceId:
            'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV' as never,
          taskId: null,
          agentId: null,
        }),
      ).toEqual([])
    } finally {
      closeDatabase(db)
    }
  })

  it('reports ok:true even for an unknown subscriptionId (idempotent)', async () => {
    const { db, handlers } = freshContext()
    try {
      const out = (await handlers['events.unsubscribe']!.handle({
        connectionId: 'c1',
        params: { subscriptionId: 'does-not-exist' },
      })) as { ok: true }
      expect(out.ok).toBe(true)
    } finally {
      closeDatabase(db)
    }
  })
})
```

- [ ] **Step 2: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/handlers/events.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write `daemons/dycoded/src/ipc/handlers/events.ts`**

```ts
import {
  events_subscribe_paramsSchema,
  events_subscribe_resultSchema,
  events_unsubscribe_paramsSchema,
  events_unsubscribe_resultSchema,
} from '@dycode/contracts'
import type { EventLogRepository } from '../../persistence/event-log-repo.js'
import type {
  EventFilter,
  SubscriptionRegistry,
} from '../subscriptions.js'
import type { RpcMethodHandler } from '../dispatcher.js'

export interface EventsHandlerDeps {
  eventLog: EventLogRepository
  subscriptions: SubscriptionRegistry
}

export function makeEventsHandlers(
  deps: EventsHandlerDeps,
): Record<string, RpcMethodHandler> {
  return {
    'events.subscribe': {
      params: events_subscribe_paramsSchema,
      result: events_subscribe_resultSchema,
      handle: async ({ connectionId, params }) => {
        const p = params as { filter?: EventFilter }
        const subscriptionId = deps.subscriptions.subscribe(
          connectionId,
          p.filter ?? {},
        )
        return { subscriptionId }
      },
    },

    'events.unsubscribe': {
      params: events_unsubscribe_paramsSchema,
      result: events_unsubscribe_resultSchema,
      handle: async ({ params }) => {
        const { subscriptionId } = params as { subscriptionId: string }
        deps.subscriptions.unsubscribe(subscriptionId)
        return { ok: true as const }
      },
    },
  }
}
```

- [ ] **Step 4: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/handlers/events.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/ipc/handlers/events.ts daemons/dycoded/tests/ipc/handlers/events.test.ts
git commit -m "feat(dycoded): add events.subscribe and events.unsubscribe handlers"
```

---

### Task 20 · `events.query` handler

**Files:**
- Modify: `daemons/dycoded/src/ipc/handlers/events.ts` (add `events.query`)
- Modify: `daemons/dycoded/tests/ipc/handlers/events.test.ts` (append coverage)

`events.query` returns a paginated history slice from the event log. It delegates straight to `eventLog.queryByWorkspace(...)` — that repo already implements the cursor pagination and `sinceTs` filtering the contract method specifies.

- [ ] **Step 1: Append to `daemons/dycoded/tests/ipc/handlers/events.test.ts`**

Add this describe block at the bottom of the file:

```ts
describe('handlers/events.query', () => {
  it('returns historical events for a workspace, newest first', async () => {
    const { db, handlers, eventBus, wsId } = freshContext()
    try {
      for (let i = 0; i < 3; i++) {
        eventBus.emit({
          workspaceId: wsId,
          taskId: null,
          agentId: null,
          type: 'progress',
          payload: { i },
        })
      }
      const out = (await handlers['events.query']!.handle({
        connectionId: 'c1',
        params: { workspaceId: wsId },
      })) as {
        events: Array<{ payload: { i: number } }>
        nextCursor: string | null
      }
      expect(out.events.length).toBe(3)
      expect(out.events[0]?.payload.i).toBe(2)
      expect(out.nextCursor).toBeNull()
    } finally {
      closeDatabase(db)
    }
  })

  it('respects limit and returns nextCursor when there is more', async () => {
    const { db, handlers, eventBus, wsId } = freshContext()
    try {
      for (let i = 0; i < 5; i++) {
        eventBus.emit({
          workspaceId: wsId,
          taskId: null,
          agentId: null,
          type: 'progress',
          payload: { i },
        })
      }
      const out = (await handlers['events.query']!.handle({
        connectionId: 'c1',
        params: { workspaceId: wsId, limit: 2 },
      })) as { events: unknown[]; nextCursor: string | null }
      expect(out.events.length).toBe(2)
      expect(out.nextCursor).not.toBeNull()
    } finally {
      closeDatabase(db)
    }
  })

  it('returns empty events for a workspace with no history', async () => {
    const { db, handlers, wsId } = freshContext()
    try {
      const out = (await handlers['events.query']!.handle({
        connectionId: 'c1',
        params: { workspaceId: wsId },
      })) as { events: unknown[]; nextCursor: string | null }
      expect(out.events).toEqual([])
      expect(out.nextCursor).toBeNull()
    } finally {
      closeDatabase(db)
    }
  })
})
```

- [ ] **Step 2: Run the test (should fail — handler missing)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/handlers/events.test.ts
```

Expected: FAIL — `events.query` is undefined.

- [ ] **Step 3: Replace `daemons/dycoded/src/ipc/handlers/events.ts`**

```ts
import {
  events_query_paramsSchema,
  events_query_resultSchema,
  events_subscribe_paramsSchema,
  events_subscribe_resultSchema,
  events_unsubscribe_paramsSchema,
  events_unsubscribe_resultSchema,
  type AgentId,
  type TaskId,
  type WorkspaceId,
} from '@dycode/contracts'
import type {
  EventLogRepository,
  QueryInput,
} from '../../persistence/event-log-repo.js'
import type {
  EventFilter,
  SubscriptionRegistry,
} from '../subscriptions.js'
import type { RpcMethodHandler } from '../dispatcher.js'

export interface EventsHandlerDeps {
  eventLog: EventLogRepository
  subscriptions: SubscriptionRegistry
}

export function makeEventsHandlers(
  deps: EventsHandlerDeps,
): Record<string, RpcMethodHandler> {
  return {
    'events.subscribe': {
      params: events_subscribe_paramsSchema,
      result: events_subscribe_resultSchema,
      handle: async ({ connectionId, params }) => {
        const p = params as { filter?: EventFilter }
        const subscriptionId = deps.subscriptions.subscribe(
          connectionId,
          p.filter ?? {},
        )
        return { subscriptionId }
      },
    },

    'events.unsubscribe': {
      params: events_unsubscribe_paramsSchema,
      result: events_unsubscribe_resultSchema,
      handle: async ({ params }) => {
        const { subscriptionId } = params as { subscriptionId: string }
        deps.subscriptions.unsubscribe(subscriptionId)
        return { ok: true as const }
      },
    },

    'events.query': {
      params: events_query_paramsSchema,
      result: events_query_resultSchema,
      handle: async ({ params }) => {
        const p = params as {
          workspaceId: WorkspaceId
          taskId?: TaskId
          agentId?: AgentId
          sinceTs?: number
          limit?: number
          cursor?: string
        }
        const queryInput: QueryInput = { workspaceId: p.workspaceId }
        if (p.taskId !== undefined) queryInput.taskId = p.taskId
        if (p.agentId !== undefined) queryInput.agentId = p.agentId
        if (p.sinceTs !== undefined) queryInput.sinceTs = p.sinceTs
        if (p.limit !== undefined) queryInput.limit = p.limit
        if (p.cursor !== undefined) queryInput.cursor = p.cursor
        return deps.eventLog.queryByWorkspace(queryInput)
      },
    },
  }
}
```

- [ ] **Step 4: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/ipc/handlers/events.test.ts
```

Expected: PASS, 7 tests (4 from Task 19 + 3 new).

- [ ] **Step 5: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/ipc/handlers/events.ts daemons/dycoded/tests/ipc/handlers/events.test.ts
git commit -m "feat(dycoded): add events.query handler with cursor pagination"
```

---

### Task 21 · `DycodeClient` — connect, auth, `request<M>()`

**Files:**
- Create: `packages/ipc-client/src/request.ts`
- Create: `packages/ipc-client/src/client.ts`
- Modify: `packages/ipc-client/src/index.ts`
- Create: `packages/ipc-client/tests/client.test.ts`

The client is a thin class: `new DycodeClient({ url, token })`, then `await client.connect()`, then `client.request('workspace.add', { name, rootPath })`. Each request has a ULID id; incoming response messages are matched by id and resolve the pending promise. Notifications (no `id` field) are dispatched to subscribers — Task 22 wires that up; for now we hold the hook empty.

Tests spin up the real `dycoded` IPC server on port 0 and drive it from the client.

- [ ] **Step 1: Write the failing test `packages/ipc-client/tests/client.test.ts`**

```ts
import { describe, expect, it, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { Hono } from 'hono'
import { serve, type ServerType } from '@hono/node-server'
import { WebSocketServer } from 'ws'
import { JsonRpcRequestEnvelopeSchema } from '@dycode/contracts'
import { DycodeClient } from '../src/index.js'

interface MiniServer {
  port: number
  close: () => Promise<void>
}

// A minimal test daemon that echoes one method and validates the bearer token.
async function startMiniDaemon(token: string): Promise<MiniServer> {
  const app = new Hono()
  app.get('/health', (c) => c.json({ ok: true }))
  const wss = new WebSocketServer({ noServer: true })
  return await new Promise<MiniServer>((resolve, reject) => {
    let httpServer: ServerType | undefined
    try {
      httpServer = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }, (info) => {
        httpServer!.on('upgrade', (req, socket, head) => {
          const url = new URL(req.url ?? '/', 'http://x')
          const provided = url.searchParams.get('token') ?? ''
          if (provided !== token) {
            socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
            socket.destroy()
            return
          }
          wss.handleUpgrade(req, socket, head, (ws) => {
            ws.on('message', (raw) => {
              const parsed = JsonRpcRequestEnvelopeSchema.parse(JSON.parse(String(raw)))
              if (parsed.method === 'echo.say') {
                const msg = (parsed.params as { msg: string }).msg
                ws.send(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: parsed.id,
                    result: { echoed: msg },
                  }),
                )
              } else if (parsed.method === 'echo.fail') {
                ws.send(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: parsed.id,
                    error: { code: -32603, message: 'oops' },
                  }),
                )
              }
            })
          })
        })
        resolve({
          port: info.port,
          close: () =>
            new Promise<void>((res) => {
              wss.close()
              httpServer!.close(() => res())
            }),
        })
      })
      httpServer.on('error', reject)
    } catch (err) {
      reject(err)
    }
    // keep Database import "used" so the bundler does not strip it (peer dep)
    void Database
  })
}

const handles: MiniServer[] = []
afterEach(async () => {
  while (handles.length > 0) {
    const h = handles.pop()!
    await h.close()
  }
})

describe('DycodeClient', () => {
  it('connects with a valid bearer token', async () => {
    const srv = await startMiniDaemon('tok-1')
    handles.push(srv)
    const client = new DycodeClient({
      url: `ws://127.0.0.1:${srv.port}/ws`,
      token: 'tok-1',
    })
    await client.connect()
    expect(client.isOpen()).toBe(true)
    await client.close()
  })

  it('rejects connect with a bad token', async () => {
    const srv = await startMiniDaemon('tok-1')
    handles.push(srv)
    const client = new DycodeClient({
      url: `ws://127.0.0.1:${srv.port}/ws`,
      token: 'tok-wrong',
    })
    await expect(client.connect()).rejects.toThrow(/401|unauthorized/i)
  })

  it('request<M> resolves with the result envelope', async () => {
    const srv = await startMiniDaemon('tok-1')
    handles.push(srv)
    const client = new DycodeClient({
      url: `ws://127.0.0.1:${srv.port}/ws`,
      token: 'tok-1',
    })
    await client.connect()
    const out = (await client.request('echo.say' as never, { msg: 'hi' } as never)) as {
      echoed: string
    }
    expect(out.echoed).toBe('hi')
    await client.close()
  })

  it('request rejects on JSON-RPC error response', async () => {
    const srv = await startMiniDaemon('tok-1')
    handles.push(srv)
    const client = new DycodeClient({
      url: `ws://127.0.0.1:${srv.port}/ws`,
      token: 'tok-1',
    })
    await client.connect()
    await expect(
      client.request('echo.fail' as never, {} as never),
    ).rejects.toThrow(/oops/)
    await client.close()
  })

  it('request rejects with a clear error if not yet connected', async () => {
    const client = new DycodeClient({
      url: `ws://127.0.0.1:1/ws`,
      token: 'tok-1',
    })
    await expect(
      client.request('echo.say' as never, { msg: 'x' } as never),
    ).rejects.toThrow(/not connected/i)
  })

  it('close is idempotent and safe to call before connect', async () => {
    const client = new DycodeClient({ url: 'ws://127.0.0.1:1/ws', token: 'x' })
    await client.close()
    await client.close()
    expect(client.isOpen()).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test (should fail — module missing)**

Run:
```bash
pnpm --filter @dycode/ipc-client test
```

Expected: FAIL with module-not-found for `DycodeClient`.

- [ ] **Step 3: Write `packages/ipc-client/src/request.ts`**

```ts
import { ulid } from 'ulid'
import type { JsonRpcError } from '@dycode/contracts'

export class DycodeRpcRemoteError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message)
    this.name = 'DycodeRpcRemoteError'
  }
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
  timer: NodeJS.Timeout
}

export interface PendingMap {
  add(id: string, opts: PendingRequest): void
  resolve(id: string, result: unknown): void
  rejectWith(id: string, err: JsonRpcError): void
  rejectAll(err: Error): void
}

export function createPendingMap(): PendingMap {
  const map = new Map<string, PendingRequest>()
  return {
    add(id, opts) {
      map.set(id, opts)
    },
    resolve(id, result) {
      const entry = map.get(id)
      if (!entry) return
      clearTimeout(entry.timer)
      map.delete(id)
      entry.resolve(result)
    },
    rejectWith(id, err) {
      const entry = map.get(id)
      if (!entry) return
      clearTimeout(entry.timer)
      map.delete(id)
      entry.reject(new DycodeRpcRemoteError(err.code, err.message, err.data))
    },
    rejectAll(err) {
      for (const [id, entry] of map) {
        clearTimeout(entry.timer)
        entry.reject(err)
        map.delete(id)
      }
    },
  }
}

export function newRequestId(): string {
  return ulid()
}
```

- [ ] **Step 4: Write `packages/ipc-client/src/client.ts`**

```ts
import WebSocket, { type RawData } from 'ws'
import {
  JsonRpcResponseEnvelopeSchema,
  NotificationSchema,
  type Notification,
} from '@dycode/contracts'
import {
  createPendingMap,
  DycodeRpcRemoteError,
  newRequestId,
  type PendingMap,
} from './request.js'

export interface DycodeClientOptions {
  url: string
  token: string
  /** Per-request timeout in ms. Default: 10_000. */
  requestTimeoutMs?: number
}

export type NotificationListener = (notification: Notification) => void

export class DycodeClient {
  private socket: WebSocket | null = null
  private readonly pending: PendingMap = createPendingMap()
  private readonly requestTimeoutMs: number
  protected readonly listeners = new Set<NotificationListener>()

  constructor(private readonly opts: DycodeClientOptions) {
    this.requestTimeoutMs = opts.requestTimeoutMs ?? 10_000
  }

  isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  async connect(): Promise<void> {
    if (this.isOpen()) return
    const url = this.opts.url.includes('?')
      ? `${this.opts.url}&token=${encodeURIComponent(this.opts.token)}`
      : `${this.opts.url}?token=${encodeURIComponent(this.opts.token)}`
    const ws = new WebSocket(url, {
      headers: { Authorization: `Bearer ${this.opts.token}` },
    })
    this.socket = ws
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve())
      ws.once('unexpected-response', (_req, res) => {
        reject(new Error(`HTTP ${res.statusCode ?? 0} (${res.statusMessage ?? 'unauthorized'})`))
      })
      ws.once('error', (err) => reject(err))
    })
    ws.on('message', (raw: RawData) => this.handleIncoming(String(raw)))
    ws.on('close', () => {
      this.pending.rejectAll(new Error('connection closed'))
      this.socket = null
    })
  }

  async close(): Promise<void> {
    const sock = this.socket
    if (!sock) return
    await new Promise<void>((resolve) => {
      sock.once('close', () => resolve())
      sock.close()
    })
    this.socket = null
  }

  async request(method: string, params: unknown): Promise<unknown> {
    const sock = this.socket
    if (!sock || sock.readyState !== WebSocket.OPEN) {
      throw new Error('not connected — call connect() first')
    }
    const id = newRequestId()
    return await new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.rejectWith(id, {
          code: -32603,
          message: `request timed out after ${this.requestTimeoutMs}ms`,
        })
      }, this.requestTimeoutMs)
      this.pending.add(id, { resolve, reject, timer })
      const envelope = {
        jsonrpc: '2.0',
        id,
        method,
        params,
        protocolVersion: 1,
      }
      sock.send(JSON.stringify(envelope))
    })
  }

  private handleIncoming(raw: string): void {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return
    }
    if (typeof parsed === 'object' && parsed !== null && 'id' in parsed) {
      const envelopeRes = JsonRpcResponseEnvelopeSchema.safeParse(parsed)
      if (!envelopeRes.success) return
      const env = envelopeRes.data
      if (env.error !== undefined) {
        this.pending.rejectWith(env.id, env.error)
      } else {
        this.pending.resolve(env.id, env.result)
      }
      return
    }
    const notificationRes = NotificationSchema.safeParse(parsed)
    if (notificationRes.success) {
      for (const fn of this.listeners) fn(notificationRes.data)
    }
  }
}

export { DycodeRpcRemoteError }
```

- [ ] **Step 5: Update `packages/ipc-client/src/index.ts`**

Replace the existing content:

```ts
export { IPC_CLIENT_VERSION } from './version.js'
export { DycodeClient, DycodeRpcRemoteError } from './client.js'
export type { DycodeClientOptions, NotificationListener } from './client.js'
```

- [ ] **Step 6: Add the test-only devDependency for `@hono/node-server` and `hono`**

Run from the repo root:
```bash
pnpm --filter @dycode/ipc-client add -D @hono/node-server@^1.13.7 hono@^4.6.14 better-sqlite3@^11.7.0
```

Expected: `@dycode/ipc-client` `devDependencies` updated; lockfile updated.

- [ ] **Step 7: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/ipc-client test
```

Expected: PASS, 6 tests (plus the 3 from the version test).

- [ ] **Step 8: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 9: Commit**

```bash
git add packages/ipc-client/src/ packages/ipc-client/tests/client.test.ts packages/ipc-client/package.json pnpm-lock.yaml
git commit -m "feat(ipc-client): add DycodeClient with bearer auth and request<M>"
```

---

### Task 22 · `DycodeClient` — `subscribe()` / `unsubscribe()`

**Files:**
- Create: `packages/ipc-client/src/subscriptions.ts`
- Modify: `packages/ipc-client/src/client.ts` (add subscribe/unsubscribe methods)
- Modify: `packages/ipc-client/src/index.ts` (export `SubscriptionHandle`)
- Modify: `packages/ipc-client/tests/client.test.ts` (append subscription coverage)

`client.subscribe(filter, onNotification)` calls `events.subscribe` on the daemon, registers a local listener, and returns a `SubscriptionHandle` with `.unsubscribe()`. Calling `.unsubscribe()` sends `events.unsubscribe` and removes the local listener. This task uses a slightly extended mini-daemon in tests that wires through to real `events.*` handlers via the daemon's internal modules — but kept compact.

- [ ] **Step 1: Write `packages/ipc-client/src/subscriptions.ts`**

```ts
import type { Notification } from '@dycode/contracts'

export interface EventFilterLike {
  workspaceId?: string
  taskId?: string
  agentId?: string
}

export type SubscriptionListener = (notification: Notification) => void

export interface SubscriptionHandle {
  /** Server-assigned subscription id. */
  readonly subscriptionId: string
  /** Tears down the local listener and tells the daemon to drop the sub. */
  unsubscribe: () => Promise<void>
}
```

- [ ] **Step 2: Extend `packages/ipc-client/src/client.ts` — replace the file with this version**

```ts
import WebSocket, { type RawData } from 'ws'
import {
  JsonRpcResponseEnvelopeSchema,
  NotificationSchema,
  type Notification,
} from '@dycode/contracts'
import {
  createPendingMap,
  DycodeRpcRemoteError,
  newRequestId,
  type PendingMap,
} from './request.js'
import type {
  EventFilterLike,
  SubscriptionHandle,
  SubscriptionListener,
} from './subscriptions.js'

export interface DycodeClientOptions {
  url: string
  token: string
  requestTimeoutMs?: number
}

export type NotificationListener = (notification: Notification) => void

export class DycodeClient {
  private socket: WebSocket | null = null
  private readonly pending: PendingMap = createPendingMap()
  private readonly requestTimeoutMs: number
  private readonly listeners = new Set<NotificationListener>()
  private readonly perSubscription = new Map<string, SubscriptionListener>()

  constructor(private readonly opts: DycodeClientOptions) {
    this.requestTimeoutMs = opts.requestTimeoutMs ?? 10_000
  }

  isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  async connect(): Promise<void> {
    if (this.isOpen()) return
    const url = this.opts.url.includes('?')
      ? `${this.opts.url}&token=${encodeURIComponent(this.opts.token)}`
      : `${this.opts.url}?token=${encodeURIComponent(this.opts.token)}`
    const ws = new WebSocket(url, {
      headers: { Authorization: `Bearer ${this.opts.token}` },
    })
    this.socket = ws
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve())
      ws.once('unexpected-response', (_req, res) => {
        reject(new Error(`HTTP ${res.statusCode ?? 0} (${res.statusMessage ?? 'unauthorized'})`))
      })
      ws.once('error', (err) => reject(err))
    })
    ws.on('message', (raw: RawData) => this.handleIncoming(String(raw)))
    ws.on('close', () => {
      this.pending.rejectAll(new Error('connection closed'))
      this.socket = null
    })
  }

  async close(): Promise<void> {
    const sock = this.socket
    if (!sock) return
    await new Promise<void>((resolve) => {
      sock.once('close', () => resolve())
      sock.close()
    })
    this.socket = null
  }

  async request(method: string, params: unknown): Promise<unknown> {
    const sock = this.socket
    if (!sock || sock.readyState !== WebSocket.OPEN) {
      throw new Error('not connected — call connect() first')
    }
    const id = newRequestId()
    return await new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.rejectWith(id, {
          code: -32603,
          message: `request timed out after ${this.requestTimeoutMs}ms`,
        })
      }, this.requestTimeoutMs)
      this.pending.add(id, { resolve, reject, timer })
      const envelope = {
        jsonrpc: '2.0',
        id,
        method,
        params,
        protocolVersion: 1,
      }
      sock.send(JSON.stringify(envelope))
    })
  }

  /**
   * Subscribes to event.appended notifications matching `filter`.
   * Returns a handle whose .unsubscribe() removes the listener AND
   * tells the daemon to drop the subscription.
   */
  async subscribe(
    filter: EventFilterLike | undefined,
    onNotification: SubscriptionListener,
  ): Promise<SubscriptionHandle> {
    const result = (await this.request(
      'events.subscribe',
      filter === undefined ? {} : { filter },
    )) as { subscriptionId: string }
    this.perSubscription.set(result.subscriptionId, onNotification)
    return {
      subscriptionId: result.subscriptionId,
      unsubscribe: async () => {
        this.perSubscription.delete(result.subscriptionId)
        try {
          await this.request('events.unsubscribe', {
            subscriptionId: result.subscriptionId,
          })
        } catch {
          // Best-effort — daemon may have already dropped the subscription.
        }
      },
    }
  }

  /** Lower-level: catch every Notification regardless of filter. */
  onNotification(fn: NotificationListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private handleIncoming(raw: string): void {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return
    }
    if (typeof parsed === 'object' && parsed !== null && 'id' in parsed) {
      const envelopeRes = JsonRpcResponseEnvelopeSchema.safeParse(parsed)
      if (!envelopeRes.success) return
      const env = envelopeRes.data
      if (env.error !== undefined) {
        this.pending.rejectWith(env.id, env.error)
      } else {
        this.pending.resolve(env.id, env.result)
      }
      return
    }
    const notificationRes = NotificationSchema.safeParse(parsed)
    if (notificationRes.success) {
      const notification = notificationRes.data
      for (const fn of this.listeners) fn(notification)
      // Fan out to every per-subscription listener — the server already
      // pre-filtered which connection should receive this message.
      for (const fn of this.perSubscription.values()) fn(notification)
    }
  }
}

export { DycodeRpcRemoteError }
```

- [ ] **Step 3: Update `packages/ipc-client/src/index.ts`**

Replace contents:

```ts
export { IPC_CLIENT_VERSION } from './version.js'
export { DycodeClient, DycodeRpcRemoteError } from './client.js'
export type { DycodeClientOptions, NotificationListener } from './client.js'
export type {
  EventFilterLike,
  SubscriptionHandle,
  SubscriptionListener,
} from './subscriptions.js'
```

- [ ] **Step 4: Append subscription tests to `packages/ipc-client/tests/client.test.ts`**

At the bottom of the file, add:

```ts
describe('DycodeClient.subscribe', () => {
  it('round-trips events.subscribe and receives matching notifications', async () => {
    // Use a slightly richer mini-daemon that handles events.subscribe + a
    // way to push a notification down the wire for testing.
    const app = new Hono()
    const wss = new WebSocketServer({ noServer: true })
    const srv = await new Promise<MiniServer & { push: (msg: object) => void }>(
      (resolve, reject) => {
        let httpServer: ServerType | undefined
        const open = new Set<import('ws').WebSocket>()
        try {
          httpServer = serve(
            { fetch: app.fetch, port: 0, hostname: '127.0.0.1' },
            (info) => {
              httpServer!.on('upgrade', (req, socket, head) => {
                const url = new URL(req.url ?? '/', 'http://x')
                if (url.searchParams.get('token') !== 'tok-1') {
                  socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
                  socket.destroy()
                  return
                }
                wss.handleUpgrade(req, socket, head, (ws) => {
                  open.add(ws)
                  ws.on('close', () => open.delete(ws))
                  ws.on('message', (raw) => {
                    const env = JsonRpcRequestEnvelopeSchema.parse(JSON.parse(String(raw)))
                    if (env.method === 'events.subscribe') {
                      ws.send(
                        JSON.stringify({
                          jsonrpc: '2.0',
                          id: env.id,
                          result: { subscriptionId: 'sub-xyz' },
                        }),
                      )
                    } else if (env.method === 'events.unsubscribe') {
                      ws.send(
                        JSON.stringify({
                          jsonrpc: '2.0',
                          id: env.id,
                          result: { ok: true },
                        }),
                      )
                    }
                  })
                })
              })
              resolve({
                port: info.port,
                close: () =>
                  new Promise<void>((res) => {
                    wss.close()
                    httpServer!.close(() => res())
                  }),
                push: (msg) => {
                  for (const ws of open) ws.send(JSON.stringify(msg))
                },
              })
            },
          )
          httpServer.on('error', reject)
        } catch (err) {
          reject(err)
        }
      },
    )
    handles.push(srv)
    const client = new DycodeClient({
      url: `ws://127.0.0.1:${srv.port}/ws`,
      token: 'tok-1',
    })
    await client.connect()
    const received: unknown[] = []
    const sub = await client.subscribe(undefined, (n) => received.push(n))
    expect(sub.subscriptionId).toBe('sub-xyz')
    srv.push({
      jsonrpc: '2.0',
      method: 'event.appended',
      params: {
        id: '01J0KQNR2VABCDE0123456789X',
        ts: 1,
        workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        taskId: null,
        agentId: null,
        type: 'output',
        payload: { hello: true },
      },
    })
    await new Promise((r) => setTimeout(r, 20))
    expect(received.length).toBe(1)
    await sub.unsubscribe()
    await client.close()
  })
})
```

- [ ] **Step 5: Run the tests**

Run:
```bash
pnpm --filter @dycode/ipc-client test
```

Expected: PASS, 7+ tests (existing + new subscribe test).

- [ ] **Step 6: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 7: Commit**

```bash
git add packages/ipc-client/src/subscriptions.ts packages/ipc-client/src/client.ts packages/ipc-client/src/index.ts packages/ipc-client/tests/client.test.ts
git commit -m "feat(ipc-client): add subscribe/unsubscribe with SubscriptionHandle"
```

---

### Task 23 · Boot entrypoint + signal handlers + `dycoded` bin

**Files:**
- Create: `daemons/dycoded/src/lifecycle.ts`
- Create: `daemons/dycoded/src/boot.ts`
- Modify: `daemons/dycoded/src/ipc/server.ts` (accept dispatcher + wire onMessage)
- Create: `daemons/dycoded/src/cli.ts` (just `start` for now — Task 24 adds the rest)
- Create: `daemons/dycoded/bin/dycoded.mjs`
- Modify: `daemons/dycoded/src/index.ts`
- Create: `daemons/dycoded/tests/boot.test.ts`

`boot.ts` wires every dependency, runs migrations, builds the dispatcher with the registered method handlers, starts the server, writes `auth.json` + `runtime.json`, and returns a `BootHandle` with `.shutdown()`. `lifecycle.ts` registers SIGINT/SIGTERM handlers that call `.shutdown()` and exit. The CLI is a tiny `argv[2]` switch — `start` runs the boot, anything else (handled in Task 24) prints a helpful message.

- [ ] **Step 1: Extend `daemons/dycoded/src/ipc/server.ts` to accept a message handler**

Replace the file:

```ts
import { Hono } from 'hono'
import { serve, type ServerType } from '@hono/node-server'
import { WebSocketServer, type WebSocket } from 'ws'
import type { Db } from '../persistence/db.js'
import type { Logger } from '../logger.js'
import { DYCODED_VERSION } from '../version.js'
import { extractBearerToken, timingSafeEqual } from './auth-middleware.js'
import { createConnectionRegistry, type ConnectionRegistry } from './connections.js'
import type { Dispatcher } from './dispatcher.js'
import type { SubscriptionRegistry } from './subscriptions.js'

export interface IpcServerOptions {
  db: Db
  logger: Logger
  bearerToken: string
  port: number
  host: string
  dispatcher: Dispatcher
  subscriptions: SubscriptionRegistry
}

export interface IpcServerHandle {
  port: number
  host: string
  connections: ConnectionRegistry
  close: () => Promise<void>
}

export function startIpcServer(opts: IpcServerOptions): Promise<IpcServerHandle> {
  const app = new Hono()
  app.get('/health', (c) =>
    c.json({ ok: true, daemonVersion: DYCODED_VERSION, ts: Date.now() }),
  )

  const connections = createConnectionRegistry()

  return new Promise((resolve, reject) => {
    let server: ServerType | undefined
    let wss: WebSocketServer | undefined
    try {
      server = serve(
        { fetch: app.fetch, port: opts.port, hostname: opts.host },
        (info) => {
          wss = new WebSocketServer({ noServer: true })
          server!.on('upgrade', (req, socket, head) => {
            if (req.url === undefined || !req.url.startsWith('/ws')) {
              socket.destroy()
              return
            }
            const token = extractBearerToken(req)
            if (token === null || !timingSafeEqual(token, opts.bearerToken)) {
              socket.write(
                'HTTP/1.1 401 Unauthorized\r\n' +
                  'Connection: close\r\n' +
                  'Content-Length: 0\r\n\r\n',
              )
              socket.destroy()
              return
            }
            wss!.handleUpgrade(req, socket, head, (ws: WebSocket) => {
              const id = connections.register(ws)
              opts.logger.debug({ connectionId: id }, 'ws client connected')
              ws.on('message', async (raw) => {
                const response = await opts.dispatcher.handle({
                  raw: String(raw),
                  connectionId: id,
                })
                if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(response))
              })
              ws.on('close', () => {
                opts.subscriptions.unsubscribeConnection(id)
                connections.unregister(id)
                opts.logger.debug({ connectionId: id }, 'ws client disconnected')
              })
              ws.on('error', (err) =>
                opts.logger.warn({ connectionId: id, err }, 'ws error'),
              )
            })
          })
          opts.logger.info(
            { port: info.port, host: opts.host },
            'dycoded ipc server listening',
          )
          resolve({
            port: info.port,
            host: opts.host,
            connections,
            close: () =>
              new Promise<void>((res, rej) => {
                wss?.clients.forEach((c) => c.terminate())
                wss?.close()
                if (!server) return res()
                server.close((err) => (err ? rej(err) : res()))
              }),
          })
        },
      )
      server.on('error', reject)
    } catch (err) {
      reject(err)
    }
  })
}
```

Note: the server tests from Task 13 + 14 must be updated since the options shape changed. After implementing `boot.ts` we'll touch them.

- [ ] **Step 2: Write `daemons/dycoded/src/lifecycle.ts`**

```ts
import type { Logger } from './logger.js'

export interface ShutdownHook {
  (): Promise<void> | void
}

/**
 * Registers SIGINT + SIGTERM handlers that drain the given hook
 * once, then exit cleanly. Returns a disposer that removes the
 * handlers (useful for tests).
 */
export function installSignalHandlers(
  logger: Logger,
  hook: ShutdownHook,
): () => void {
  let shuttingDown = false
  const run = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, 'shutdown signal received')
    try {
      await hook()
      logger.info('graceful shutdown complete')
      process.exit(0)
    } catch (err) {
      logger.error({ err }, 'shutdown error')
      process.exit(1)
    }
  }
  const onInt = () => void run('SIGINT')
  const onTerm = () => void run('SIGTERM')
  process.on('SIGINT', onInt)
  process.on('SIGTERM', onTerm)
  return () => {
    process.off('SIGINT', onInt)
    process.off('SIGTERM', onTerm)
  }
}
```

- [ ] **Step 3: Write `daemons/dycoded/src/boot.ts`**

```ts
import { join } from 'node:path'
import { resolveDataDir } from './runtime/data-dir.js'
import { acquireLock, releaseLock } from './runtime/lockfile.js'
import { generateAuthToken, writeAuthToken } from './runtime/auth.js'
import { writeRuntimeRegistry } from './runtime/registry.js'
import { pickFreePort } from './runtime/port.js'
import { openDatabase, closeDatabase, type Db } from './persistence/db.js'
import { ALL_MIGRATIONS, runMigrations } from './persistence/migrate.js'
import { createWorkspaceRepo } from './persistence/workspace-repo.js'
import { createEventLogRepo } from './persistence/event-log-repo.js'
import { createSubscriptionRegistry } from './ipc/subscriptions.js'
import { createDispatcher } from './ipc/dispatcher.js'
import { startIpcServer, type IpcServerHandle } from './ipc/server.js'
import { makeWorkspaceHandlers } from './ipc/handlers/workspace.js'
import { makeEventsHandlers } from './ipc/handlers/events.js'
import { createEventBus } from './event-bus.js'
import { createLogger, type Logger } from './logger.js'
import { DYCODED_VERSION } from './version.js'

export interface BootOptions {
  /** Override the runtime data directory (default: ~/.dycode or $DYCODE_DATA_DIR). */
  dataDir?: string
  /** Override the bind port (default: auto-pick via pickFreePort). */
  port?: number
  /** Override the bind host (default: '127.0.0.1'). */
  host?: string
  /** Provide a logger (default: pino at level from $DYCODE_LOG_LEVEL or 'info'). */
  logger?: Logger
}

export interface BootHandle {
  dataDir: string
  port: number
  host: string
  token: string
  daemonVersion: string
  shutdown: () => Promise<void>
}

export async function boot(opts: BootOptions = {}): Promise<BootHandle> {
  const dataDir = opts.dataDir ?? resolveDataDir()
  const host = opts.host ?? '127.0.0.1'
  const logger = opts.logger ?? createLogger()

  acquireLock(dataDir)

  const dbPath = join(dataDir, 'dycoded.sqlite')
  let db: Db | null = null
  let server: IpcServerHandle | null = null
  let released = false

  try {
    db = openDatabase(dbPath)
    runMigrations(db, ALL_MIGRATIONS)
    const workspaces = createWorkspaceRepo(db)
    const eventLog = createEventLogRepo(db)
    const subscriptions = createSubscriptionRegistry()

    const port = opts.port ?? (await pickFreePort())
    const token = generateAuthToken()
    writeAuthToken(dataDir, token)

    // Note: connection registry is owned by the server; we need a stub here
    // to wire the event bus before the server exists. We rebind to the real
    // registry after the server starts so events flow to live sockets.
    let connectionsRef: import('./ipc/connections.js').ConnectionRegistry | null = null
    const eventBus = createEventBus({
      eventLog,
      subscriptions,
      connections: {
        register: () => {
          throw new Error('not used by event bus')
        },
        unregister: () => undefined,
        size: () => connectionsRef?.size() ?? 0,
        sendTo: (id, payload) => connectionsRef?.sendTo(id, payload),
        broadcast: (predicate, payload) =>
          connectionsRef?.broadcast(predicate, payload),
        forEach: (fn) => connectionsRef?.forEach(fn),
      },
    })

    const methods = {
      ...makeWorkspaceHandlers({ workspaces, eventBus }),
      ...makeEventsHandlers({ eventLog, subscriptions }),
    }
    const dispatcher = createDispatcher({ methods })

    server = await startIpcServer({
      db,
      logger,
      bearerToken: token,
      port,
      host,
      dispatcher,
      subscriptions,
    })
    connectionsRef = server.connections

    writeRuntimeRegistry(dataDir, {
      pid: process.pid,
      port: server.port,
      host: server.host,
      bootedAt: Date.now(),
      daemonVersion: DYCODED_VERSION,
    })

    const shutdown = async () => {
      if (released) return
      released = true
      logger.info('shutting down dycoded')
      try {
        if (server) await server.close()
      } finally {
        if (db) closeDatabase(db)
        releaseLock(dataDir)
      }
    }

    return {
      dataDir,
      port: server.port,
      host: server.host,
      token,
      daemonVersion: DYCODED_VERSION,
      shutdown,
    }
  } catch (err) {
    if (server) await server.close()
    if (db) closeDatabase(db)
    if (!released) releaseLock(dataDir)
    throw err
  }
}
```

- [ ] **Step 4: Write `daemons/dycoded/src/cli.ts` (start-only for this task)**

```ts
import { boot } from './boot.js'
import { createLogger } from './logger.js'
import { installSignalHandlers } from './lifecycle.js'

export async function runCli(argv: readonly string[]): Promise<number> {
  const cmd = argv[0] ?? 'start'
  if (cmd === 'start') {
    const logger = createLogger()
    const handle = await boot({ logger })
    installSignalHandlers(logger, () => handle.shutdown())
    logger.info(
      {
        host: handle.host,
        port: handle.port,
        dataDir: handle.dataDir,
      },
      'dycoded ready',
    )
    // Keep the process alive on the libuv loop — the server holds an
    // open TCP listener, so we don't actually need a sentinel timer.
    return 0
  }
  process.stderr.write(`unknown subcommand: ${cmd}\n`)
  process.stderr.write('usage: dycoded [start|stop|status]\n')
  return 1
}
```

- [ ] **Step 5: Write `daemons/dycoded/bin/dycoded.mjs`**

```js
#!/usr/bin/env node
import { runCli } from '../dist/cli.js'

const code = await runCli(process.argv.slice(2))
if (typeof code === 'number' && code !== 0) process.exit(code)
```

Make it executable:

```bash
chmod +x daemons/dycoded/bin/dycoded.mjs
```

- [ ] **Step 6: Update `daemons/dycoded/src/index.ts`**

```ts
export { DYCODED_VERSION } from './version.js'
export { boot } from './boot.js'
export type { BootHandle, BootOptions } from './boot.js'
export { runCli } from './cli.js'
```

- [ ] **Step 7: Update `daemons/dycoded/tests/ipc/server.test.ts` to supply dispatcher + subscriptions**

Replace `startTestServer` with:

```ts
async function startTestServer() {
  const db = openDatabase(':memory:')
  runMigrations(db, ALL_MIGRATIONS)
  const subscriptions = (
    await import('../../src/ipc/subscriptions.js')
  ).createSubscriptionRegistry()
  const dispatcher = (await import('../../src/ipc/dispatcher.js')).createDispatcher({
    methods: {},
  })
  const handle = await startIpcServer({
    db,
    logger: silentLogger(),
    bearerToken: 'tok-abc',
    port: 0,
    host: '127.0.0.1',
    dispatcher,
    subscriptions,
  })
  handles.push({
    ...handle,
    close: async () => {
      await handle.close()
      closeDatabase(db)
    },
  })
  return handle
}
```

- [ ] **Step 8: Write `daemons/dycoded/tests/boot.test.ts`**

```ts
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { boot } from '../src/boot.js'
import { silentLogger } from '../src/logger.js'

describe('boot', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dycoded-boot-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('boots a real daemon and serves /health on the picked port', async () => {
    const handle = await boot({ dataDir: dir, logger: silentLogger() })
    try {
      const res = await fetch(`http://127.0.0.1:${handle.port}/health`)
      expect(res.status).toBe(200)
      const body = (await res.json()) as { ok: boolean }
      expect(body.ok).toBe(true)
    } finally {
      await handle.shutdown()
    }
  })

  it('writes runtime.json and auth.json under dataDir', async () => {
    const fs = await import('node:fs')
    const handle = await boot({ dataDir: dir, logger: silentLogger() })
    try {
      expect(fs.existsSync(join(dir, 'runtime.json'))).toBe(true)
      expect(fs.existsSync(join(dir, 'auth.json'))).toBe(true)
      const runtime = JSON.parse(
        fs.readFileSync(join(dir, 'runtime.json'), 'utf8'),
      ) as { port: number; pid: number }
      expect(runtime.port).toBe(handle.port)
      expect(runtime.pid).toBe(process.pid)
    } finally {
      await handle.shutdown()
    }
  })

  it('shutdown releases the lockfile and closes the port', async () => {
    const fs = await import('node:fs')
    const handle = await boot({ dataDir: dir, logger: silentLogger() })
    const port = handle.port
    await handle.shutdown()
    expect(fs.existsSync(join(dir, 'dycoded.lock'))).toBe(false)
    // port should be reusable immediately
    const res = await fetch(`http://127.0.0.1:${port}/health`).catch((e: Error) => e)
    expect(res).toBeInstanceOf(Error)
  })

  it('shutdown is idempotent', async () => {
    const handle = await boot({ dataDir: dir, logger: silentLogger() })
    await handle.shutdown()
    await expect(handle.shutdown()).resolves.toBeUndefined()
  })

  it('refuses to boot when a live lock for another live pid exists', async () => {
    const fs = await import('node:fs')
    fs.writeFileSync(
      join(dir, 'dycoded.lock'),
      JSON.stringify({ pid: 1, bootedAt: Date.now() }),
    )
    await expect(boot({ dataDir: dir, logger: silentLogger() })).rejects.toThrow(
      /already running/i,
    )
  })
})
```

- [ ] **Step 9: Build + run all daemon tests**

Run:
```bash
pnpm --filter @dycode/dycoded build
pnpm --filter @dycode/dycoded test
```

Expected: all tests pass (boot + every prior suite).

- [ ] **Step 10: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 11: Commit**

```bash
git add daemons/dycoded/src/ daemons/dycoded/bin/ daemons/dycoded/tests/boot.test.ts daemons/dycoded/tests/ipc/server.test.ts
git commit -m "feat(dycoded): wire boot + lifecycle + dispatcher into IPC server"
```

---

### Task 24 · `dycoded stop` / `dycoded status` subcommands

**Files:**
- Modify: `daemons/dycoded/src/cli.ts`
- Create: `daemons/dycoded/tests/cli.test.ts`

`status` reads `runtime.json` and prints a one-line summary (or "no daemon running" if absent / pid no longer alive). `stop` reads `runtime.json` and sends SIGTERM to the recorded pid, then polls the lockfile for up to 5 seconds. Both subcommands accept `--data-dir <path>` so tests can isolate state.

- [ ] **Step 1: Write the failing test `daemons/dycoded/tests/cli.test.ts`**

```ts
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runCli } from '../src/cli.js'

function captureStdout(fn: () => Promise<number>): Promise<{
  code: number
  out: string
  err: string
}> {
  return (async () => {
    let out = ''
    let err = ''
    const origOut = process.stdout.write
    const origErr = process.stderr.write
    process.stdout.write = ((chunk: string) => {
      out += chunk
      return true
    }) as never
    process.stderr.write = ((chunk: string) => {
      err += chunk
      return true
    }) as never
    try {
      const code = await fn()
      return { code, out, err }
    } finally {
      process.stdout.write = origOut
      process.stderr.write = origErr
    }
  })()
}

describe('cli', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dycoded-cli-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('status reports "no daemon" when runtime.json is missing', async () => {
    const r = await captureStdout(() => runCli(['status', '--data-dir', dir]))
    expect(r.code).toBe(0)
    expect(r.out).toMatch(/no daemon/i)
  })

  it('status reports pid + port when runtime.json exists', async () => {
    writeFileSync(
      join(dir, 'runtime.json'),
      JSON.stringify({
        pid: process.pid,
        port: 31000,
        host: '127.0.0.1',
        bootedAt: 1,
        daemonVersion: '0.0.0',
      }),
    )
    const r = await captureStdout(() => runCli(['status', '--data-dir', dir]))
    expect(r.code).toBe(0)
    expect(r.out).toMatch(new RegExp(`pid=${process.pid}`))
    expect(r.out).toMatch(/port=31000/)
  })

  it('status flags a stale runtime.json (pid no longer alive)', async () => {
    writeFileSync(
      join(dir, 'runtime.json'),
      JSON.stringify({
        pid: 2_147_483_647,
        port: 31000,
        host: '127.0.0.1',
        bootedAt: 1,
        daemonVersion: '0.0.0',
      }),
    )
    const r = await captureStdout(() => runCli(['status', '--data-dir', dir]))
    expect(r.code).toBe(0)
    expect(r.out).toMatch(/stale|not running/i)
  })

  it('stop reports "no daemon" when runtime.json is missing', async () => {
    const r = await captureStdout(() => runCli(['stop', '--data-dir', dir]))
    expect(r.code).toBe(0)
    expect(r.out).toMatch(/no daemon/i)
  })

  it('unknown subcommand exits non-zero with usage', async () => {
    const r = await captureStdout(() => runCli(['nope', '--data-dir', dir]))
    expect(r.code).toBe(1)
    expect(r.err).toMatch(/usage/i)
  })
})
```

- [ ] **Step 2: Run the test (should fail — subcommands not implemented)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/cli.test.ts
```

Expected: FAIL with most cases (status/stop not handled yet).

- [ ] **Step 3: Replace `daemons/dycoded/src/cli.ts`**

```ts
import { boot } from './boot.js'
import { createLogger } from './logger.js'
import { installSignalHandlers } from './lifecycle.js'
import { resolveDataDir } from './runtime/data-dir.js'
import { readRuntimeRegistry } from './runtime/registry.js'

function parseDataDir(argv: readonly string[]): string {
  const idx = argv.indexOf('--data-dir')
  if (idx >= 0 && typeof argv[idx + 1] === 'string') return argv[idx + 1]!
  return resolveDataDir()
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}

async function runStart(argv: readonly string[]): Promise<number> {
  const logger = createLogger()
  const dataDir = parseDataDir(argv)
  const handle = await boot({ dataDir, logger })
  installSignalHandlers(logger, () => handle.shutdown())
  logger.info(
    { host: handle.host, port: handle.port, dataDir: handle.dataDir },
    'dycoded ready',
  )
  return 0
}

function runStatus(argv: readonly string[]): number {
  const dataDir = parseDataDir(argv)
  const reg = readRuntimeRegistry(dataDir)
  if (reg === null) {
    process.stdout.write('no daemon running\n')
    return 0
  }
  if (!isAlive(reg.pid)) {
    process.stdout.write(
      `stale runtime.json (pid=${reg.pid} not running) at ${dataDir}\n`,
    )
    return 0
  }
  process.stdout.write(
    `dycoded pid=${reg.pid} port=${reg.port} host=${reg.host} ` +
      `version=${reg.daemonVersion}\n`,
  )
  return 0
}

async function runStop(argv: readonly string[]): Promise<number> {
  const dataDir = parseDataDir(argv)
  const reg = readRuntimeRegistry(dataDir)
  if (reg === null) {
    process.stdout.write('no daemon running\n')
    return 0
  }
  if (!isAlive(reg.pid)) {
    process.stdout.write(`daemon pid=${reg.pid} not running (stale registry)\n`)
    return 0
  }
  try {
    process.kill(reg.pid, 'SIGTERM')
  } catch (err) {
    process.stderr.write(`failed to signal pid=${reg.pid}: ${(err as Error).message}\n`)
    return 1
  }
  // Poll for the lockfile to disappear (up to 5s).
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    if (!isAlive(reg.pid)) break
    await new Promise((r) => setTimeout(r, 100))
  }
  if (isAlive(reg.pid)) {
    process.stderr.write(`daemon pid=${reg.pid} did not exit within 5s\n`)
    return 1
  }
  process.stdout.write(`stopped daemon pid=${reg.pid}\n`)
  return 0
}

export async function runCli(argv: readonly string[]): Promise<number> {
  const cmd = argv[0] ?? 'start'
  if (cmd === 'start') return runStart(argv.slice(1))
  if (cmd === 'status') return runStatus(argv.slice(1))
  if (cmd === 'stop') return runStop(argv.slice(1))
  process.stderr.write(`unknown subcommand: ${cmd}\n`)
  process.stderr.write('usage: dycoded [start|stop|status] [--data-dir <path>]\n')
  return 1
}
```

- [ ] **Step 4: Run the test (should pass)**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/cli.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 6: Commit**

```bash
git add daemons/dycoded/src/cli.ts daemons/dycoded/tests/cli.test.ts
git commit -m "feat(dycoded): add stop and status subcommands to the dycoded CLI"
```

---

### Task 25 · End-to-end test: spawn daemon + ipc-client roundtrip

**Files:**
- Create: `daemons/dycoded/tests/e2e/workspace-flow.test.ts`

The capstone test. It spawns `dycoded start --data-dir <tmp>` as a child process via `node_modules/.bin/dycoded`, polls `runtime.json` for the bound port + token, then drives the full happy path through `@dycode/ipc-client`: connect → subscribe → workspace.add → assert notification arrives → events.query → workspace.remove → events.query is empty (FK cascade) → close. Finally `dycoded stop`.

- [ ] **Step 1: Write `daemons/dycoded/tests/e2e/workspace-flow.test.ts`**

```ts
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DycodeClient } from '@dycode/ipc-client'

const BIN = join(__dirname, '..', '..', 'bin', 'dycoded.mjs')

async function waitForRuntimeJson(
  dataDir: string,
  timeoutMs = 5_000,
): Promise<{ port: number; token: string }> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const runtimePath = join(dataDir, 'runtime.json')
    const authPath = join(dataDir, 'auth.json')
    if (existsSync(runtimePath) && existsSync(authPath)) {
      const runtime = JSON.parse(readFileSync(runtimePath, 'utf8')) as {
        port: number
      }
      const auth = JSON.parse(readFileSync(authPath, 'utf8')) as { token: string }
      return { port: runtime.port, token: auth.token }
    }
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error('runtime.json did not appear in time')
}

describe('e2e: workspace flow', () => {
  let dir: string
  let proc: ChildProcess | null = null

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dycoded-e2e-'))
  })

  afterEach(async () => {
    if (proc && proc.exitCode === null) {
      proc.kill('SIGTERM')
      await new Promise<void>((r) => proc!.once('exit', () => r()))
    }
    rmSync(dir, { recursive: true, force: true })
  })

  it('runs the full workspace.add → notification → events.query → remove cycle', async () => {
    proc = spawn('node', [BIN, 'start', '--data-dir', dir], {
      env: { ...process.env, DYCODE_LOG_LEVEL: 'silent' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    proc.stderr?.on('data', (chunk) => {
      // Surface any startup errors to the test output.
      if (process.env['DYCODE_E2E_DEBUG']) process.stderr.write(chunk)
    })

    const { port, token } = await waitForRuntimeJson(dir)

    const client = new DycodeClient({ url: `ws://127.0.0.1:${port}/ws`, token })
    await client.connect()
    try {
      const received: unknown[] = []
      const sub = await client.subscribe(undefined, (n) => received.push(n))

      const added = (await client.request('workspace.add', {
        name: 'demo',
        rootPath: '/tmp/demo',
      })) as { workspace: { id: string; name: string } }
      expect(added.workspace.name).toBe('demo')

      // Wait briefly for the event.appended notification to arrive.
      await new Promise((r) => setTimeout(r, 100))
      expect(received.length).toBeGreaterThanOrEqual(1)

      const page = (await client.request('events.query', {
        workspaceId: added.workspace.id,
      })) as { events: unknown[] }
      expect(page.events.length).toBeGreaterThanOrEqual(1)

      const removed = (await client.request('workspace.remove', {
        workspaceId: added.workspace.id,
      })) as { ok: true }
      expect(removed.ok).toBe(true)

      // FK cascade — the workspace is gone, so the per-workspace event log
      // is empty too.
      const after = (await client.request('events.query', {
        workspaceId: added.workspace.id,
      })) as { events: unknown[] }
      expect(after.events.length).toBe(0)

      await sub.unsubscribe()
    } finally {
      await client.close()
    }
  }, 30_000)
})
```

- [ ] **Step 2: Add an ambient declaration so TypeScript accepts the bare specifier `@dycode/ipc-client` from this test file**

The package's `tsconfig.test.json` already includes references through `@dycode/contracts`. Add `@dycode/ipc-client` as a workspace dep in the daemon's `package.json` (devDeps so it's not shipped):

Run:
```bash
pnpm --filter @dycode/dycoded add -D @dycode/ipc-client@workspace:*
```

Then add the reference in `daemons/dycoded/tsconfig.test.json` — replace the file:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": ".tsc-tests",
    "tsBuildInfoFile": ".tsc-tests/.tsbuildinfo"
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["dist", ".tsc-tests", "node_modules"],
  "references": [
    { "path": "../../packages/contracts/tsconfig.build.json" },
    { "path": "../../packages/ipc-client/tsconfig.build.json" }
  ]
}
```

- [ ] **Step 3: Build everything (E2E requires the compiled `bin/dycoded.mjs`'s target — `dist/cli.js`)**

Run:
```bash
pnpm --filter @dycode/contracts build
pnpm --filter @dycode/ipc-client build
pnpm --filter @dycode/dycoded build
```

Expected: all three packages have populated `dist/` directories.

- [ ] **Step 4: Run the E2E test**

Run:
```bash
pnpm --filter @dycode/dycoded test -- tests/e2e/workspace-flow.test.ts
```

Expected: PASS, 1 test. (If it hangs, set `DYCODE_E2E_DEBUG=1` to surface daemon stderr.)

- [ ] **Step 5: Run the full suite**

Run:
```bash
pnpm --filter @dycode/dycoded test
pnpm --filter @dycode/ipc-client test
```

Expected: all tests pass.

- [ ] **Step 6: Verify pipeline**

Run:
```bash
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 7: Commit**

```bash
git add daemons/dycoded/tests/e2e/ daemons/dycoded/tsconfig.test.json daemons/dycoded/package.json pnpm-lock.yaml
git commit -m "test(dycoded): add end-to-end workspace flow over @dycode/ipc-client"
```

---

### Task 26 · Package maps + deep docs

**Files:**
- Create: `daemons/dycoded/CLAUDE.md`
- Create: `daemons/dycoded/AGENTS.md`
- Create: `packages/ipc-client/CLAUDE.md`
- Create: `packages/ipc-client/AGENTS.md`
- Create: `docs/architecture/daemon.md`
- Create: `docs/architecture/ipc-client.md`

Each map is ≤100 lines and is a TOC into source / deep docs. Deep docs go into `docs/architecture/`.

- [ ] **Step 1: Write `daemons/dycoded/CLAUDE.md`**

```markdown
# @dycode/dycoded — agent map

> Sidecar daemon. Owns persistence + the WebSocket JSON-RPC IPC surface.
> ≤100 lines by design.

## Stack

- Node 22 · TypeScript 5.7 strict · ESM
- Hono 4 · @hono/node-server · @hono/node-ws (HTTP root, WS via raw `ws`)
- better-sqlite3 11 · pino 9 · ulid 2
- Vitest 2 for unit + integration + E2E

## Hard constraints

1. Wire-format schemas come from `@dycode/contracts`. Never re-declare envelope
   / params / result / notification shapes here.
2. Single-threaded orchestrator. No worker threads until Plan 04+.
3. Migrations are forward-only. Append entries to `ALL_MIGRATIONS` — never
   edit a released migration in place.
4. Every IPC handler is built by a factory that takes its deps. No module-
   level singletons except the migration list.
5. In-memory SQLite for unit tests (`:memory:`). E2E uses a tmp `DYCODE_DATA_DIR`.
6. The lockfile + runtime.json contract under `~/.dycode/` is **the** discovery
   surface for the Electron app. Don't break the shape — bump
   `DYCODED_VERSION` major if you must.

## Where to look

- **Boot pipeline** → `src/boot.ts` (composition root) · `src/cli.ts`
- **Runtime contract** → `src/runtime/` (port, auth, registry, lockfile)
- **Persistence** → `src/persistence/` (db, migrate, migrations/, repos)
- **IPC server** → `src/ipc/server.ts` (Hono + WS upgrade + auth)
- **Dispatcher** → `src/ipc/dispatcher.ts` · `src/ipc/error-mapper.ts`
- **Handlers** → `src/ipc/handlers/` (one file per method namespace)
- **Subscriptions** → `src/ipc/subscriptions.ts` (filter-matching broadcaster)
- **Event bus** → `src/event-bus.ts` (the only thing that writes event_log)
- **Deep docs** → `docs/architecture/daemon.md`

## First commands

```bash
pnpm --filter @dycode/dycoded build       # tsc -b → dist/
pnpm --filter @dycode/dycoded test        # vitest run
node daemons/dycoded/bin/dycoded.mjs start # run a live daemon
node daemons/dycoded/bin/dycoded.mjs status
node daemons/dycoded/bin/dycoded.mjs stop
```

Override the data dir for non-default boots: `DYCODE_DATA_DIR=/tmp/foo`.
```

- [ ] **Step 2: Write `daemons/dycoded/AGENTS.md`**

```markdown
# @dycode/dycoded — agents

Mirror of `CLAUDE.md` with the same TOC. The daemon is the only process that
talks to SQLite. Renderer + adapters cross its IPC boundary.

Read `CLAUDE.md` for the full map.

## Quick orientation

- Entry point: `bin/dycoded.mjs` → `src/cli.ts::runCli` → `src/boot.ts::boot`.
- Every event the daemon emits goes through `src/event-bus.ts`. Search for
  `eventBus.emit(` to find every emission site.
- Subscriptions are in-memory only. They die with the daemon process. The
  event_log table is the durable record.
- All wire-format contracts: `packages/contracts`. All adapter contracts:
  `packages/adapter-sdk`. The daemon imports both — never declare a wire
  type locally.
```

- [ ] **Step 3: Write `packages/ipc-client/CLAUDE.md`**

```markdown
# @dycode/ipc-client — agent map

> Typed WebSocket JSON-RPC 2.0 client for the dycoded daemon.
> ≤100 lines by design.

## Stack

- Node 22 · TypeScript 5.7 strict · ESM
- `ws` 8 (Node-only — no browser shim yet)
- ulid 2 (request ids)
- Consumes Zod schemas from `@dycode/contracts`

## Who uses it

- The Electron app's renderer (via the preload bridge — Plan 05+)
- Integration tests against the running daemon
- The future web/mobile companion (same protocol, same package)

## Hard constraints

1. The client never reaches into the daemon's process state. It uses the
   public WS surface only.
2. Every wire-format read is validated against `@dycode/contracts` schemas.
   Anything that doesn't match a schema is dropped silently — this is by
   design (forward-compat).
3. The token is supplied at construction time. The client does not read
   `~/.dycode/auth.json` itself — that's the caller's job.
4. Reconnect logic is **not** in scope for v0. Callers handle close events.

## Where to look

- **`DycodeClient` class** → `src/client.ts`
- **Request correlation** → `src/request.ts` (pending map + ULID ids)
- **Subscription types** → `src/subscriptions.ts`
- **Deep docs** → `docs/architecture/ipc-client.md`

## First commands

```bash
pnpm --filter @dycode/ipc-client build
pnpm --filter @dycode/ipc-client test
```
```

- [ ] **Step 4: Write `packages/ipc-client/AGENTS.md`**

```markdown
# @dycode/ipc-client — agents

Mirror of `CLAUDE.md`. Read it for the full map.

## Quick orientation

- One class: `DycodeClient`. Public surface: `connect`, `close`, `isOpen`,
  `request`, `subscribe`, `onNotification`.
- `request` is method-stringly-typed at runtime. Plan 04+ will narrow the
  method-name TS overloads using the `MethodName` enum from contracts.
- Subscriptions are server-pre-filtered. The client fans out incoming
  notifications to every active subscription listener — that's fine because
  the server only sends notifications to filters that matched.
```

- [ ] **Step 5: Write `docs/architecture/daemon.md`**

```markdown
# `dycoded` daemon — architecture deep doc

> Plan 03 (this) lays down the skeleton. Adapter host + concrete adapters
> arrive in Plan 04. Read this alongside `daemons/dycoded/CLAUDE.md`.

## 1 · On-disk runtime contract

Under `$DYCODE_DATA_DIR` (default `~/.dycode/`):

- `dycoded.sqlite` — the database (WAL + foreign_keys ON).
- `dycoded.lock` — `{ pid, bootedAt }`, mode 0600. Refuses to overwrite a
  live lock. Stale locks (pid no longer alive) are auto-stolen at boot.
- `auth.json` — `{ token, createdAt }`, mode 0600. Rewritten on every boot.
- `runtime.json` — `{ pid, port, host, bootedAt, daemonVersion }`. The
  Electron app reads this to learn where to connect.

## 2 · Boot pipeline (`src/boot.ts`)

```
resolveDataDir → acquireLock → openDatabase → runMigrations →
  buildRepos → buildSubscriptions → pickFreePort → writeAuthToken →
  buildEventBus → buildDispatcher (workspace.* + events.* handlers) →
  startIpcServer → writeRuntimeRegistry → return BootHandle
```

Shutdown reverses this in best-effort fashion: `closeServer → closeDb →
releaseLock`.

## 3 · IPC surface (Plan 03 subset of spec §6.2)

- `workspace.add` · `workspace.list` · `workspace.activate` · `workspace.remove`
- `events.subscribe` · `events.unsubscribe` · `events.query`

Everything else (`adapter.*`, `runtime.*`, `squad.*`, `pool.*`, `task.*`)
arrives in Plan 04 once the adapter host lands.

## 4 · Event log conventions (transitional)

Plan 03 emits workspace lifecycle as `type: 'output'` events with a
discriminated `payload.kind`:

- `workspace.added` · `workspace.activated` · `workspace.removed`

Plan 04 may introduce a richer event taxonomy in `@dycode/contracts`. Once
that lands, this file becomes the migration story.

## 5 · Subscription model

Subscriptions are in-memory only. They die with the daemon process. Clients
re-subscribe after reconnecting. The event_log table is the durable record
for replay (queryable via `events.query`).

`SubscriptionRegistry.targetsFor(event)` returns the unique set of
`connectionId`s that should receive a notification for that event. The
`EventBus` calls `targetsFor` once per emission and broadcasts via
`ConnectionRegistry.sendTo`.

## 6 · Concurrency

Single-threaded — every state mutation passes through the JS event loop.
No worker threads, no native concurrent writers. SQLite is single-writer
under WAL; that's fine because every write originates inside the daemon.

If a hot path becomes a bottleneck the §3.5 escape hatch applies: rewrite
that one slice in Rust behind the same JSON-RPC contract.

## 7 · Plan 04 hooks

The places Plan 04 needs to extend:

- `boot.ts` — register adapter-host wiring + adapter.* / task.* handlers
- `persistence/migrations/` — add 003 agents, 004 squads, 005 tasks, etc.
- `event-bus.ts` — fan out task.stateChanged / agent.statusChanged etc.
- `cli.ts` — add subcommands (e.g. `dycoded adapter list`)
```

- [ ] **Step 6: Write `docs/architecture/ipc-client.md`**

```markdown
# `@dycode/ipc-client` — architecture deep doc

> Read alongside `packages/ipc-client/CLAUDE.md`.

## 1 · What it does

Speaks the dycode IPC protocol (spec §6) to a running `dycoded` daemon over
a single WebSocket. Validates every wire message against the Zod schemas
from `@dycode/contracts`.

## 2 · Public surface

```ts
import { DycodeClient } from '@dycode/ipc-client'

const client = new DycodeClient({ url: 'ws://127.0.0.1:<port>/ws', token: '<bearer>' })
await client.connect()

const list = await client.request('workspace.list', {})
const sub = await client.subscribe({ workspaceId: 'ws_…' }, (n) => console.log(n))
await sub.unsubscribe()
await client.close()
```

## 3 · Request correlation

Each `request()` mints a ULID id and stores `{ resolve, reject, timer }` in
a pending map. Incoming response envelopes are matched by id. Anything
without an id is treated as a notification and dispatched to registered
listeners.

Default per-request timeout: 10 000 ms. Override with
`new DycodeClient({ url, token, requestTimeoutMs })`.

## 4 · Bearer auth

The token is appended to the URL as `?token=<…>` **and** sent as an
`Authorization: Bearer <…>` header. The daemon accepts either; this client
sends both for robustness.

## 5 · What's not in v0

- Auto-reconnect with backoff (callers handle close events)
- Browser bundle (we depend on the Node-only `ws` package)
- Strongly-typed `request<M>()` overloads (Plan 04 narrows via `MethodName`)
- Streaming/binary payloads (the protocol is JSON-only)
```

- [ ] **Step 7: Verify pipeline (no code changes, just docs — format check still applies)**

Run:
```bash
pnpm format
bash scripts/verify.sh
```

Expected: all gates green.

- [ ] **Step 8: Commit**

```bash
git add daemons/dycoded/CLAUDE.md daemons/dycoded/AGENTS.md packages/ipc-client/CLAUDE.md packages/ipc-client/AGENTS.md docs/architecture/daemon.md docs/architecture/ipc-client.md
git commit -m "docs: add daemon + ipc-client maps and architecture deep docs"
```

---

### Task 27 · Close-out: root `CLAUDE.md`, `feature_list.json`, `PROGRESS.md`, tag

**Files:**
- Modify: `CLAUDE.md` (root)
- Modify: `feature_list.json`
- Modify: `PROGRESS.md` (or create)
- Create: tag `v0.0.3-plan-03`

Final hygiene pass: root map links to the new docs, feature list reflects F08–F14 = `passing`, PROGRESS entry summarizes Plan 03, tag the close.

- [ ] **Step 1: Update the "Where to look" section in `CLAUDE.md` (root)**

In the existing list, add these entries (in the order shown):

```markdown
- **Daemon** → `docs/architecture/daemon.md` · package: `daemons/dycoded/CLAUDE.md`
- **IPC client** → `docs/architecture/ipc-client.md` · package: `packages/ipc-client/CLAUDE.md`
```

Update the "Layout (current)" section by replacing it with:

```markdown
## Layout (current)

\`\`\`
dycode/
├── apps/                     # (Plan 05+) Electron app
├── daemons/
│   └── dycoded/              # @dycode/dycoded — sidecar daemon
├── packages/
│   ├── contracts/            # @dycode/contracts — wire schemas + types
│   ├── adapter-sdk/          # @dycode/adapter-sdk — adapter plugin contract
│   └── ipc-client/           # @dycode/ipc-client — typed WS client
├── scripts/
│   ├── init.sh
│   └── verify.sh
├── docs/
│   ├── architecture/         # deep docs (daemon, ipc-client)
│   ├── adapters/
│   ├── ipc-protocol/
│   └── superpowers/
│       ├── specs/
│       └── plans/
└── feature_list.json         # scope of record
\`\`\`

Future layout (added by Plans 04+): `apps/dycode`, `packages/ui`,
`adapters/*` (claude-code, codex, opencode, verifiers).
```

(Escape the inner backticks per the existing file's pattern. If the file
already uses triple-backticks, use them verbatim — this plan-page just
escapes them so they render inside this Markdown.)

- [ ] **Step 2: Update `feature_list.json` — append F08–F14**

Add the following entries to the existing array (after F07):

```json
{
  "id": "F08",
  "behavior": "dycoded boots cleanly: acquires lockfile, generates a fresh bearer token, picks a free port, writes runtime.json + auth.json under DYCODE_DATA_DIR.",
  "verification": "pnpm --filter @dycode/dycoded test -- tests/boot.test.ts",
  "state": "passing",
  "evidence": "Plan 03 · Task 23",
  "blocked_by": null
},
{
  "id": "F09",
  "behavior": "Forward-only SQLite migrations apply in order, each inside a transaction that includes its integrity verify step; second boot is a no-op.",
  "verification": "pnpm --filter @dycode/dycoded test -- tests/persistence/migrate.test.ts tests/persistence/migrations.test.ts",
  "state": "passing",
  "evidence": "Plan 03 · Tasks 08-10",
  "blocked_by": null
},
{
  "id": "F10",
  "behavior": "workspace.add, workspace.list, workspace.activate, workspace.remove JSON-RPC methods round-trip via @dycode/ipc-client; every mutation appends to event_log.",
  "verification": "pnpm --filter @dycode/dycoded test -- tests/ipc/handlers/workspace.test.ts",
  "state": "passing",
  "evidence": "Plan 03 · Tasks 17-18",
  "blocked_by": null
},
{
  "id": "F11",
  "behavior": "events.subscribe, events.unsubscribe, events.query work with filter shape {workspaceId?, taskId?, agentId?}; matching event_log inserts trigger event.appended notifications to subscribed clients.",
  "verification": "pnpm --filter @dycode/dycoded test -- tests/ipc/handlers/events.test.ts tests/ipc/subscriptions.test.ts",
  "state": "passing",
  "evidence": "Plan 03 · Tasks 16, 19, 20",
  "blocked_by": null
},
{
  "id": "F12",
  "behavior": "@dycode/ipc-client is a typed JSON-RPC client; client.request(method, params) resolves with the typed result, client.subscribe(filter, cb) streams typed notifications and returns a handle whose unsubscribe() tears down both sides.",
  "verification": "pnpm --filter @dycode/ipc-client test",
  "state": "passing",
  "evidence": "Plan 03 · Tasks 21-22",
  "blocked_by": null
},
{
  "id": "F13",
  "behavior": "End-to-end test spawns dycoded as a child process, connects via @dycode/ipc-client, drives workspace.add → events.subscribe → notification arrival → events.query → workspace.remove → cascade purges per-workspace events.",
  "verification": "pnpm --filter @dycode/dycoded test -- tests/e2e/workspace-flow.test.ts",
  "state": "passing",
  "evidence": "Plan 03 · Task 25",
  "blocked_by": null
},
{
  "id": "F14",
  "behavior": "Full workspace verify.sh exits 0 on the Plan 03 deliverable (contracts + adapter-sdk + dycoded + ipc-client all type-checked, lint-clean, format-clean, all tests passing).",
  "verification": "bash scripts/verify.sh",
  "state": "passing",
  "evidence": "Plan 03 close-out",
  "blocked_by": null
}
```

- [ ] **Step 3: Append the Plan 03 entry to `PROGRESS.md`** (create the file if it does not exist)

```markdown
## 2026-MM-DD · Plan 03 close — `dycoded` daemon skeleton

**Branch:** `feat/plan-03-daemon-skeleton`
**Tag:** `v0.0.3-plan-03`

### Shipped

- `daemons/dycoded` package — boot, lockfile, runtime registry, auth token,
  SQLite + forward-only migrations, Hono HTTP + WS JSON-RPC with bearer
  auth, dispatcher + error mapper, subscription registry, workspace.* and
  events.* method handlers, CLI subcommands (start / status / stop).
- `packages/ipc-client` package — `DycodeClient` with bearer auth,
  ULID-correlated `request()`, and filter-aware `subscribe()`.
- Two migrations: `001-workspaces`, `002-event-log` (with FK cascade and
  paginated query indexes).
- End-to-end test spawns the real daemon and exercises the full surface.

### Feature list deltas

F08–F14 added and `passing`. F07 remains the last Plan 02 deliverable.

### Deferred to later plans

- Adapter plugin host + sandbox + capability negotiation → Plan 04
- Concrete adapters (claude-code, codex, opencode, verifiers) → Plan 04+
- `adapter.*`, `runtime.*`, `squad.*`, `pool.*`, `task.*` handlers → Plan 04+
- Agents / Squads / Tasks SQLite tables → Plan 04 (added when needed)
- Electron renderer + sidecar spawn → Plan 05+

### Next plan

Plan 04 — Adapter plugin host + first concrete adapter (claude-code) wired
end-to-end through `task.create → task.run → events`. Will likely add
migrations 003 (agents), 004 (squads + squad_members), 005 (tasks).
```

Replace `2026-MM-DD` with the actual close-out date.

- [ ] **Step 4: Final full verify pipeline**

Run:
```bash
pnpm install
pnpm --filter @dycode/contracts build
pnpm --filter @dycode/ipc-client build
pnpm --filter @dycode/dycoded build
bash scripts/verify.sh
```

Expected: all four gates green.

- [ ] **Step 5: Commit the close-out**

```bash
git add CLAUDE.md feature_list.json PROGRESS.md
git commit -m "docs: close Plan 03 (daemon + ipc-client shipped)"
```

- [ ] **Step 6: Tag the release**

```bash
git tag -a v0.0.3-plan-03 -m "Plan 03 close — dycoded daemon skeleton + ipc-client"
```

- [ ] **Step 7: Push branch + tag**

```bash
git push origin feat/plan-03-daemon-skeleton
git push origin v0.0.3-plan-03
```

(Don't push to `main` directly — open a PR and let CI run `verify.sh`. The
reviewer protocol — gate 5 — gates the merge per repo rule.)

- [ ] **Step 8: Final self-check**

Skim through the diff one last time:

```bash
git log --oneline main..HEAD
git diff main..HEAD --stat
```

Spot-check expectations:
- ~27 commits, one per task, conventional-commit style, no `Co-Authored-By`
  lines naming any LLM.
- New top-level dirs: `daemons/dycoded/`, `packages/ipc-client/`,
  `docs/architecture/`.
- Modified: `pnpm-workspace.yaml`, root `CLAUDE.md`, `feature_list.json`,
  `PROGRESS.md`.

---

## What "done" looks like for Plan 03

- `./scripts/verify.sh` exits 0 locally on a clean clone of the branch.
- CI workflow reports green for the latest push to
  `feat/plan-03-daemon-skeleton`.
- `daemons/dycoded` ships the full skeleton (boot, persistence, IPC server,
  workspace.* + events.* handlers, CLI subcommands).
- `@dycode/ipc-client` exports a typed client that round-trips against the
  real daemon in an E2E test.
- `feature_list.json` has F08–F14 all `"passing"`.
- `PROGRESS.md` has a closing Plan 03 entry.
- Tag `v0.0.3-plan-03` exists on the branch.
- Root `CLAUDE.md` "Where to look" links resolve to real files (no `(Plan 03+)`
  placeholders for the daemon / ipc-client entries).

Once all of these are true, the branch is ready to merge into `main` and
Plan 04 (adapter host + first concrete adapter) can begin.
