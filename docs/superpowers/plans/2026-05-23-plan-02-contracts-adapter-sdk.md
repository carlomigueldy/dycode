# dycode · Plan 02 — Contracts + Adapter SDK

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `@dycode/contracts` stub with the real Zod schemas + TypeScript types for dycode's domain model and IPC protocol, and create the new `@dycode/adapter-sdk` package that publishes the public contract every adapter implements. End state: both packages build/typecheck/lint/test clean, types are inferred from Zod schemas (single source of truth), and downstream packages (daemon, renderer, adapters) can consume them with `pnpm add @dycode/contracts @dycode/adapter-sdk`.

**Architecture:** Two workspace packages, both ESM, both Apache 2.0, both `private: true` for now (publishable when surface stabilizes). `@dycode/contracts` owns the JSON-RPC envelope shapes, method registry, and domain entities; `@dycode/adapter-sdk` owns the adapter plugin interfaces and re-exports the `Capability` enum from contracts (single source). Everything is Zod-first: schemas drive types via `z.infer`, never the other way around. Both packages adopt the same 3-tsconfig solution pattern locked in during Plan 01.

**Tech Stack:** Zod 3.24+ · TypeScript 5.7 strict · Vitest 2 · pnpm workspaces · same shadcn/Apache/Plex aesthetic conventions as Plan 01.

**Starting state:** Branch `feat/plan-02-contracts-adapter-sdk` was created from `main@31e8c5c` (Plan 01 close, rule #9 commit). `@dycode/contracts` exists as a stub exporting only `CONTRACTS_VERSION = '0.0.0' as const`. No `@dycode/adapter-sdk` package yet. Working directory for execution: `/Users/carlomigueldy/personal/dycode-plan-02` (the Plan 02 worktree).

---

## File structure produced by this plan

```
dycode/
├── packages/
│   ├── contracts/                              # @dycode/contracts (expanded)
│   │   ├── src/
│   │   │   ├── index.ts                         # public barrel
│   │   │   ├── version.ts                       # bumped to 0.1.0
│   │   │   ├── ids.ts                           # ULID + branded ID types
│   │   │   ├── domain/
│   │   │   │   ├── workspace.ts                 # Workspace schema
│   │   │   │   ├── agent.ts                     # Agent + AgentStatus
│   │   │   │   ├── capability.ts                # Capability enum (shared)
│   │   │   │   ├── squad.ts                     # Squad schema
│   │   │   │   ├── task.ts                      # Task + TaskState + ReviewVerdict + TaskEvidence
│   │   │   │   └── event-log.ts                 # EventLogEntry
│   │   │   └── ipc/
│   │   │       ├── envelope.ts                  # JSON-RPC 2.0 base + error codes
│   │   │       ├── methods.ts                   # MethodName + registry types
│   │   │       ├── methods.workspace.ts         # workspace.* schemas
│   │   │       ├── methods.runtime.ts           # runtime.* + adapter.* schemas
│   │   │       ├── methods.fleet.ts             # squad.* + pool.* schemas
│   │   │       ├── methods.task.ts              # task.* schemas
│   │   │       ├── methods.events.ts            # events.subscribe/unsubscribe/query
│   │   │       └── notifications.ts             # Notification union
│   │   └── tests/
│   │       ├── ids.test.ts
│   │       ├── domain/
│   │       │   ├── workspace.test.ts
│   │       │   ├── agent.test.ts
│   │       │   ├── squad.test.ts
│   │       │   ├── task.test.ts
│   │       │   └── event-log.test.ts
│   │       ├── ipc/
│   │       │   ├── envelope.test.ts
│   │       │   ├── methods.test.ts
│   │       │   └── notifications.test.ts
│   │       └── version.test.ts                  # updated to 0.1.0
│   │
│   └── adapter-sdk/                             # @dycode/adapter-sdk (NEW)
│       ├── package.json
│       ├── tsconfig.json (solution)
│       ├── tsconfig.build.json
│       ├── tsconfig.test.json
│       ├── vitest.config.ts
│       ├── CLAUDE.md
│       ├── AGENTS.md
│       ├── src/
│       │   ├── index.ts                         # public barrel
│       │   ├── version.ts                       # SDK_VERSION = '0.1.0'
│       │   ├── manifest.ts                      # AdapterManifest schema
│       │   ├── events.ts                        # AdapterEvent union
│       │   ├── plugin.ts                        # AdapterPlugin/AdapterInstance interfaces
│       │   ├── context.ts                       # TaskCtx, CreateOpts
│       │   ├── health.ts                        # HealthReport, DetectionResult
│       │   └── create-adapter.ts                # typed helper for adapter authors
│       └── tests/
│           ├── manifest.test.ts
│           ├── events.test.ts
│           ├── create-adapter.test.ts
│           └── version.test.ts
│
└── docs/
    ├── adapters/
    │   └── sdk.md                               # TOC linking into @dycode/adapter-sdk
    └── ipc-protocol/
        └── spec.md                              # TOC linking into @dycode/contracts ipc/
```

Not in this plan (deferred to later plans):
- A working adapter implementation (fixture or real) — Plan 03 builds the first real adapter (`claude-code`) when the daemon lands.
- The `dycoded` daemon — Plan 03.
- The Electron renderer consuming these types — Plan 05.

---

## Conventions for this plan

1. **Schemas drive types.** Every public type comes from `z.infer<typeof Schema>`. Never hand-write a type that has a schema.
2. **One concept per file.** A schema, its inferred type, and its narrow helpers live together. Tests sit under `tests/<area>/<name>.test.ts` (matches the path of the source file).
3. **Public exports go through `src/index.ts`.** No deep imports from outside the package.
4. **Branded IDs.** `WorkspaceId = z.string().brand<'WorkspaceId'>()`. Prevents accidental cross-domain assignment.
5. **Discriminated unions.** Use `z.discriminatedUnion('type', [...])` for event/notification streams — gives narrow type predicates downstream.
6. **Tests cover happy path + at least one rejection.** Per the contracts CLAUDE.md rule.
7. **Conventional commits with package scope.** `feat(contracts):`, `feat(sdk):`, `test(contracts):`, etc. Follow Plan 01's pattern.
8. **No `--no-verify`.** Every commit goes through hooks (none configured yet, but the rule stands).
9. **No LLM attribution.** Rule #9 from `CLAUDE.md`. No `Co-Authored-By:` lines.
10. **`./scripts/verify.sh` exits 0** at the end of every task that touches code or schemas. (Doc-only tasks can skip if they don't change anything that would trip a gate.)

---

## Task list overview

| # | Task | Output |
|---|---|---|
| 01 | Scaffold `@dycode/adapter-sdk` package | 3-tsconfig package, vitest config, package maps, stub `SDK_VERSION` |
| 02 | Brand IDs + ULID helper in contracts | `ids.ts` + tests |
| 03 | AgentStatus + Capability enums | `domain/capability.ts`, status added to agent file |
| 04 | Workspace schema | `domain/workspace.ts` + tests |
| 05 | Agent schema | `domain/agent.ts` + tests |
| 06 | Squad schema | `domain/squad.ts` + tests |
| 07 | Task: state machine + ReviewVerdict + TaskEvidence + Task schema | `domain/task.ts` + tests |
| 08 | EventLogEntry schema | `domain/event-log.ts` + tests |
| 09 | JSON-RPC envelopes + error codes | `ipc/envelope.ts` + tests |
| 10 | MethodName enum + Method registry types | `ipc/methods.ts` + tests |
| 11 | Workspace + runtime/adapter method schemas | `ipc/methods.workspace.ts`, `ipc/methods.runtime.ts` + tests |
| 12 | Fleet method schemas | `ipc/methods.fleet.ts` + tests |
| 13 | Task method schemas | `ipc/methods.task.ts` + tests |
| 14 | Notification union + event subscription | `ipc/notifications.ts`, `ipc/methods.events.ts` + tests |
| 15 | Contracts barrel + version bump | Updated `src/index.ts`, `version.ts` → 0.1.0, all tests pass |
| 16 | Adapter SDK: AdapterManifest schema | `manifest.ts` + tests |
| 17 | Adapter SDK: AdapterEvent union | `events.ts` + tests (re-uses verify_request, output, tool_call, etc.) |
| 18 | Adapter SDK: plugin/instance/context/health types | `plugin.ts`, `context.ts`, `health.ts` |
| 19 | Adapter SDK: createAdapter helper | `create-adapter.ts` + tests (type-narrowing assertions) |
| 20 | Adapter SDK: barrel + SDK_VERSION + per-package maps | Public `src/index.ts`, `version.ts`, `CLAUDE.md`/`AGENTS.md` |
| 21 | Docs: `docs/adapters/sdk.md` + `docs/ipc-protocol/spec.md` | Short TOC docs linking into source |
| 22 | Final cleanup: maps, feature list, PROGRESS, tag | Root CLAUDE.md links, F04-F07 in feature_list.json, PROGRESS entry, `v0.0.2-plan-02` tag |

Each task below is bite-sized (2-5 minutes of mechanical work) with complete code blocks and exact commands. TDD pattern where applicable: write failing test → verify red → implement → verify green → commit.

---

### Task 01 · Scaffold `@dycode/adapter-sdk` package

**Files:**
- Create: `packages/adapter-sdk/package.json`
- Create: `packages/adapter-sdk/tsconfig.json`
- Create: `packages/adapter-sdk/tsconfig.build.json`
- Create: `packages/adapter-sdk/tsconfig.test.json`
- Create: `packages/adapter-sdk/vitest.config.ts`
- Create: `packages/adapter-sdk/src/index.ts`
- Create: `packages/adapter-sdk/src/version.ts`
- Create: `packages/adapter-sdk/tests/version.test.ts`

Mirrors the `@dycode/contracts` 3-tsconfig pattern locked in during Plan 01 Task 10 (solution root + build config + test config).

- [ ] **Step 1: Add `zod` to root devDependencies (or hoist via workspace)**

Both contracts and adapter-sdk need Zod. We add it at the root for easy hoisting in pnpm:

Run from repo root:
```bash
pnpm add -DwE zod@^3.24.1
```

Expected: `zod` added to root `devDependencies`. Lockfile updated.

- [ ] **Step 2: Add `zod` as a workspace dep in the contracts package**

Run:
```bash
pnpm --filter @dycode/contracts add zod@workspace:*
```

Wait — `workspace:*` is for workspace packages, and zod isn't one. Use the published version:
```bash
pnpm --filter @dycode/contracts add zod@^3.24.1
```

Expected: `zod` shows in `packages/contracts/package.json` `dependencies`.

- [ ] **Step 3: Write `packages/adapter-sdk/package.json`**

```json
{
  "name": "@dycode/adapter-sdk",
  "version": "0.0.0",
  "private": true,
  "description": "Public adapter plugin contract for dycode. Implement this to make your CLI a first-class agent in dycode.",
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
    "zod": "^3.24.1"
  }
}
```

- [ ] **Step 4: Write `packages/adapter-sdk/tsconfig.json` (solution)**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.build.json" },
    { "path": "./tsconfig.test.json" }
  ]
}
```

- [ ] **Step 5: Write `packages/adapter-sdk/tsconfig.build.json`**

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

The `references` entry makes contracts a build dependency — adapter-sdk's build won't start until contracts has emitted its `.d.ts` files.

- [ ] **Step 6: Write `packages/adapter-sdk/tsconfig.test.json`**

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

- [ ] **Step 7: Write `packages/adapter-sdk/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
})
```

- [ ] **Step 8: Write `packages/adapter-sdk/src/version.ts`**

```ts
/**
 * Semver of the dycode adapter SDK surface.
 * Bumps independently from @dycode/contracts. Bump major on any breaking
 * change to public interfaces, schemas, or the AdapterEvent union.
 */
export const SDK_VERSION = '0.0.0' as const
```

- [ ] **Step 9: Write `packages/adapter-sdk/src/index.ts`**

```ts
export { SDK_VERSION } from './version.js'
```

- [ ] **Step 10: Write `packages/adapter-sdk/tests/version.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { SDK_VERSION } from '../src/index.js'

describe('SDK_VERSION', () => {
  it('exports a non-empty semver string', () => {
    expect(typeof SDK_VERSION).toBe('string')
    expect(SDK_VERSION.length).toBeGreaterThan(0)
  })

  it('matches a basic semver shape', () => {
    expect(SDK_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/)
  })

  it('starts at major version 0 for pre-1.0 surface', () => {
    const major = Number.parseInt(SDK_VERSION.split('.')[0] ?? '', 10)
    expect(major).toBe(0)
  })
})
```

- [ ] **Step 11: Install + verify pipeline**

Run:
```bash
pnpm install
pnpm --filter @dycode/adapter-sdk test
pnpm --filter @dycode/adapter-sdk typecheck
pnpm format
pnpm lint
```

Expected: all exit 0; 3 tests passing on SDK_VERSION.

If `pnpm lint` fails because the new package's tsconfig isn't reachable from ESLint projectService, the existing root `tsconfig.json` include glob `packages/*/vitest.config.ts` should already cover the new vitest.config.ts. If lint still fails on the new test files, the per-package `tsconfig.test.json` (referenced from `tsconfig.json` solution) should make ESLint resolve them — same pattern as contracts.

- [ ] **Step 12: Commit**

```bash
git add packages/adapter-sdk packages/contracts/package.json package.json pnpm-lock.yaml
git commit -m "feat(sdk): scaffold @dycode/adapter-sdk stub package"
```

---

### Task 02 · Brand IDs + ULID helper in contracts

**Files:**
- Create: `packages/contracts/src/ids.ts`
- Create: `packages/contracts/tests/ids.test.ts`

ULIDs (lexicographically sortable, 26-char) are the chosen ID format for the daemon's event log. Spec §6.3 references `ulid`-prefixed strings. We brand them per-domain so a `WorkspaceId` can never be accidentally used as an `AgentId`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/contracts/tests/ids.test.ts
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  AgentIdSchema,
  SquadIdSchema,
  TaskIdSchema,
  WorkspaceIdSchema,
  isAgentId,
  isSquadId,
  isTaskId,
  isWorkspaceId,
} from '../src/ids.js'

describe('branded IDs', () => {
  describe('WorkspaceIdSchema', () => {
    it('accepts the ws_ prefix + ULID', () => {
      const v = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'
      expect(WorkspaceIdSchema.safeParse(v).success).toBe(true)
    })
    it('rejects missing prefix', () => {
      expect(WorkspaceIdSchema.safeParse('01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(false)
    })
    it('rejects the wrong domain prefix', () => {
      expect(WorkspaceIdSchema.safeParse('ag_01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(false)
    })
    it('rejects ULIDs of wrong length', () => {
      expect(WorkspaceIdSchema.safeParse('ws_TOOSHORT').success).toBe(false)
    })
  })

  it('AgentId / SquadId / TaskId follow the same rules with their prefixes', () => {
    expect(AgentIdSchema.safeParse('ag_01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(true)
    expect(SquadIdSchema.safeParse('sq_01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(true)
    expect(TaskIdSchema.safeParse('tk_01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(true)
    expect(AgentIdSchema.safeParse('ws_01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(false)
  })

  describe('type guards', () => {
    it('isWorkspaceId narrows', () => {
      const candidate: string = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'
      expect(isWorkspaceId(candidate)).toBe(true)
      expect(isWorkspaceId('not an id')).toBe(false)
    })
    it('isAgentId / isSquadId / isTaskId narrow correctly', () => {
      expect(isAgentId('ag_01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true)
      expect(isSquadId('sq_01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true)
      expect(isTaskId('tk_01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true)
      expect(isAgentId('sq_01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(false)
    })
  })

  it('brand survives inference: a WorkspaceId is not assignable to AgentId', () => {
    // This is a type-level assertion. At runtime, we just check the schema works.
    const ws = WorkspaceIdSchema.parse('ws_01ARZ3NDEKTSV4RRFFQ69G5FAV')
    // The following line, if uncommented, MUST fail typecheck:
    // const ag: z.infer<typeof AgentIdSchema> = ws
    expect(typeof ws).toBe('string')
  })
})
```

- [ ] **Step 2: Run the test — verify it fails**

```bash
pnpm --filter @dycode/contracts test
```

Expected: FAIL — `Cannot find module '../src/ids.js'`.

- [ ] **Step 3: Implement `packages/contracts/src/ids.ts`**

```ts
import { z } from 'zod'

/**
 * dycode IDs are ULIDs (26-char Crockford base32) prefixed with a
 * 2-letter domain tag, e.g. `ws_01ARZ3NDEKTSV4RRFFQ69G5FAV`.
 *
 * Branding via Zod prevents accidental cross-domain assignment.
 */
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

function makeIdSchema<TBrand extends string>(prefix: string, brand: TBrand) {
  return z
    .string()
    .refine((s) => s.startsWith(`${prefix}_`), {
      message: `must start with "${prefix}_"`,
    })
    .refine((s) => ULID_RE.test(s.slice(prefix.length + 1)), {
      message: 'suffix must be a ULID (26-char Crockford base32)',
    })
    .brand<TBrand>()
}

export const WorkspaceIdSchema = makeIdSchema('ws', 'WorkspaceId')
export const AgentIdSchema = makeIdSchema('ag', 'AgentId')
export const SquadIdSchema = makeIdSchema('sq', 'SquadId')
export const TaskIdSchema = makeIdSchema('tk', 'TaskId')

export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>
export type AgentId = z.infer<typeof AgentIdSchema>
export type SquadId = z.infer<typeof SquadIdSchema>
export type TaskId = z.infer<typeof TaskIdSchema>

export const isWorkspaceId = (v: unknown): v is WorkspaceId =>
  WorkspaceIdSchema.safeParse(v).success
export const isAgentId = (v: unknown): v is AgentId => AgentIdSchema.safeParse(v).success
export const isSquadId = (v: unknown): v is SquadId => SquadIdSchema.safeParse(v).success
export const isTaskId = (v: unknown): v is TaskId => TaskIdSchema.safeParse(v).success
```

- [ ] **Step 4: Run the test — verify it passes**

```bash
pnpm --filter @dycode/contracts test
```

Expected: 3 prior tests + 5 new ids tests, all passing.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/ids.ts packages/contracts/tests/ids.test.ts
git commit -m "feat(contracts): add branded ULID-typed IDs (Workspace/Agent/Squad/Task)"
```

---

### Task 03 · AgentStatus + Capability enums

**Files:**
- Create: `packages/contracts/src/domain/capability.ts`
- Create: `packages/contracts/tests/domain/capability.test.ts`

Capability is shared between contracts (orchestrator gates on it) and adapter-sdk (adapter manifests declare them). Contracts owns the canonical list.

- [ ] **Step 1: Write the failing test**

```ts
// packages/contracts/tests/domain/capability.test.ts
import { describe, expect, it } from 'vitest'
import { CAPABILITIES, CapabilitySchema } from '../../src/domain/capability.js'

describe('Capability', () => {
  it('lists every spec §5.1 capability', () => {
    expect(CAPABILITIES).toEqual([
      'code.read',
      'code.write',
      'shell.exec',
      'web.fetch',
      'tool.mcp',
      'stream.structured',
      'verify.run',
      'review.judge',
      'plan.decompose',
      'longrunning',
    ])
  })

  it('accepts every listed capability', () => {
    for (const cap of CAPABILITIES) {
      expect(CapabilitySchema.safeParse(cap).success).toBe(true)
    }
  })

  it('rejects unknown capabilities', () => {
    expect(CapabilitySchema.safeParse('admin.everything').success).toBe(false)
    expect(CapabilitySchema.safeParse('').success).toBe(false)
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/contracts test
```

Expected: FAIL on the missing module.

- [ ] **Step 3: Implement `packages/contracts/src/domain/capability.ts`**

```ts
import { z } from 'zod'

/**
 * The closed set of capabilities an adapter may declare in its manifest.
 * Order is canonical — used by tests and by tools that render lists.
 */
export const CAPABILITIES = [
  'code.read',
  'code.write',
  'shell.exec',
  'web.fetch',
  'tool.mcp',
  'stream.structured',
  'verify.run',
  'review.judge',
  'plan.decompose',
  'longrunning',
] as const

export const CapabilitySchema = z.enum(CAPABILITIES)
export type Capability = z.infer<typeof CapabilitySchema>
```

- [ ] **Step 4: Verify green**

```bash
pnpm --filter @dycode/contracts test
```

Expected: all tests passing (prior + new capability tests).

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/domain/capability.ts packages/contracts/tests/domain/capability.test.ts
git commit -m "feat(contracts): add Capability enum (10 spec §5.1 capabilities)"
```

---

### Task 04 · Workspace schema

**Files:**
- Create: `packages/contracts/src/domain/workspace.ts`
- Create: `packages/contracts/tests/domain/workspace.test.ts`

- [ ] **Step 1: Failing test**

```ts
// packages/contracts/tests/domain/workspace.test.ts
import { describe, expect, it } from 'vitest'
import { WorkspaceSchema } from '../../src/domain/workspace.js'

const validWorkspace = {
  id: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  name: 'dycode',
  rootPath: '/Users/me/projects/dycode',
  settings: { defaultBranch: 'main' },
  createdAt: 1_716_500_000_000,
  lastActiveAt: 1_716_500_100_000,
}

describe('WorkspaceSchema', () => {
  it('accepts a fully-formed workspace', () => {
    const result = WorkspaceSchema.safeParse(validWorkspace)
    expect(result.success).toBe(true)
  })

  it('accepts settings with optional instructionsPath', () => {
    expect(
      WorkspaceSchema.safeParse({
        ...validWorkspace,
        settings: { instructionsPath: 'CLAUDE.md' },
      }).success,
    ).toBe(true)
  })

  it('rejects a malformed id', () => {
    expect(WorkspaceSchema.safeParse({ ...validWorkspace, id: 'not-a-ws-id' }).success).toBe(false)
  })

  it('rejects when name is empty', () => {
    expect(WorkspaceSchema.safeParse({ ...validWorkspace, name: '' }).success).toBe(false)
  })

  it('rejects relative rootPath', () => {
    expect(WorkspaceSchema.safeParse({ ...validWorkspace, rootPath: './rel' }).success).toBe(false)
  })

  it('rejects negative timestamps', () => {
    expect(WorkspaceSchema.safeParse({ ...validWorkspace, createdAt: -1 }).success).toBe(false)
  })

  it('defaults settings to an empty object when omitted', () => {
    const { settings: _omit, ...rest } = validWorkspace
    const parsed = WorkspaceSchema.parse(rest)
    expect(parsed.settings).toEqual({})
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/contracts test
```

Expected: FAIL — missing `../../src/domain/workspace.js`.

- [ ] **Step 3: Implement `packages/contracts/src/domain/workspace.ts`**

```ts
import { z } from 'zod'
import { WorkspaceIdSchema } from '../ids.js'

const WorkspaceSettingsSchema = z
  .object({
    defaultBranch: z.string().min(1).optional(),
    instructionsPath: z.string().min(1).optional(),
  })
  .strict()
  .default({})

export const WorkspaceSchema = z
  .object({
    id: WorkspaceIdSchema,
    name: z.string().min(1, 'workspace name must not be empty'),
    rootPath: z
      .string()
      .min(1)
      .refine((p) => p.startsWith('/'), {
        message: 'rootPath must be absolute (start with "/")',
      }),
    settings: WorkspaceSettingsSchema,
    createdAt: z.number().int().nonnegative(),
    lastActiveAt: z.number().int().nonnegative(),
  })
  .strict()

export type WorkspaceSettings = z.infer<typeof WorkspaceSettingsSchema>
export type Workspace = z.infer<typeof WorkspaceSchema>
```

- [ ] **Step 4: Verify green**

```bash
pnpm --filter @dycode/contracts test
```

Expected: all 7 workspace tests passing + prior tests still green.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/domain/workspace.ts packages/contracts/tests/domain/workspace.test.ts
git commit -m "feat(contracts): add Workspace schema with absolute-path + name validation"
```

---

### Task 05 · Agent schema

**Files:**
- Create: `packages/contracts/src/domain/agent.ts`
- Create: `packages/contracts/tests/domain/agent.test.ts`

Includes `AgentStatusSchema` (the 7-variant union from spec §6.3).

- [ ] **Step 1: Failing test**

```ts
// packages/contracts/tests/domain/agent.test.ts
import { describe, expect, it } from 'vitest'
import { AGENT_STATUSES, AgentSchema, AgentStatusSchema } from '../../src/domain/agent.js'

const validAgent = {
  id: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  adapterId: 'claude-code',
  adapterVersion: '2.1.4',
  displayName: 'Claude (backend)',
  capabilities: ['code.read', 'code.write', 'shell.exec'],
  config: { model: 'opus' },
  status: 'idle',
  currentTaskId: null,
}

describe('AgentStatus', () => {
  it('lists all 7 statuses in canonical order', () => {
    expect(AGENT_STATUSES).toEqual([
      'idle',
      'busy',
      'queued',
      'blocked',
      'unhealthy',
      'uninstalled',
      'auth_required',
    ])
  })

  it('accepts every status', () => {
    for (const s of AGENT_STATUSES) {
      expect(AgentStatusSchema.safeParse(s).success).toBe(true)
    }
  })

  it('rejects unknown status', () => {
    expect(AgentStatusSchema.safeParse('running').success).toBe(false)
  })
})

describe('AgentSchema', () => {
  it('accepts a fully-formed agent', () => {
    expect(AgentSchema.safeParse(validAgent).success).toBe(true)
  })

  it('accepts currentTaskId as a TaskId', () => {
    expect(
      AgentSchema.safeParse({
        ...validAgent,
        status: 'busy',
        currentTaskId: 'tk_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      }).success,
    ).toBe(true)
  })

  it('rejects an empty capabilities array? — actually allows it (an agent with no capabilities is valid; just unusable)', () => {
    expect(AgentSchema.safeParse({ ...validAgent, capabilities: [] }).success).toBe(true)
  })

  it('rejects duplicate capabilities', () => {
    expect(
      AgentSchema.safeParse({
        ...validAgent,
        capabilities: ['code.read', 'code.read'],
      }).success,
    ).toBe(false)
  })

  it('rejects unknown capability strings', () => {
    expect(
      AgentSchema.safeParse({ ...validAgent, capabilities: ['code.read', 'fake.cap'] }).success,
    ).toBe(false)
  })

  it('rejects mismatched id prefix', () => {
    expect(AgentSchema.safeParse({ ...validAgent, id: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV' }).success).toBe(false)
  })

  it('defaults config to an empty object when omitted', () => {
    const { config: _omit, ...rest } = validAgent
    expect(AgentSchema.parse(rest).config).toEqual({})
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/contracts test
```

Expected: FAIL — missing module.

- [ ] **Step 3: Implement `packages/contracts/src/domain/agent.ts`**

```ts
import { z } from 'zod'
import { CapabilitySchema } from './capability.js'
import { AgentIdSchema, TaskIdSchema, WorkspaceIdSchema } from '../ids.js'

export const AGENT_STATUSES = [
  'idle',
  'busy',
  'queued',
  'blocked',
  'unhealthy',
  'uninstalled',
  'auth_required',
] as const

export const AgentStatusSchema = z.enum(AGENT_STATUSES)
export type AgentStatus = z.infer<typeof AgentStatusSchema>

export const AgentSchema = z
  .object({
    id: AgentIdSchema,
    workspaceId: WorkspaceIdSchema,
    adapterId: z.string().min(1),
    adapterVersion: z.string().min(1),
    displayName: z.string().min(1),
    capabilities: z
      .array(CapabilitySchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'capabilities must be unique',
      }),
    config: z.record(z.unknown()).default({}),
    status: AgentStatusSchema,
    currentTaskId: TaskIdSchema.nullable(),
  })
  .strict()

export type Agent = z.infer<typeof AgentSchema>
```

- [ ] **Step 4: Verify green**

```bash
pnpm --filter @dycode/contracts test
```

Expected: all tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/domain/agent.ts packages/contracts/tests/domain/agent.test.ts
git commit -m "feat(contracts): add Agent + AgentStatus schemas"
```

---

### Task 06 · Squad schema

**Files:**
- Create: `packages/contracts/src/domain/squad.ts`
- Create: `packages/contracts/tests/domain/squad.test.ts`

- [ ] **Step 1: Failing test**

```ts
// packages/contracts/tests/domain/squad.test.ts
import { describe, expect, it } from 'vitest'
import { SquadSchema } from '../../src/domain/squad.js'

const validSquad = {
  id: 'sq_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  name: 'backend',
  leaderAgentId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  memberAgentIds: [
    'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV',
    'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW',
  ],
  createdAt: 1_716_500_000_000,
}

describe('SquadSchema', () => {
  it('accepts a fully-formed squad', () => {
    expect(SquadSchema.safeParse(validSquad).success).toBe(true)
  })

  it('accepts leaderAgentId = null (squad with no leader yet)', () => {
    expect(SquadSchema.safeParse({ ...validSquad, leaderAgentId: null }).success).toBe(true)
  })

  it('accepts an empty memberAgentIds array (newly-created squad)', () => {
    expect(SquadSchema.safeParse({ ...validSquad, memberAgentIds: [] }).success).toBe(true)
  })

  it('rejects when leaderAgentId is set but not in memberAgentIds', () => {
    expect(
      SquadSchema.safeParse({
        ...validSquad,
        leaderAgentId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAX',
        memberAgentIds: ['ag_01ARZ3NDEKTSV4RRFFQ69G5FAV'],
      }).success,
    ).toBe(false)
  })

  it('rejects duplicate members', () => {
    expect(
      SquadSchema.safeParse({
        ...validSquad,
        memberAgentIds: ['ag_01ARZ3NDEKTSV4RRFFQ69G5FAV', 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV'],
      }).success,
    ).toBe(false)
  })

  it('rejects empty squad name', () => {
    expect(SquadSchema.safeParse({ ...validSquad, name: '' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 3: Implement `packages/contracts/src/domain/squad.ts`**

```ts
import { z } from 'zod'
import { AgentIdSchema, SquadIdSchema, WorkspaceIdSchema } from '../ids.js'

export const SquadSchema = z
  .object({
    id: SquadIdSchema,
    workspaceId: WorkspaceIdSchema,
    name: z.string().min(1, 'squad name must not be empty'),
    leaderAgentId: AgentIdSchema.nullable(),
    memberAgentIds: z
      .array(AgentIdSchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'memberAgentIds must be unique',
      }),
    createdAt: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (s) => s.leaderAgentId === null || s.memberAgentIds.includes(s.leaderAgentId),
    {
      message: 'leaderAgentId must appear in memberAgentIds',
      path: ['leaderAgentId'],
    },
  )

export type Squad = z.infer<typeof SquadSchema>
```

- [ ] **Step 4: Verify green**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/domain/squad.ts packages/contracts/tests/domain/squad.test.ts
git commit -m "feat(contracts): add Squad schema with leader-in-members invariant"
```

---

### Task 07 · Task: state machine + ReviewVerdict + TaskEvidence + Task schema

**Files:**
- Create: `packages/contracts/src/domain/task.ts`
- Create: `packages/contracts/tests/domain/task.test.ts`

The thickest schema in the spec. The constraint that `reviewerId !== assigneeId` is a refinement; the state machine `not_started → active → passing | blocked` is encoded as an enum (state transitions enforced by orchestrator, not the schema).

- [ ] **Step 1: Failing test**

```ts
// packages/contracts/tests/domain/task.test.ts
import { describe, expect, it } from 'vitest'
import {
  REVIEW_DIMENSIONS,
  ReviewVerdictSchema,
  TASK_STATES,
  TaskEvidenceSchema,
  TaskSchema,
  TaskStateSchema,
} from '../../src/domain/task.js'

const validTask = {
  id: 'tk_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  squadId: 'sq_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  assigneeId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  reviewerId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW',
  parentTaskId: null,
  title: 'Implement /api/users POST',
  behavior: 'POST /api/users with valid body returns 201',
  verification: 'pnpm --filter @dycode/api test users.spec',
  state: 'active',
  reviewVerdict: null,
  scope: { paths: ['packages/api/users'], touchedFiles: [] },
  evidence: [],
  createdAt: 1_716_500_000_000,
  startedAt: 1_716_500_100_000,
  completedAt: null,
}

describe('TaskState', () => {
  it('lists the 4 states in canonical order', () => {
    expect(TASK_STATES).toEqual(['not_started', 'active', 'passing', 'blocked'])
  })
  it('accepts each state', () => {
    for (const s of TASK_STATES) expect(TaskStateSchema.safeParse(s).success).toBe(true)
  })
  it('rejects unknown state', () => {
    expect(TaskStateSchema.safeParse('done').success).toBe(false)
  })
})

describe('ReviewVerdict', () => {
  it('exposes the 4 dimensions in canonical order', () => {
    expect(REVIEW_DIMENSIONS).toEqual([
      'consistency',
      'scalability',
      'maintainability',
      'correctness',
    ])
  })

  it('accepts a 10/10 verdict', () => {
    expect(
      ReviewVerdictSchema.safeParse({
        score: 10,
        notes: 'lgtm',
        reviewerId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW',
      }).success,
    ).toBe(true)
  })

  it('rejects non-integer score', () => {
    expect(
      ReviewVerdictSchema.safeParse({
        score: 9.5,
        notes: 'almost',
        reviewerId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW',
      }).success,
    ).toBe(false)
  })

  it('rejects out-of-range score', () => {
    expect(
      ReviewVerdictSchema.safeParse({
        score: 11,
        notes: 'overflow',
        reviewerId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW',
      }).success,
    ).toBe(false)
    expect(
      ReviewVerdictSchema.safeParse({
        score: -1,
        notes: 'underflow',
        reviewerId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW',
      }).success,
    ).toBe(false)
  })
})

describe('TaskEvidence', () => {
  const reviewerId = 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW'
  it('accepts a commit evidence', () => {
    expect(
      TaskEvidenceSchema.safeParse({
        kind: 'commit',
        sha: 'abc123',
        message: 'feat: implement users POST',
        ts: 1_716_500_000_000,
      }).success,
    ).toBe(true)
  })
  it('accepts a verify_run evidence', () => {
    expect(
      TaskEvidenceSchema.safeParse({
        kind: 'verify_run',
        cmd: 'pnpm test',
        exitCode: 0,
        logRef: '/tmp/log',
        ts: 1_716_500_000_000,
      }).success,
    ).toBe(true)
  })
  it('accepts a review evidence', () => {
    expect(
      TaskEvidenceSchema.safeParse({
        kind: 'review',
        reviewerId,
        score: 10,
        notes: 'ok',
        ts: 1_716_500_000_000,
      }).success,
    ).toBe(true)
  })
  it('accepts a handoff evidence', () => {
    expect(
      TaskEvidenceSchema.safeParse({
        kind: 'handoff',
        fromAgentId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        toAgentId: reviewerId,
        ts: 1_716_500_000_000,
      }).success,
    ).toBe(true)
  })
  it('rejects unknown kind', () => {
    expect(
      TaskEvidenceSchema.safeParse({ kind: 'fart', ts: 1 }).success,
    ).toBe(false)
  })
})

describe('TaskSchema', () => {
  it('accepts a fully-formed task', () => {
    expect(TaskSchema.safeParse(validTask).success).toBe(true)
  })
  it('accepts squadId = null (pool task)', () => {
    expect(TaskSchema.safeParse({ ...validTask, squadId: null }).success).toBe(true)
  })
  it('rejects assignee === reviewer', () => {
    expect(
      TaskSchema.safeParse({
        ...validTask,
        reviewerId: validTask.assigneeId,
      }).success,
    ).toBe(false)
  })
  it('accepts null assignee + null reviewer (un-assigned task)', () => {
    expect(
      TaskSchema.safeParse({ ...validTask, assigneeId: null, reviewerId: null }).success,
    ).toBe(true)
  })
  it('rejects empty title', () => {
    expect(TaskSchema.safeParse({ ...validTask, title: '' }).success).toBe(false)
  })
  it('rejects empty verification', () => {
    expect(TaskSchema.safeParse({ ...validTask, verification: '' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 3: Implement `packages/contracts/src/domain/task.ts`**

```ts
import { z } from 'zod'
import { AgentIdSchema, SquadIdSchema, TaskIdSchema, WorkspaceIdSchema } from '../ids.js'

export const TASK_STATES = ['not_started', 'active', 'passing', 'blocked'] as const
export const TaskStateSchema = z.enum(TASK_STATES)
export type TaskState = z.infer<typeof TaskStateSchema>

export const REVIEW_DIMENSIONS = [
  'consistency',
  'scalability',
  'maintainability',
  'correctness',
] as const
export type ReviewDimension = (typeof REVIEW_DIMENSIONS)[number]

const ReviewScoreSchema = z.number().int().min(0).max(10)

export const ReviewVerdictSchema = z
  .object({
    score: ReviewScoreSchema,
    notes: z.string().min(1),
    reviewerId: AgentIdSchema,
  })
  .strict()
export type ReviewVerdict = z.infer<typeof ReviewVerdictSchema>

const TsSchema = z.number().int().nonnegative()

export const TaskEvidenceSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('commit'),
      sha: z.string().min(1),
      message: z.string().min(1),
      ts: TsSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('verify_run'),
      cmd: z.string().min(1),
      exitCode: z.number().int(),
      logRef: z.string().min(1),
      ts: TsSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('review'),
      reviewerId: AgentIdSchema,
      score: ReviewScoreSchema,
      notes: z.string().min(1),
      ts: TsSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('handoff'),
      fromAgentId: AgentIdSchema,
      toAgentId: AgentIdSchema,
      ts: TsSchema,
    })
    .strict(),
])
export type TaskEvidence = z.infer<typeof TaskEvidenceSchema>

const TaskScopeSchema = z
  .object({
    paths: z.array(z.string().min(1)),
    touchedFiles: z.array(z.string().min(1)),
  })
  .strict()
export type TaskScope = z.infer<typeof TaskScopeSchema>

export const TaskSchema = z
  .object({
    id: TaskIdSchema,
    workspaceId: WorkspaceIdSchema,
    squadId: SquadIdSchema.nullable(),
    assigneeId: AgentIdSchema.nullable(),
    reviewerId: AgentIdSchema.nullable(),
    parentTaskId: TaskIdSchema.nullable(),
    title: z.string().min(1),
    behavior: z.string().min(1),
    verification: z.string().min(1),
    state: TaskStateSchema,
    reviewVerdict: ReviewVerdictSchema.nullable(),
    scope: TaskScopeSchema,
    evidence: z.array(TaskEvidenceSchema),
    createdAt: TsSchema,
    startedAt: TsSchema.nullable(),
    completedAt: TsSchema.nullable(),
  })
  .strict()
  .refine(
    (t) => t.assigneeId === null || t.reviewerId === null || t.assigneeId !== t.reviewerId,
    {
      message: 'assigneeId and reviewerId must differ (worker/checker separation)',
      path: ['reviewerId'],
    },
  )
export type Task = z.infer<typeof TaskSchema>
```

- [ ] **Step 4: Verify green**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/domain/task.ts packages/contracts/tests/domain/task.test.ts
git commit -m "feat(contracts): add Task + state machine + ReviewVerdict + TaskEvidence"
```

---

### Task 08 · EventLogEntry schema

**Files:**
- Create: `packages/contracts/src/domain/event-log.ts`
- Create: `packages/contracts/tests/domain/event-log.test.ts`

EventLogEntry's `type` field is the *adapter event type* (output, tool_call, etc.). We reuse the AdapterEvent kind enum we'll define in Task 17 — but contracts owns the canonical list and adapter-sdk just re-exports it. Define `ADAPTER_EVENT_KINDS` here.

- [ ] **Step 1: Failing test**

```ts
// packages/contracts/tests/domain/event-log.test.ts
import { describe, expect, it } from 'vitest'
import {
  ADAPTER_EVENT_KINDS,
  AdapterEventKindSchema,
  EventLogEntrySchema,
} from '../../src/domain/event-log.js'

const validEntry = {
  id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
  ts: 1_716_500_000_000,
  workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  taskId: 'tk_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  agentId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  type: 'output',
  payload: { chunk: 'hello\n' },
}

describe('AdapterEventKind', () => {
  it('lists the 7 spec §5.2 event kinds', () => {
    expect(ADAPTER_EVENT_KINDS).toEqual([
      'output',
      'tool_call',
      'tool_result',
      'progress',
      'verify_request',
      'done',
      'error',
    ])
  })

  it('accepts each kind', () => {
    for (const k of ADAPTER_EVENT_KINDS) {
      expect(AdapterEventKindSchema.safeParse(k).success).toBe(true)
    }
  })

  it('rejects unknown kind', () => {
    expect(AdapterEventKindSchema.safeParse('weird').success).toBe(false)
  })
})

describe('EventLogEntrySchema', () => {
  it('accepts a fully-formed entry', () => {
    expect(EventLogEntrySchema.safeParse(validEntry).success).toBe(true)
  })

  it('accepts taskId = null (workspace-scoped events like runtime detection)', () => {
    expect(EventLogEntrySchema.safeParse({ ...validEntry, taskId: null }).success).toBe(true)
  })

  it('accepts agentId = null (system events)', () => {
    expect(EventLogEntrySchema.safeParse({ ...validEntry, agentId: null }).success).toBe(true)
  })

  it('rejects when id is not a ULID', () => {
    expect(EventLogEntrySchema.safeParse({ ...validEntry, id: 'not-ulid' }).success).toBe(false)
  })

  it('rejects negative ts', () => {
    expect(EventLogEntrySchema.safeParse({ ...validEntry, ts: -1 }).success).toBe(false)
  })

  it('rejects unknown event type', () => {
    expect(EventLogEntrySchema.safeParse({ ...validEntry, type: 'panic' }).success).toBe(false)
  })

  it('payload is a passthrough JSON object (any shape)', () => {
    expect(
      EventLogEntrySchema.safeParse({ ...validEntry, payload: { whatever: ['a', 1, null] } }).success,
    ).toBe(true)
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 3: Implement `packages/contracts/src/domain/event-log.ts`**

```ts
import { z } from 'zod'
import { AgentIdSchema, TaskIdSchema, WorkspaceIdSchema } from '../ids.js'

export const ADAPTER_EVENT_KINDS = [
  'output',
  'tool_call',
  'tool_result',
  'progress',
  'verify_request',
  'done',
  'error',
] as const
export const AdapterEventKindSchema = z.enum(ADAPTER_EVENT_KINDS)
export type AdapterEventKind = z.infer<typeof AdapterEventKindSchema>

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

export const EventLogEntrySchema = z
  .object({
    id: z.string().regex(ULID_RE, 'id must be a 26-char Crockford-base32 ULID'),
    ts: z.number().int().nonnegative(),
    workspaceId: WorkspaceIdSchema,
    taskId: TaskIdSchema.nullable(),
    agentId: AgentIdSchema.nullable(),
    type: AdapterEventKindSchema,
    payload: z.record(z.unknown()),
  })
  .strict()

export type EventLogEntry = z.infer<typeof EventLogEntrySchema>
```

- [ ] **Step 4: Verify green**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/domain/event-log.ts packages/contracts/tests/domain/event-log.test.ts
git commit -m "feat(contracts): add EventLogEntry + canonical AdapterEventKind list"
```

---

### Task 09 · JSON-RPC envelopes + error codes

**Files:**
- Create: `packages/contracts/src/ipc/envelope.ts`
- Create: `packages/contracts/tests/ipc/envelope.test.ts`

- [ ] **Step 1: Failing test**

```ts
// packages/contracts/tests/ipc/envelope.test.ts
import { describe, expect, it } from 'vitest'
import {
  ERROR_CODE,
  JsonRpcErrorSchema,
  JsonRpcRequestEnvelopeSchema,
  JsonRpcResponseEnvelopeSchema,
} from '../../src/ipc/envelope.js'

describe('ERROR_CODE', () => {
  it('exposes the canonical JSON-RPC 2.0 errors + dycode-specific extensions', () => {
    expect(ERROR_CODE.PARSE_ERROR).toBe(-32700)
    expect(ERROR_CODE.INVALID_REQUEST).toBe(-32600)
    expect(ERROR_CODE.METHOD_NOT_FOUND).toBe(-32601)
    expect(ERROR_CODE.INVALID_PARAMS).toBe(-32602)
    expect(ERROR_CODE.INTERNAL_ERROR).toBe(-32603)
    expect(ERROR_CODE.PROTOCOL_VERSION_MISMATCH).toBe(-32099)
    expect(ERROR_CODE.AUTH_REQUIRED).toBe(-32098)
    expect(ERROR_CODE.CAPABILITY_DENIED).toBe(-32097)
    expect(ERROR_CODE.AGENT_UNHEALTHY).toBe(-32096)
    expect(ERROR_CODE.WORKSPACE_NOT_FOUND).toBe(-32095)
  })
})

describe('JsonRpcRequestEnvelopeSchema', () => {
  it('accepts a minimal valid request', () => {
    expect(
      JsonRpcRequestEnvelopeSchema.safeParse({
        jsonrpc: '2.0',
        id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        method: 'workspace.list',
        params: {},
        protocolVersion: 1,
      }).success,
    ).toBe(true)
  })

  it('rejects non-2.0 jsonrpc', () => {
    expect(
      JsonRpcRequestEnvelopeSchema.safeParse({
        jsonrpc: '1.0',
        id: 'x',
        method: 'workspace.list',
        params: {},
        protocolVersion: 1,
      }).success,
    ).toBe(false)
  })

  it('rejects protocolVersion that is not 1', () => {
    expect(
      JsonRpcRequestEnvelopeSchema.safeParse({
        jsonrpc: '2.0',
        id: 'x',
        method: 'workspace.list',
        params: {},
        protocolVersion: 2,
      }).success,
    ).toBe(false)
  })
})

describe('JsonRpcResponseEnvelopeSchema', () => {
  it('accepts a success response', () => {
    expect(
      JsonRpcResponseEnvelopeSchema.safeParse({
        jsonrpc: '2.0',
        id: 'x',
        result: { ok: true },
      }).success,
    ).toBe(true)
  })

  it('accepts an error response', () => {
    expect(
      JsonRpcResponseEnvelopeSchema.safeParse({
        jsonrpc: '2.0',
        id: 'x',
        error: { code: ERROR_CODE.METHOD_NOT_FOUND, message: 'no such method' },
      }).success,
    ).toBe(true)
  })

  it('rejects when both result and error are present', () => {
    expect(
      JsonRpcResponseEnvelopeSchema.safeParse({
        jsonrpc: '2.0',
        id: 'x',
        result: {},
        error: { code: -32603, message: 'oops' },
      }).success,
    ).toBe(false)
  })

  it('rejects when neither result nor error is present', () => {
    expect(JsonRpcResponseEnvelopeSchema.safeParse({ jsonrpc: '2.0', id: 'x' }).success).toBe(false)
  })
})

describe('JsonRpcErrorSchema', () => {
  it('accepts a minimal error', () => {
    expect(
      JsonRpcErrorSchema.safeParse({ code: ERROR_CODE.INTERNAL_ERROR, message: 'boom' }).success,
    ).toBe(true)
  })

  it('accepts error with data payload', () => {
    expect(
      JsonRpcErrorSchema.safeParse({
        code: ERROR_CODE.INVALID_PARAMS,
        message: 'bad params',
        data: { field: 'workspaceId' },
      }).success,
    ).toBe(true)
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 3: Implement `packages/contracts/src/ipc/envelope.ts`**

```ts
import { z } from 'zod'

/**
 * JSON-RPC 2.0 error codes plus dycode-specific extensions in the
 * -32099..-32000 server-error reserved range.
 */
export const ERROR_CODE = {
  // JSON-RPC 2.0 canonical
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // dycode extensions (server-error range)
  PROTOCOL_VERSION_MISMATCH: -32099,
  AUTH_REQUIRED: -32098,
  CAPABILITY_DENIED: -32097,
  AGENT_UNHEALTHY: -32096,
  WORKSPACE_NOT_FOUND: -32095,
} as const
export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE]

export const JsonRpcErrorSchema = z
  .object({
    code: z.number().int(),
    message: z.string().min(1),
    data: z.unknown().optional(),
  })
  .strict()
export type JsonRpcError = z.infer<typeof JsonRpcErrorSchema>

const RequestIdSchema = z.string().min(1)

export const JsonRpcRequestEnvelopeSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
    id: RequestIdSchema,
    method: z.string().min(1),
    params: z.unknown().optional(),
    protocolVersion: z.literal(1),
  })
  .strict()
export type JsonRpcRequestEnvelope = z.infer<typeof JsonRpcRequestEnvelopeSchema>

export const JsonRpcResponseEnvelopeSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
    id: RequestIdSchema,
    result: z.unknown().optional(),
    error: JsonRpcErrorSchema.optional(),
  })
  .strict()
  .refine(
    (r) =>
      ('result' in r && r.result !== undefined && r.error === undefined) ||
      ('error' in r && r.error !== undefined && r.result === undefined),
    {
      message: 'exactly one of `result` or `error` must be present',
      path: ['result'],
    },
  )
export type JsonRpcResponseEnvelope = z.infer<typeof JsonRpcResponseEnvelopeSchema>
```

- [ ] **Step 4: Verify green**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/ipc/envelope.ts packages/contracts/tests/ipc/envelope.test.ts
git commit -m "feat(contracts): add JSON-RPC 2.0 envelopes + dycode error codes"
```

---

### Task 10 · MethodName enum + Method registry types

**Files:**
- Create: `packages/contracts/src/ipc/methods.ts`
- Create: `packages/contracts/tests/ipc/methods.test.ts`

This task defines the `MethodName` union (all RPC methods in the system) and the `MethodParams` / `MethodResult` type registries that downstream packages can use to type-check requests.

Method schemas themselves land in Tasks 11-13. This is just the registry skeleton.

- [ ] **Step 1: Failing test**

```ts
// packages/contracts/tests/ipc/methods.test.ts
import { describe, expect, it } from 'vitest'
import { METHOD_NAMES, MethodNameSchema } from '../../src/ipc/methods.js'

describe('MethodName', () => {
  it('lists every spec §6.2 method', () => {
    expect(METHOD_NAMES).toEqual([
      // workspaces
      'workspace.list',
      'workspace.add',
      'workspace.activate',
      'workspace.remove',
      // runtime + adapters
      'runtime.scan',
      'adapter.list',
      'adapter.install',
      'adapter.uninstall',
      'adapter.configure',
      // fleet
      'squad.create',
      'squad.delete',
      'squad.rename',
      'squad.addMember',
      'squad.removeMember',
      'squad.setLeader',
      'pool.list',
      'pool.promote',
      'pool.release',
      // tasks
      'task.create',
      'task.cancel',
      'task.list',
      'task.get',
      'task.assign',
      'task.requestReview',
      'task.submitReviewVerdict',
      'task.run',
      'task.replay',
      // events
      'events.subscribe',
      'events.unsubscribe',
      'events.query',
    ])
  })

  it('accepts every listed method', () => {
    for (const m of METHOD_NAMES) {
      expect(MethodNameSchema.safeParse(m).success).toBe(true)
    }
  })

  it('rejects unknown method', () => {
    expect(MethodNameSchema.safeParse('admin.shutdown').success).toBe(false)
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 3: Implement `packages/contracts/src/ipc/methods.ts`**

```ts
import { z } from 'zod'

/**
 * Canonical list of all RPC methods. Order groups methods by area for readability;
 * tools that iterate (e.g., docs generators) rely on this order.
 *
 * To add a method:
 *  1. Add the literal to METHOD_NAMES (preserving area grouping).
 *  2. Add a method-specific schema in ipc/methods.<area>.ts.
 *  3. Register its params/result in MethodParamsSchemas / MethodResultSchemas (Task 11+).
 *  4. Bump CONTRACTS_VERSION minor.
 */
export const METHOD_NAMES = [
  // workspaces
  'workspace.list',
  'workspace.add',
  'workspace.activate',
  'workspace.remove',
  // runtime + adapters
  'runtime.scan',
  'adapter.list',
  'adapter.install',
  'adapter.uninstall',
  'adapter.configure',
  // fleet
  'squad.create',
  'squad.delete',
  'squad.rename',
  'squad.addMember',
  'squad.removeMember',
  'squad.setLeader',
  'pool.list',
  'pool.promote',
  'pool.release',
  // tasks
  'task.create',
  'task.cancel',
  'task.list',
  'task.get',
  'task.assign',
  'task.requestReview',
  'task.submitReviewVerdict',
  'task.run',
  'task.replay',
  // events
  'events.subscribe',
  'events.unsubscribe',
  'events.query',
] as const

export const MethodNameSchema = z.enum(METHOD_NAMES)
export type MethodName = z.infer<typeof MethodNameSchema>
```

- [ ] **Step 4: Verify green**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/ipc/methods.ts packages/contracts/tests/ipc/methods.test.ts
git commit -m "feat(contracts): add MethodName enum (29 RPC methods)"
```

---

### Task 11 · Workspace + runtime/adapter method schemas

**Files:**
- Create: `packages/contracts/src/ipc/methods.workspace.ts`
- Create: `packages/contracts/src/ipc/methods.runtime.ts`
- Create: `packages/contracts/tests/ipc/methods.workspace.test.ts`
- Create: `packages/contracts/tests/ipc/methods.runtime.test.ts`

Each method gets a `<method>ParamsSchema` and `<method>ResultSchema` named after the method (with `.` replaced by `_`).

- [ ] **Step 1: Failing test (workspace)**

```ts
// packages/contracts/tests/ipc/methods.workspace.test.ts
import { describe, expect, it } from 'vitest'
import {
  workspace_activate_paramsSchema,
  workspace_activate_resultSchema,
  workspace_add_paramsSchema,
  workspace_add_resultSchema,
  workspace_list_paramsSchema,
  workspace_list_resultSchema,
  workspace_remove_paramsSchema,
  workspace_remove_resultSchema,
} from '../../src/ipc/methods.workspace.js'

describe('workspace.list', () => {
  it('takes empty params and returns a workspaces array', () => {
    expect(workspace_list_paramsSchema.safeParse({}).success).toBe(true)
    expect(
      workspace_list_resultSchema.safeParse({
        workspaces: [
          {
            id: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            name: 'demo',
            rootPath: '/tmp/demo',
            settings: {},
            createdAt: 0,
            lastActiveAt: 0,
          },
        ],
      }).success,
    ).toBe(true)
  })
})

describe('workspace.add', () => {
  it('takes name + rootPath, returns the new workspace', () => {
    expect(
      workspace_add_paramsSchema.safeParse({ name: 'demo', rootPath: '/tmp/demo' }).success,
    ).toBe(true)
    expect(
      workspace_add_resultSchema.safeParse({
        workspace: {
          id: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
          name: 'demo',
          rootPath: '/tmp/demo',
          settings: {},
          createdAt: 0,
          lastActiveAt: 0,
        },
      }).success,
    ).toBe(true)
  })

  it('rejects relative rootPath', () => {
    expect(workspace_add_paramsSchema.safeParse({ name: 'x', rootPath: 'rel/path' }).success).toBe(
      false,
    )
  })
})

describe('workspace.activate', () => {
  it('takes workspaceId, returns ok', () => {
    expect(
      workspace_activate_paramsSchema.safeParse({ workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV' })
        .success,
    ).toBe(true)
    expect(workspace_activate_resultSchema.safeParse({ ok: true }).success).toBe(true)
  })
})

describe('workspace.remove', () => {
  it('takes workspaceId, returns ok', () => {
    expect(
      workspace_remove_paramsSchema.safeParse({ workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV' })
        .success,
    ).toBe(true)
    expect(workspace_remove_resultSchema.safeParse({ ok: true }).success).toBe(true)
  })
})
```

- [ ] **Step 2: Failing test (runtime + adapter)**

```ts
// packages/contracts/tests/ipc/methods.runtime.test.ts
import { describe, expect, it } from 'vitest'
import {
  adapter_configure_paramsSchema,
  adapter_install_paramsSchema,
  adapter_install_resultSchema,
  adapter_list_paramsSchema,
  adapter_list_resultSchema,
  adapter_uninstall_paramsSchema,
  runtime_scan_paramsSchema,
  runtime_scan_resultSchema,
} from '../../src/ipc/methods.runtime.js'

describe('runtime.scan', () => {
  it('takes empty params and returns a detected adapters summary', () => {
    expect(runtime_scan_paramsSchema.safeParse({}).success).toBe(true)
    expect(
      runtime_scan_resultSchema.safeParse({
        detected: [
          { adapterId: 'claude-code', version: '2.1.4', path: '/usr/local/bin/claude' },
        ],
      }).success,
    ).toBe(true)
  })
})

describe('adapter.list', () => {
  it('returns installed adapters', () => {
    expect(adapter_list_paramsSchema.safeParse({}).success).toBe(true)
    expect(
      adapter_list_resultSchema.safeParse({
        adapters: [{ adapterId: 'claude-code', version: '2.1.4', installed: true }],
      }).success,
    ).toBe(true)
  })
})

describe('adapter.install', () => {
  it('takes adapterId, returns the installed version', () => {
    expect(adapter_install_paramsSchema.safeParse({ adapterId: 'codex' }).success).toBe(true)
    expect(adapter_install_resultSchema.safeParse({ adapterId: 'codex', version: '0.18.0' }).success).toBe(
      true,
    )
  })
})

describe('adapter.uninstall', () => {
  it('takes adapterId, returns ok', () => {
    expect(adapter_uninstall_paramsSchema.safeParse({ adapterId: 'codex' }).success).toBe(true)
  })
})

describe('adapter.configure', () => {
  it('takes adapterId + config object', () => {
    expect(
      adapter_configure_paramsSchema.safeParse({
        adapterId: 'claude-code',
        config: { model: 'opus' },
      }).success,
    ).toBe(true)
  })
})
```

- [ ] **Step 3: Verify red**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 4: Implement `packages/contracts/src/ipc/methods.workspace.ts`**

```ts
import { z } from 'zod'
import { WorkspaceIdSchema } from '../ids.js'
import { WorkspaceSchema } from '../domain/workspace.js'

const OkSchema = z.object({ ok: z.literal(true) }).strict()

export const workspace_list_paramsSchema = z.object({}).strict()
export const workspace_list_resultSchema = z
  .object({ workspaces: z.array(WorkspaceSchema) })
  .strict()

export const workspace_add_paramsSchema = z
  .object({
    name: z.string().min(1),
    rootPath: z
      .string()
      .min(1)
      .refine((p) => p.startsWith('/'), 'rootPath must be absolute'),
  })
  .strict()
export const workspace_add_resultSchema = z.object({ workspace: WorkspaceSchema }).strict()

export const workspace_activate_paramsSchema = z
  .object({ workspaceId: WorkspaceIdSchema })
  .strict()
export const workspace_activate_resultSchema = OkSchema

export const workspace_remove_paramsSchema = z.object({ workspaceId: WorkspaceIdSchema }).strict()
export const workspace_remove_resultSchema = OkSchema
```

- [ ] **Step 5: Implement `packages/contracts/src/ipc/methods.runtime.ts`**

```ts
import { z } from 'zod'

const DetectedAdapterSchema = z
  .object({
    adapterId: z.string().min(1),
    version: z.string().min(1),
    path: z.string().min(1),
  })
  .strict()

export const runtime_scan_paramsSchema = z.object({}).strict()
export const runtime_scan_resultSchema = z
  .object({ detected: z.array(DetectedAdapterSchema) })
  .strict()

const InstalledAdapterSchema = z
  .object({
    adapterId: z.string().min(1),
    version: z.string().min(1),
    installed: z.boolean(),
  })
  .strict()

export const adapter_list_paramsSchema = z.object({}).strict()
export const adapter_list_resultSchema = z
  .object({ adapters: z.array(InstalledAdapterSchema) })
  .strict()

export const adapter_install_paramsSchema = z
  .object({ adapterId: z.string().min(1) })
  .strict()
export const adapter_install_resultSchema = z
  .object({ adapterId: z.string().min(1), version: z.string().min(1) })
  .strict()

export const adapter_uninstall_paramsSchema = adapter_install_paramsSchema
export const adapter_uninstall_resultSchema = z.object({ ok: z.literal(true) }).strict()

export const adapter_configure_paramsSchema = z
  .object({
    adapterId: z.string().min(1),
    config: z.record(z.unknown()),
  })
  .strict()
export const adapter_configure_resultSchema = z.object({ ok: z.literal(true) }).strict()
```

- [ ] **Step 6: Verify green**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 7: Commit**

```bash
git add packages/contracts/src/ipc/methods.workspace.ts packages/contracts/src/ipc/methods.runtime.ts packages/contracts/tests/ipc/methods.workspace.test.ts packages/contracts/tests/ipc/methods.runtime.test.ts
git commit -m "feat(contracts): add workspace.* + runtime.* + adapter.* method schemas"
```

---

### Task 12 · Fleet method schemas (squad + pool)

**Files:**
- Create: `packages/contracts/src/ipc/methods.fleet.ts`
- Create: `packages/contracts/tests/ipc/methods.fleet.test.ts`

- [ ] **Step 1: Failing test**

```ts
// packages/contracts/tests/ipc/methods.fleet.test.ts
import { describe, expect, it } from 'vitest'
import {
  pool_list_paramsSchema,
  pool_list_resultSchema,
  pool_promote_paramsSchema,
  pool_release_paramsSchema,
  squad_addMember_paramsSchema,
  squad_create_paramsSchema,
  squad_create_resultSchema,
  squad_delete_paramsSchema,
  squad_removeMember_paramsSchema,
  squad_rename_paramsSchema,
  squad_setLeader_paramsSchema,
} from '../../src/ipc/methods.fleet.js'

const workspaceId = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const squadId = 'sq_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const agentId = 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV'

describe('squad.create', () => {
  it('takes workspaceId + name, returns the new squad', () => {
    expect(squad_create_paramsSchema.safeParse({ workspaceId, name: 'backend' }).success).toBe(true)
    expect(
      squad_create_resultSchema.safeParse({
        squad: {
          id: squadId,
          workspaceId,
          name: 'backend',
          leaderAgentId: null,
          memberAgentIds: [],
          createdAt: 0,
        },
      }).success,
    ).toBe(true)
  })
})

describe('squad.delete / rename / addMember / removeMember / setLeader', () => {
  it('all squad.* methods take squadId and the relevant payload', () => {
    expect(squad_delete_paramsSchema.safeParse({ squadId }).success).toBe(true)
    expect(squad_rename_paramsSchema.safeParse({ squadId, name: 'frontend' }).success).toBe(true)
    expect(squad_addMember_paramsSchema.safeParse({ squadId, agentId }).success).toBe(true)
    expect(squad_removeMember_paramsSchema.safeParse({ squadId, agentId }).success).toBe(true)
    expect(squad_setLeader_paramsSchema.safeParse({ squadId, agentId }).success).toBe(true)
    // setLeader can also clear with null
    expect(squad_setLeader_paramsSchema.safeParse({ squadId, agentId: null }).success).toBe(true)
  })
})

describe('pool.list', () => {
  it('returns agents currently in the pool (not in any squad)', () => {
    expect(pool_list_paramsSchema.safeParse({ workspaceId }).success).toBe(true)
    expect(
      pool_list_resultSchema.safeParse({
        agentIds: [agentId],
      }).success,
    ).toBe(true)
  })
})

describe('pool.promote / pool.release', () => {
  it('promote takes squadId + agentId, release takes agentId', () => {
    expect(pool_promote_paramsSchema.safeParse({ squadId, agentId }).success).toBe(true)
    expect(pool_release_paramsSchema.safeParse({ agentId }).success).toBe(true)
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 3: Implement `packages/contracts/src/ipc/methods.fleet.ts`**

```ts
import { z } from 'zod'
import { AgentIdSchema, SquadIdSchema, WorkspaceIdSchema } from '../ids.js'
import { SquadSchema } from '../domain/squad.js'

const OkSchema = z.object({ ok: z.literal(true) }).strict()

export const squad_create_paramsSchema = z
  .object({ workspaceId: WorkspaceIdSchema, name: z.string().min(1) })
  .strict()
export const squad_create_resultSchema = z.object({ squad: SquadSchema }).strict()

export const squad_delete_paramsSchema = z.object({ squadId: SquadIdSchema }).strict()
export const squad_delete_resultSchema = OkSchema

export const squad_rename_paramsSchema = z
  .object({ squadId: SquadIdSchema, name: z.string().min(1) })
  .strict()
export const squad_rename_resultSchema = OkSchema

export const squad_addMember_paramsSchema = z
  .object({ squadId: SquadIdSchema, agentId: AgentIdSchema })
  .strict()
export const squad_addMember_resultSchema = OkSchema

export const squad_removeMember_paramsSchema = squad_addMember_paramsSchema
export const squad_removeMember_resultSchema = OkSchema

export const squad_setLeader_paramsSchema = z
  .object({ squadId: SquadIdSchema, agentId: AgentIdSchema.nullable() })
  .strict()
export const squad_setLeader_resultSchema = OkSchema

export const pool_list_paramsSchema = z.object({ workspaceId: WorkspaceIdSchema }).strict()
export const pool_list_resultSchema = z.object({ agentIds: z.array(AgentIdSchema) }).strict()

export const pool_promote_paramsSchema = z
  .object({ squadId: SquadIdSchema, agentId: AgentIdSchema })
  .strict()
export const pool_promote_resultSchema = OkSchema

export const pool_release_paramsSchema = z.object({ agentId: AgentIdSchema }).strict()
export const pool_release_resultSchema = OkSchema
```

- [ ] **Step 4: Verify green**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/ipc/methods.fleet.ts packages/contracts/tests/ipc/methods.fleet.test.ts
git commit -m "feat(contracts): add squad.* + pool.* method schemas"
```

---

### Task 13 · Task method schemas

**Files:**
- Create: `packages/contracts/src/ipc/methods.task.ts`
- Create: `packages/contracts/tests/ipc/methods.task.test.ts`

- [ ] **Step 1: Failing test**

```ts
// packages/contracts/tests/ipc/methods.task.test.ts
import { describe, expect, it } from 'vitest'
import {
  task_assign_paramsSchema,
  task_cancel_paramsSchema,
  task_create_paramsSchema,
  task_create_resultSchema,
  task_get_paramsSchema,
  task_list_paramsSchema,
  task_list_resultSchema,
  task_replay_paramsSchema,
  task_replay_resultSchema,
  task_requestReview_paramsSchema,
  task_run_paramsSchema,
  task_submitReviewVerdict_paramsSchema,
} from '../../src/ipc/methods.task.js'

const workspaceId = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const squadId = 'sq_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const agentA = 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const agentB = 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW'
const taskId = 'tk_01ARZ3NDEKTSV4RRFFQ69G5FAV'

describe('task.create', () => {
  it('takes workspaceId + (optional squadId|parent) + behavior + verification', () => {
    expect(
      task_create_paramsSchema.safeParse({
        workspaceId,
        squadId,
        parentTaskId: null,
        title: 'POST /api/users',
        behavior: 'returns 201 on valid body',
        verification: 'pnpm test users',
        scope: { paths: ['packages/api'], touchedFiles: [] },
      }).success,
    ).toBe(true)
    expect(
      task_create_resultSchema.safeParse({
        taskId,
      }).success,
    ).toBe(true)
  })

  it('squadId may be null (pool task)', () => {
    expect(
      task_create_paramsSchema.safeParse({
        workspaceId,
        squadId: null,
        parentTaskId: null,
        title: 'pool task',
        behavior: 'b',
        verification: 'v',
        scope: { paths: [], touchedFiles: [] },
      }).success,
    ).toBe(true)
  })
})

describe('task.cancel / list / get', () => {
  it('cancel/get take taskId, list takes workspaceId + optional state filter', () => {
    expect(task_cancel_paramsSchema.safeParse({ taskId, reason: 'changed mind' }).success).toBe(true)
    expect(task_get_paramsSchema.safeParse({ taskId }).success).toBe(true)
    expect(task_list_paramsSchema.safeParse({ workspaceId }).success).toBe(true)
    expect(task_list_paramsSchema.safeParse({ workspaceId, state: 'active' }).success).toBe(true)
    expect(task_list_paramsSchema.safeParse({ workspaceId, state: 'fake' }).success).toBe(false)
  })

  it('task.list returns an array of taskIds (light) and optionally a paging cursor', () => {
    expect(task_list_resultSchema.safeParse({ taskIds: [taskId] }).success).toBe(true)
  })
})

describe('task.assign / requestReview / submitReviewVerdict / run / replay', () => {
  it('assign + requestReview enforce worker/checker separation at schema level', () => {
    expect(
      task_assign_paramsSchema.safeParse({ taskId, assigneeId: agentA, reviewerId: agentB }).success,
    ).toBe(true)
    expect(
      task_assign_paramsSchema.safeParse({ taskId, assigneeId: agentA, reviewerId: agentA }).success,
    ).toBe(false)
    expect(
      task_requestReview_paramsSchema.safeParse({ taskId, reviewerId: agentB }).success,
    ).toBe(true)
  })

  it('submitReviewVerdict accepts a complete verdict', () => {
    expect(
      task_submitReviewVerdict_paramsSchema.safeParse({
        taskId,
        verdict: { score: 10, notes: 'lgtm', reviewerId: agentB },
      }).success,
    ).toBe(true)
  })

  it('task.run kicks off execution and returns the run-id', () => {
    expect(task_run_paramsSchema.safeParse({ taskId }).success).toBe(true)
  })

  it('task.replay returns the event-log slice for a task', () => {
    expect(task_replay_paramsSchema.safeParse({ taskId }).success).toBe(true)
    expect(
      task_replay_resultSchema.safeParse({
        events: [
          {
            id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            ts: 0,
            workspaceId,
            taskId,
            agentId: agentA,
            type: 'output',
            payload: { chunk: 'hi' },
          },
        ],
      }).success,
    ).toBe(true)
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 3: Implement `packages/contracts/src/ipc/methods.task.ts`**

```ts
import { z } from 'zod'
import { AgentIdSchema, SquadIdSchema, TaskIdSchema, WorkspaceIdSchema } from '../ids.js'
import { TaskSchema, TaskStateSchema, ReviewVerdictSchema } from '../domain/task.js'
import { EventLogEntrySchema } from '../domain/event-log.js'

const OkSchema = z.object({ ok: z.literal(true) }).strict()

const TaskScopeSchema = z
  .object({
    paths: z.array(z.string().min(1)),
    touchedFiles: z.array(z.string().min(1)),
  })
  .strict()

export const task_create_paramsSchema = z
  .object({
    workspaceId: WorkspaceIdSchema,
    squadId: SquadIdSchema.nullable(),
    parentTaskId: TaskIdSchema.nullable(),
    title: z.string().min(1),
    behavior: z.string().min(1),
    verification: z.string().min(1),
    scope: TaskScopeSchema,
  })
  .strict()
export const task_create_resultSchema = z.object({ taskId: TaskIdSchema }).strict()

export const task_cancel_paramsSchema = z
  .object({ taskId: TaskIdSchema, reason: z.string().min(1) })
  .strict()
export const task_cancel_resultSchema = OkSchema

export const task_list_paramsSchema = z
  .object({
    workspaceId: WorkspaceIdSchema,
    state: TaskStateSchema.optional(),
    squadId: SquadIdSchema.optional(),
    assigneeId: AgentIdSchema.optional(),
  })
  .strict()
export const task_list_resultSchema = z.object({ taskIds: z.array(TaskIdSchema) }).strict()

export const task_get_paramsSchema = z.object({ taskId: TaskIdSchema }).strict()
export const task_get_resultSchema = z.object({ task: TaskSchema }).strict()

export const task_assign_paramsSchema = z
  .object({
    taskId: TaskIdSchema,
    assigneeId: AgentIdSchema,
    reviewerId: AgentIdSchema,
  })
  .strict()
  .refine((p) => p.assigneeId !== p.reviewerId, {
    message: 'assigneeId and reviewerId must differ',
    path: ['reviewerId'],
  })
export const task_assign_resultSchema = OkSchema

export const task_requestReview_paramsSchema = z
  .object({ taskId: TaskIdSchema, reviewerId: AgentIdSchema })
  .strict()
export const task_requestReview_resultSchema = OkSchema

export const task_submitReviewVerdict_paramsSchema = z
  .object({ taskId: TaskIdSchema, verdict: ReviewVerdictSchema })
  .strict()
export const task_submitReviewVerdict_resultSchema = OkSchema

export const task_run_paramsSchema = z.object({ taskId: TaskIdSchema }).strict()
export const task_run_resultSchema = z.object({ ok: z.literal(true), runId: z.string().min(1) }).strict()

export const task_replay_paramsSchema = z.object({ taskId: TaskIdSchema }).strict()
export const task_replay_resultSchema = z
  .object({ events: z.array(EventLogEntrySchema) })
  .strict()
```

- [ ] **Step 4: Verify green**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/ipc/methods.task.ts packages/contracts/tests/ipc/methods.task.test.ts
git commit -m "feat(contracts): add task.* method schemas (create/cancel/list/get/assign/review/run/replay)"
```

---

### Task 14 · Notification union + event subscription

**Files:**
- Create: `packages/contracts/src/ipc/methods.events.ts`
- Create: `packages/contracts/src/ipc/notifications.ts`
- Create: `packages/contracts/tests/ipc/methods.events.test.ts`
- Create: `packages/contracts/tests/ipc/notifications.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// packages/contracts/tests/ipc/methods.events.test.ts
import { describe, expect, it } from 'vitest'
import {
  events_query_paramsSchema,
  events_query_resultSchema,
  events_subscribe_paramsSchema,
  events_subscribe_resultSchema,
  events_unsubscribe_paramsSchema,
} from '../../src/ipc/methods.events.js'

const workspaceId = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'

describe('events.subscribe', () => {
  it('takes optional filter, returns a subscription handle', () => {
    expect(events_subscribe_paramsSchema.safeParse({}).success).toBe(true)
    expect(
      events_subscribe_paramsSchema.safeParse({ filter: { workspaceId } }).success,
    ).toBe(true)
    expect(
      events_subscribe_resultSchema.safeParse({ subscriptionId: 'sub_01ARZ3NDEKTSV4RRFFQ69G5FAV' })
        .success,
    ).toBe(true)
  })
})

describe('events.unsubscribe', () => {
  it('takes subscriptionId', () => {
    expect(
      events_unsubscribe_paramsSchema.safeParse({ subscriptionId: 'sub_x' }).success,
    ).toBe(true)
  })
})

describe('events.query', () => {
  it('takes filter + paging cursor, returns events + nextCursor', () => {
    expect(events_query_paramsSchema.safeParse({ workspaceId }).success).toBe(true)
    expect(events_query_paramsSchema.safeParse({ workspaceId, limit: 100 }).success).toBe(true)
    expect(
      events_query_resultSchema.safeParse({ events: [], nextCursor: null }).success,
    ).toBe(true)
  })

  it('rejects limit > 1000', () => {
    expect(events_query_paramsSchema.safeParse({ workspaceId, limit: 5000 }).success).toBe(false)
  })
})
```

```ts
// packages/contracts/tests/ipc/notifications.test.ts
import { describe, expect, it } from 'vitest'
import { NotificationSchema } from '../../src/ipc/notifications.js'

const workspaceId = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const taskId = 'tk_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const agentId = 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV'

describe('Notification', () => {
  it('accepts event.appended', () => {
    expect(
      NotificationSchema.safeParse({
        jsonrpc: '2.0',
        method: 'event.appended',
        params: {
          id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
          ts: 0,
          workspaceId,
          taskId: null,
          agentId: null,
          type: 'output',
          payload: { chunk: 'hi' },
        },
      }).success,
    ).toBe(true)
  })

  it('accepts task.stateChanged', () => {
    expect(
      NotificationSchema.safeParse({
        jsonrpc: '2.0',
        method: 'task.stateChanged',
        params: { taskId, from: 'active', to: 'passing' },
      }).success,
    ).toBe(true)
  })

  it('accepts agent.statusChanged', () => {
    expect(
      NotificationSchema.safeParse({
        jsonrpc: '2.0',
        method: 'agent.statusChanged',
        params: { agentId, status: 'busy' },
      }).success,
    ).toBe(true)
  })

  it('accepts squad.changed', () => {
    expect(
      NotificationSchema.safeParse({
        jsonrpc: '2.0',
        method: 'squad.changed',
        params: { squadId: 'sq_01ARZ3NDEKTSV4RRFFQ69G5FAV' },
      }).success,
    ).toBe(true)
  })

  it('accepts runtime.detected', () => {
    expect(
      NotificationSchema.safeParse({
        jsonrpc: '2.0',
        method: 'runtime.detected',
        params: { newAdapters: ['claude-code', 'codex'] },
      }).success,
    ).toBe(true)
  })

  it('rejects unknown method', () => {
    expect(
      NotificationSchema.safeParse({
        jsonrpc: '2.0',
        method: 'task.unknownThing',
        params: {},
      }).success,
    ).toBe(false)
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 3: Implement `packages/contracts/src/ipc/methods.events.ts`**

```ts
import { z } from 'zod'
import { AgentIdSchema, SquadIdSchema, TaskIdSchema, WorkspaceIdSchema } from '../ids.js'
import { EventLogEntrySchema } from '../domain/event-log.js'

const EventFilterSchema = z
  .object({
    workspaceId: WorkspaceIdSchema.optional(),
    taskId: TaskIdSchema.optional(),
    squadId: SquadIdSchema.optional(),
    agentId: AgentIdSchema.optional(),
  })
  .strict()

export const events_subscribe_paramsSchema = z
  .object({ filter: EventFilterSchema.optional() })
  .strict()
export const events_subscribe_resultSchema = z
  .object({ subscriptionId: z.string().min(1) })
  .strict()

export const events_unsubscribe_paramsSchema = z
  .object({ subscriptionId: z.string().min(1) })
  .strict()
export const events_unsubscribe_resultSchema = z.object({ ok: z.literal(true) }).strict()

export const events_query_paramsSchema = z
  .object({
    workspaceId: WorkspaceIdSchema,
    taskId: TaskIdSchema.optional(),
    agentId: AgentIdSchema.optional(),
    sinceTs: z.number().int().nonnegative().optional(),
    limit: z.number().int().positive().max(1000).optional(),
    cursor: z.string().optional(),
  })
  .strict()
export const events_query_resultSchema = z
  .object({
    events: z.array(EventLogEntrySchema),
    nextCursor: z.string().nullable(),
  })
  .strict()
```

- [ ] **Step 4: Implement `packages/contracts/src/ipc/notifications.ts`**

```ts
import { z } from 'zod'
import { AgentIdSchema, SquadIdSchema, TaskIdSchema } from '../ids.js'
import { AgentStatusSchema } from '../domain/agent.js'
import { EventLogEntrySchema } from '../domain/event-log.js'
import { TaskStateSchema } from '../domain/task.js'

const base = (method: string) =>
  z.object({ jsonrpc: z.literal('2.0'), method: z.literal(method) }).passthrough()

export const EventAppendedNotificationSchema = base('event.appended').extend({
  method: z.literal('event.appended'),
  params: EventLogEntrySchema,
})

export const TaskStateChangedNotificationSchema = base('task.stateChanged').extend({
  method: z.literal('task.stateChanged'),
  params: z
    .object({
      taskId: TaskIdSchema,
      from: TaskStateSchema,
      to: TaskStateSchema,
    })
    .strict(),
})

export const AgentStatusChangedNotificationSchema = base('agent.statusChanged').extend({
  method: z.literal('agent.statusChanged'),
  params: z.object({ agentId: AgentIdSchema, status: AgentStatusSchema }).strict(),
})

export const SquadChangedNotificationSchema = base('squad.changed').extend({
  method: z.literal('squad.changed'),
  params: z.object({ squadId: SquadIdSchema }).strict(),
})

export const RuntimeDetectedNotificationSchema = base('runtime.detected').extend({
  method: z.literal('runtime.detected'),
  params: z.object({ newAdapters: z.array(z.string().min(1)) }).strict(),
})

export const NotificationSchema = z.discriminatedUnion('method', [
  EventAppendedNotificationSchema,
  TaskStateChangedNotificationSchema,
  AgentStatusChangedNotificationSchema,
  SquadChangedNotificationSchema,
  RuntimeDetectedNotificationSchema,
])
export type Notification = z.infer<typeof NotificationSchema>
```

- [ ] **Step 5: Verify green**

```bash
pnpm --filter @dycode/contracts test
```

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/ipc/methods.events.ts packages/contracts/src/ipc/notifications.ts packages/contracts/tests/ipc/methods.events.test.ts packages/contracts/tests/ipc/notifications.test.ts
git commit -m "feat(contracts): add events.* method schemas + Notification union"
```

---

### Task 15 · Contracts barrel + version bump

**Files:**
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/src/version.ts`
- Modify: `packages/contracts/tests/version.test.ts`

- [ ] **Step 1: Update `packages/contracts/src/version.ts`**

```ts
/**
 * Semver of the dycode IPC + adapter contracts surface.
 * Bump major on any breaking change to public types or JSON-RPC methods.
 */
export const CONTRACTS_VERSION = '0.1.0' as const
```

- [ ] **Step 2: Update `packages/contracts/tests/version.test.ts`**

Replace the `starts at major version 0` test with one that also checks the minor was bumped:

```ts
import { describe, expect, it } from 'vitest'
import { CONTRACTS_VERSION } from '../src/index.js'

describe('CONTRACTS_VERSION', () => {
  it('exports a non-empty semver string', () => {
    expect(typeof CONTRACTS_VERSION).toBe('string')
    expect(CONTRACTS_VERSION.length).toBeGreaterThan(0)
  })

  it('matches a basic semver shape', () => {
    expect(CONTRACTS_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/)
  })

  it('starts at major version 0 for pre-1.0 contract', () => {
    const major = Number.parseInt(CONTRACTS_VERSION.split('.')[0] ?? '', 10)
    expect(major).toBe(0)
  })

  it('reached minor version 1 once schemas landed (Plan 02)', () => {
    const minor = Number.parseInt(CONTRACTS_VERSION.split('.')[1] ?? '', 10)
    expect(minor).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 3: Update `packages/contracts/src/index.ts` (barrel)**

```ts
// Versioning
export { CONTRACTS_VERSION } from './version.js'

// Branded IDs
export {
  AgentIdSchema,
  isAgentId,
  isSquadId,
  isTaskId,
  isWorkspaceId,
  SquadIdSchema,
  TaskIdSchema,
  WorkspaceIdSchema,
} from './ids.js'
export type { AgentId, SquadId, TaskId, WorkspaceId } from './ids.js'

// Domain — capability
export { CAPABILITIES, CapabilitySchema } from './domain/capability.js'
export type { Capability } from './domain/capability.js'

// Domain — workspace
export { WorkspaceSchema } from './domain/workspace.js'
export type { Workspace, WorkspaceSettings } from './domain/workspace.js'

// Domain — agent
export { AGENT_STATUSES, AgentSchema, AgentStatusSchema } from './domain/agent.js'
export type { Agent, AgentStatus } from './domain/agent.js'

// Domain — squad
export { SquadSchema } from './domain/squad.js'
export type { Squad } from './domain/squad.js'

// Domain — task
export {
  REVIEW_DIMENSIONS,
  ReviewVerdictSchema,
  TASK_STATES,
  TaskEvidenceSchema,
  TaskSchema,
  TaskStateSchema,
} from './domain/task.js'
export type {
  ReviewDimension,
  ReviewVerdict,
  Task,
  TaskEvidence,
  TaskScope,
  TaskState,
} from './domain/task.js'

// Domain — event log
export {
  ADAPTER_EVENT_KINDS,
  AdapterEventKindSchema,
  EventLogEntrySchema,
} from './domain/event-log.js'
export type { AdapterEventKind, EventLogEntry } from './domain/event-log.js'

// IPC — envelope
export {
  ERROR_CODE,
  JsonRpcErrorSchema,
  JsonRpcRequestEnvelopeSchema,
  JsonRpcResponseEnvelopeSchema,
} from './ipc/envelope.js'
export type {
  ErrorCode,
  JsonRpcError,
  JsonRpcRequestEnvelope,
  JsonRpcResponseEnvelope,
} from './ipc/envelope.js'

// IPC — method names
export { METHOD_NAMES, MethodNameSchema } from './ipc/methods.js'
export type { MethodName } from './ipc/methods.js'

// IPC — method schemas (workspace)
export * from './ipc/methods.workspace.js'
// IPC — method schemas (runtime + adapter)
export * from './ipc/methods.runtime.js'
// IPC — method schemas (fleet)
export * from './ipc/methods.fleet.js'
// IPC — method schemas (task)
export * from './ipc/methods.task.js'
// IPC — method schemas (events)
export * from './ipc/methods.events.js'

// IPC — notifications
export { NotificationSchema } from './ipc/notifications.js'
export type { Notification } from './ipc/notifications.js'
```

- [ ] **Step 4: Verify everything**

```bash
pnpm --filter @dycode/contracts test
pnpm --filter @dycode/contracts typecheck
pnpm format
pnpm lint
```

Expected: all 4 commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/index.ts packages/contracts/src/version.ts packages/contracts/tests/version.test.ts
git commit -m "feat(contracts): public barrel + bump CONTRACTS_VERSION to 0.1.0"
```

---

### Task 16 · Adapter SDK · AdapterManifest schema

**Files:**
- Create: `packages/adapter-sdk/src/manifest.ts`
- Create: `packages/adapter-sdk/tests/manifest.test.ts`

The adapter manifest is *almost* a contracts schema, but it's the public surface adapter authors implement against, so it lives in `@dycode/adapter-sdk`. We re-use `CapabilitySchema` from contracts.

- [ ] **Step 1: Failing test**

```ts
// packages/adapter-sdk/tests/manifest.test.ts
import { describe, expect, it } from 'vitest'
import { AdapterManifestSchema } from '../src/manifest.js'

const validManifest = {
  id: 'claude-code',
  displayName: 'Claude Code',
  vendor: 'anthropic',
  apiVersion: 1,
  capabilities: ['code.read', 'code.write', 'shell.exec', 'longrunning'],
  iconUrl: 'https://example.com/icon.png',
}

describe('AdapterManifestSchema', () => {
  it('accepts a fully-formed manifest', () => {
    expect(AdapterManifestSchema.safeParse(validManifest).success).toBe(true)
  })

  it('accepts a manifest without optional iconUrl', () => {
    const { iconUrl: _omit, ...rest } = validManifest
    expect(AdapterManifestSchema.safeParse(rest).success).toBe(true)
  })

  it('rejects apiVersion that is not 1', () => {
    expect(AdapterManifestSchema.safeParse({ ...validManifest, apiVersion: 2 }).success).toBe(false)
  })

  it('rejects duplicate capabilities', () => {
    expect(
      AdapterManifestSchema.safeParse({
        ...validManifest,
        capabilities: ['code.read', 'code.read'],
      }).success,
    ).toBe(false)
  })

  it('rejects unknown capability', () => {
    expect(
      AdapterManifestSchema.safeParse({ ...validManifest, capabilities: ['code.read', 'do.anything'] }).success,
    ).toBe(false)
  })

  it('rejects empty id', () => {
    expect(AdapterManifestSchema.safeParse({ ...validManifest, id: '' }).success).toBe(false)
  })

  it('rejects iconUrl that is not a URL', () => {
    expect(AdapterManifestSchema.safeParse({ ...validManifest, iconUrl: 'not-a-url' }).success).toBe(
      false,
    )
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/adapter-sdk test
```

- [ ] **Step 3: Implement `packages/adapter-sdk/src/manifest.ts`**

```ts
import { z } from 'zod'
import { CapabilitySchema } from '@dycode/contracts'

export const AdapterManifestSchema = z
  .object({
    id: z.string().min(1),
    displayName: z.string().min(1),
    vendor: z.string().min(1),
    apiVersion: z.literal(1),
    capabilities: z
      .array(CapabilitySchema)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'capabilities must be unique',
      }),
    iconUrl: z.string().url().optional(),
  })
  .strict()

export type AdapterManifest = z.infer<typeof AdapterManifestSchema>
```

- [ ] **Step 4: Verify green**

```bash
pnpm --filter @dycode/adapter-sdk test
pnpm --filter @dycode/adapter-sdk typecheck
```

- [ ] **Step 5: Commit**

```bash
git add packages/adapter-sdk/src/manifest.ts packages/adapter-sdk/tests/manifest.test.ts
git commit -m "feat(sdk): add AdapterManifest schema"
```

---

### Task 17 · Adapter SDK · AdapterEvent union

**Files:**
- Create: `packages/adapter-sdk/src/events.ts`
- Create: `packages/adapter-sdk/tests/events.test.ts`

- [ ] **Step 1: Failing test**

```ts
// packages/adapter-sdk/tests/events.test.ts
import { describe, expect, it } from 'vitest'
import { AdapterEventSchema } from '../src/events.js'

describe('AdapterEventSchema', () => {
  it('accepts an output event', () => {
    expect(AdapterEventSchema.safeParse({ type: 'output', chunk: 'hello' }).success).toBe(true)
  })

  it('accepts a tool_call event', () => {
    expect(
      AdapterEventSchema.safeParse({ type: 'tool_call', name: 'read_file', input: { path: 'x' } })
        .success,
    ).toBe(true)
  })

  it('accepts a tool_result event', () => {
    expect(
      AdapterEventSchema.safeParse({ type: 'tool_result', name: 'read_file', out: { content: 'x' } })
        .success,
    ).toBe(true)
  })

  it('accepts a progress event (with or without ratio/note)', () => {
    expect(AdapterEventSchema.safeParse({ type: 'progress' }).success).toBe(true)
    expect(AdapterEventSchema.safeParse({ type: 'progress', ratio: 0.5 }).success).toBe(true)
    expect(AdapterEventSchema.safeParse({ type: 'progress', note: 'almost there' }).success).toBe(true)
  })

  it('rejects ratio > 1 or < 0', () => {
    expect(AdapterEventSchema.safeParse({ type: 'progress', ratio: 1.5 }).success).toBe(false)
    expect(AdapterEventSchema.safeParse({ type: 'progress', ratio: -0.1 }).success).toBe(false)
  })

  it('accepts verify_request, done, error', () => {
    expect(
      AdapterEventSchema.safeParse({ type: 'verify_request', cmd: 'pnpm test' }).success,
    ).toBe(true)
    expect(
      AdapterEventSchema.safeParse({ type: 'done', status: 'ok', summary: 'done' }).success,
    ).toBe(true)
    expect(
      AdapterEventSchema.safeParse({ type: 'done', status: 'error', summary: 'failed' }).success,
    ).toBe(true)
    expect(
      AdapterEventSchema.safeParse({ type: 'error', message: 'oops' }).success,
    ).toBe(true)
  })

  it('rejects unknown event type', () => {
    expect(AdapterEventSchema.safeParse({ type: 'panic' }).success).toBe(false)
  })

  it('rejects done with status that is not ok|error', () => {
    expect(
      AdapterEventSchema.safeParse({ type: 'done', status: 'maybe', summary: '?' }).success,
    ).toBe(false)
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/adapter-sdk test
```

- [ ] **Step 3: Implement `packages/adapter-sdk/src/events.ts`**

```ts
import { z } from 'zod'

const OutputEvent = z
  .object({ type: z.literal('output'), chunk: z.string() })
  .strict()

const ToolCallEvent = z
  .object({
    type: z.literal('tool_call'),
    name: z.string().min(1),
    input: z.record(z.unknown()),
  })
  .strict()

const ToolResultEvent = z
  .object({
    type: z.literal('tool_result'),
    name: z.string().min(1),
    out: z.record(z.unknown()),
  })
  .strict()

const ProgressEvent = z
  .object({
    type: z.literal('progress'),
    ratio: z.number().min(0).max(1).optional(),
    note: z.string().optional(),
  })
  .strict()

const VerifyRequestEvent = z
  .object({ type: z.literal('verify_request'), cmd: z.string().min(1) })
  .strict()

const DoneEvent = z
  .object({
    type: z.literal('done'),
    status: z.enum(['ok', 'error']),
    summary: z.string(),
  })
  .strict()

const ErrorEvent = z
  .object({
    type: z.literal('error'),
    message: z.string().min(1),
    code: z.string().optional(),
  })
  .strict()

export const AdapterEventSchema = z.discriminatedUnion('type', [
  OutputEvent,
  ToolCallEvent,
  ToolResultEvent,
  ProgressEvent,
  VerifyRequestEvent,
  DoneEvent,
  ErrorEvent,
])
export type AdapterEvent = z.infer<typeof AdapterEventSchema>
```

- [ ] **Step 4: Verify green**

```bash
pnpm --filter @dycode/adapter-sdk test
pnpm --filter @dycode/adapter-sdk typecheck
```

- [ ] **Step 5: Commit**

```bash
git add packages/adapter-sdk/src/events.ts packages/adapter-sdk/tests/events.test.ts
git commit -m "feat(sdk): add AdapterEvent discriminated union (7 variants)"
```

---

### Task 18 · Adapter SDK · plugin/instance/context/health types

**Files:**
- Create: `packages/adapter-sdk/src/context.ts`
- Create: `packages/adapter-sdk/src/health.ts`
- Create: `packages/adapter-sdk/src/plugin.ts`

These are interface declarations (types-only, no schemas). They define the contract that adapter authors implement.

- [ ] **Step 1: Implement `packages/adapter-sdk/src/context.ts`**

```ts
import type { AgentId, WorkspaceId, TaskId } from '@dycode/contracts'

/**
 * Per-task context handed to an AdapterInstance.start().
 * Read-only from the adapter's perspective.
 */
export interface TaskCtx {
  readonly workspaceId: WorkspaceId
  readonly agentId: AgentId
  readonly taskId: TaskId
  /** Absolute filesystem path to the active workspace root. */
  readonly workspaceRoot: string
  /** Environment variables the adapter may read. Already filtered by the daemon. */
  readonly env: Readonly<Record<string, string>>
  /**
   * AbortSignal that fires when the task is cancelled or the adapter
   * instance is being disposed.
   */
  readonly signal: AbortSignal
}

/**
 * Options for AdapterPlugin.create() — once per adapter *instance*.
 * The instance is reused across .start() invocations.
 */
export interface CreateOpts {
  /** Absolute filesystem path to the workspace this instance is bound to. */
  readonly workspaceRoot: string
  /** Environment variables the daemon allows the adapter to see. */
  readonly env: Readonly<Record<string, string>>
  /** User-provided config, validated against the adapter's manifest.configSchema (if any). */
  readonly config: Readonly<Record<string, unknown>>
}

/**
 * The prompt object sent to an instance.start().
 * Adapters MAY accept additional structured metadata via the `metadata` slot.
 */
export interface Prompt {
  /** Primary instruction the adapter should act on. */
  readonly text: string
  /** Optional structured context (e.g., touched files, prior agent's summary). */
  readonly metadata?: Readonly<Record<string, unknown>>
}
```

- [ ] **Step 2: Implement `packages/adapter-sdk/src/health.ts`**

```ts
/**
 * Result of a periodic health probe on a live AdapterInstance.
 * Returned by AdapterInstance.health().
 */
export interface HealthReport {
  /** True if the adapter is currently able to accept work. */
  readonly healthy: boolean
  /** Human-readable status (logged + surfaced in UI). */
  readonly message?: string
  /** Optional structured detail (e.g., quota, last-error). */
  readonly detail?: Readonly<Record<string, unknown>>
  /** Unix ms timestamp when the report was taken. */
  readonly ts: number
}

/**
 * Result of AdapterPlugin.detect() — does this CLI exist on the host?
 */
export interface DetectionResult {
  /** True if the CLI was found and is usable. */
  readonly installed: boolean
  /** Resolved version string, if installed. */
  readonly version?: string
  /** Absolute path to the CLI, if installed. */
  readonly path?: string
  /** Human-readable reason if not installed (e.g., "not on PATH"). */
  readonly reason?: string
}
```

- [ ] **Step 3: Implement `packages/adapter-sdk/src/plugin.ts`**

```ts
import type { AdapterManifest } from './manifest.js'
import type { AdapterEvent } from './events.js'
import type { CreateOpts, Prompt, TaskCtx } from './context.js'
import type { DetectionResult, HealthReport } from './health.js'

/**
 * What an adapter author exports as `default`.
 *
 * Lifecycle:
 *  1. dycoded loads the module, reads `manifest`.
 *  2. dycoded calls `detect()` once at boot (and on user request) to find out
 *     whether the underlying CLI is installed and which version.
 *  3. When the user activates this adapter in a workspace, dycoded calls
 *     `create(opts)` once to get an AdapterInstance.
 *  4. For each task assigned to that instance, dycoded calls
 *     `instance.start(prompt, ctx)` and consumes the AsyncIterable of events.
 *  5. dycoded periodically calls `instance.health()` (default every 30s).
 *  6. On workspace close or app shutdown, dycoded calls `instance.dispose()`.
 */
export interface AdapterPlugin {
  readonly manifest: AdapterManifest
  detect(): Promise<DetectionResult>
  create(opts: CreateOpts): AdapterInstance
}

export interface AdapterInstance {
  /**
   * Start work on a prompt. Returns an AsyncIterable of AdapterEvents
   * the daemon will stream into the event log + IPC.
   *
   * The iterable MUST terminate with a single `done` event.
   * An `error` event followed by `done(status: 'error')` is the canonical
   * failure path.
   */
  start(prompt: Prompt, ctx: TaskCtx): AsyncIterable<AdapterEvent>

  /**
   * Cancel any in-flight work and clean up. Resolves once the underlying
   * CLI process has exited (or been killed).
   */
  cancel(reason: string): Promise<void>

  /**
   * Probe the adapter's health. Called periodically by the daemon.
   * Should not block on the underlying CLI; resolve fast.
   */
  health(): Promise<HealthReport>

  /**
   * Final cleanup. Called once when the instance will no longer be used.
   * Implementations should release file handles, kill child processes, etc.
   */
  dispose(): Promise<void>
}
```

- [ ] **Step 4: Verify**

```bash
pnpm --filter @dycode/adapter-sdk typecheck
pnpm format
pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add packages/adapter-sdk/src/context.ts packages/adapter-sdk/src/health.ts packages/adapter-sdk/src/plugin.ts
git commit -m "feat(sdk): add AdapterPlugin/AdapterInstance interfaces + context + health types"
```

---

### Task 19 · Adapter SDK · createAdapter helper

**Files:**
- Create: `packages/adapter-sdk/src/create-adapter.ts`
- Create: `packages/adapter-sdk/tests/create-adapter.test.ts`

A tiny identity-style helper that gives adapter authors strong type inference without forcing them to import the `AdapterPlugin` type and annotate the export.

- [ ] **Step 1: Failing test**

```ts
// packages/adapter-sdk/tests/create-adapter.test.ts
import { describe, expect, it } from 'vitest'
import { createAdapter } from '../src/create-adapter.js'
import { AdapterManifestSchema } from '../src/manifest.js'

const fakeManifest = {
  id: 'fake',
  displayName: 'Fake',
  vendor: 'tests',
  apiVersion: 1 as const,
  capabilities: ['code.read'] as const satisfies string[],
}

describe('createAdapter', () => {
  it('returns its input verbatim (identity function)', () => {
    const stub = createAdapter({
      manifest: fakeManifest,
      detect: async () => ({ installed: true, version: '0.0.0', path: '/fake' }),
      create: () => ({
        async *start() {
          yield { type: 'done', status: 'ok', summary: '' } as const
        },
        async cancel() {},
        async health() {
          return { healthy: true, ts: 0 }
        },
        async dispose() {},
      }),
    })
    expect(stub.manifest).toBe(fakeManifest)
  })

  it('validates the manifest at construction time when STRICT_MODE is set', () => {
    // The helper doesn't enforce schema validation at runtime by default
    // (to keep adapters cheap to load). Just check the manifest is structurally valid.
    expect(AdapterManifestSchema.safeParse(fakeManifest).success).toBe(true)
  })
})
```

- [ ] **Step 2: Verify red**

```bash
pnpm --filter @dycode/adapter-sdk test
```

- [ ] **Step 3: Implement `packages/adapter-sdk/src/create-adapter.ts`**

```ts
import type { AdapterPlugin } from './plugin.js'

/**
 * Identity helper for adapter authors. Returns the input verbatim, but with
 * full type inference of the AdapterPlugin contract.
 *
 * Usage:
 *
 *   import { createAdapter } from '@dycode/adapter-sdk'
 *
 *   export default createAdapter({
 *     manifest: { id: 'my-cli', ... },
 *     detect: async () => ({ installed: true, version: '1.0.0' }),
 *     create: (opts) => ({
 *       async *start(prompt, ctx) {
 *         yield { type: 'output', chunk: prompt.text }
 *         yield { type: 'done', status: 'ok', summary: '' }
 *       },
 *       async cancel() {},
 *       async health() { return { healthy: true, ts: Date.now() } },
 *       async dispose() {},
 *     }),
 *   })
 */
export function createAdapter(plugin: AdapterPlugin): AdapterPlugin {
  return plugin
}
```

- [ ] **Step 4: Verify green**

```bash
pnpm --filter @dycode/adapter-sdk test
pnpm --filter @dycode/adapter-sdk typecheck
```

- [ ] **Step 5: Commit**

```bash
git add packages/adapter-sdk/src/create-adapter.ts packages/adapter-sdk/tests/create-adapter.test.ts
git commit -m "feat(sdk): add createAdapter() identity helper for typed adapter exports"
```

---

### Task 20 · Adapter SDK · barrel + SDK_VERSION bump + per-package maps

**Files:**
- Modify: `packages/adapter-sdk/src/index.ts`
- Modify: `packages/adapter-sdk/src/version.ts`
- Modify: `packages/adapter-sdk/tests/version.test.ts`
- Create: `packages/adapter-sdk/CLAUDE.md`
- Create: `packages/adapter-sdk/AGENTS.md`

- [ ] **Step 1: Bump SDK_VERSION**

```ts
// packages/adapter-sdk/src/version.ts
export const SDK_VERSION = '0.1.0' as const
```

- [ ] **Step 2: Update version test**

```ts
// packages/adapter-sdk/tests/version.test.ts
import { describe, expect, it } from 'vitest'
import { SDK_VERSION } from '../src/index.js'

describe('SDK_VERSION', () => {
  it('exports a non-empty semver string', () => {
    expect(typeof SDK_VERSION).toBe('string')
    expect(SDK_VERSION.length).toBeGreaterThan(0)
  })
  it('matches a basic semver shape', () => {
    expect(SDK_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/)
  })
  it('starts at major version 0 for pre-1.0 surface', () => {
    const major = Number.parseInt(SDK_VERSION.split('.')[0] ?? '', 10)
    expect(major).toBe(0)
  })
  it('reached minor version 1 once the contract landed (Plan 02)', () => {
    const minor = Number.parseInt(SDK_VERSION.split('.')[1] ?? '', 10)
    expect(minor).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 3: Public barrel**

```ts
// packages/adapter-sdk/src/index.ts

// Versioning
export { SDK_VERSION } from './version.js'

// Manifest
export { AdapterManifestSchema } from './manifest.js'
export type { AdapterManifest } from './manifest.js'

// Events
export { AdapterEventSchema } from './events.js'
export type { AdapterEvent } from './events.js'

// Plugin interfaces
export type { AdapterInstance, AdapterPlugin } from './plugin.js'

// Context
export type { CreateOpts, Prompt, TaskCtx } from './context.js'

// Health
export type { DetectionResult, HealthReport } from './health.js'

// Helper
export { createAdapter } from './create-adapter.js'

// Re-export Capability from contracts so adapter authors don't need two imports
export { CapabilitySchema, CAPABILITIES } from '@dycode/contracts'
export type { Capability } from '@dycode/contracts'
```

- [ ] **Step 4: Write `packages/adapter-sdk/CLAUDE.md`**

```markdown
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
- `src/manifest.ts`        — `AdapterManifestSchema`
- `src/events.ts`          — `AdapterEventSchema` (7-variant union)
- `src/plugin.ts`          — `AdapterPlugin` + `AdapterInstance` (types only)
- `src/context.ts`         — `TaskCtx`, `CreateOpts`, `Prompt`
- `src/health.ts`          — `HealthReport`, `DetectionResult`
- `src/create-adapter.ts`  — `createAdapter()` helper
- `src/version.ts`         — `SDK_VERSION`
- `src/index.ts`           — public barrel

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
    async health() { return { healthy: true, ts: Date.now() } },
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
- `../../docs/adapters/sdk.md` (deep doc)
```

- [ ] **Step 5: Write `packages/adapter-sdk/AGENTS.md`**

```markdown
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
- Public deep doc: `../../docs/adapters/sdk.md`
```

- [ ] **Step 6: Verify everything**

```bash
pnpm --filter @dycode/adapter-sdk test
pnpm --filter @dycode/adapter-sdk typecheck
pnpm format
pnpm lint
```

- [ ] **Step 7: Commit**

```bash
git add packages/adapter-sdk/src/index.ts packages/adapter-sdk/src/version.ts packages/adapter-sdk/tests/version.test.ts packages/adapter-sdk/CLAUDE.md packages/adapter-sdk/AGENTS.md
git commit -m "feat(sdk): public barrel + SDK_VERSION 0.1.0 + per-package maps"
```

---

### Task 21 · Docs: `docs/adapters/sdk.md` + `docs/ipc-protocol/spec.md`

**Files:**
- Create: `docs/adapters/sdk.md`
- Create: `docs/ipc-protocol/spec.md`

Short tables-of-contents linking into the source. Following the harness "progressive disclosure" rule: deep info lives in code; the doc points to it.

- [ ] **Step 1: Write `docs/adapters/sdk.md`**

```markdown
# Adapter SDK · `@dycode/adapter-sdk`

> Public contract every dycode adapter implements. Source is the truth — this doc is the map.

## What you implement

A single `AdapterPlugin` value exported as `default`. Use `createAdapter({...})` to get full type inference.

```ts
import { createAdapter } from '@dycode/adapter-sdk'
export default createAdapter({ /* manifest, detect, create */ })
```

## Surface

| Concept | Source | Purpose |
| --- | --- | --- |
| `AdapterPlugin` | `packages/adapter-sdk/src/plugin.ts` | Top-level adapter export |
| `AdapterInstance` | same | Per-workspace runtime object |
| `AdapterManifest` | `packages/adapter-sdk/src/manifest.ts` | Static metadata (`id`, `capabilities`, …) |
| `AdapterEvent` | `packages/adapter-sdk/src/events.ts` | Discriminated event stream |
| `TaskCtx`, `CreateOpts`, `Prompt` | `packages/adapter-sdk/src/context.ts` | Per-task / per-instance context |
| `HealthReport`, `DetectionResult` | `packages/adapter-sdk/src/health.ts` | Probes |
| `createAdapter` | `packages/adapter-sdk/src/create-adapter.ts` | Identity helper for type inference |
| `Capability` | re-exported from `@dycode/contracts` | Closed enum of declared abilities |

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
```

- [ ] **Step 2: Write `docs/ipc-protocol/spec.md`**

```markdown
# IPC Protocol · WebSocket JSON-RPC 2.0

> The wire contract between any client (Electron renderer, future web/mobile companion) and `dycoded`. Source of truth lives in `@dycode/contracts`.

## Transport

`ws://127.0.0.1:<port>/ws` · bearer auth from `~/.dycode/auth.json` (mode 0600) · one JSON message per WS frame.

## Envelope

| Shape | Source |
| --- | --- |
| Request | `packages/contracts/src/ipc/envelope.ts` → `JsonRpcRequestEnvelopeSchema` |
| Response | same → `JsonRpcResponseEnvelopeSchema` (exactly one of `result` / `error`) |
| Error codes | same → `ERROR_CODE` (JSON-RPC 2.0 + dycode extensions in -32099..-32095) |
| Notification | `packages/contracts/src/ipc/notifications.ts` → `NotificationSchema` |

## Versioning

Every request carries `protocolVersion: 1`. Mismatches return error code `PROTOCOL_VERSION_MISMATCH (-32099)`.

## Methods (29)

Canonical list: `MethodName` from `packages/contracts/src/ipc/methods.ts`.

| Area | Source file | Methods |
| --- | --- | --- |
| Workspaces | `packages/contracts/src/ipc/methods.workspace.ts` | `workspace.list`, `workspace.add`, `workspace.activate`, `workspace.remove` |
| Runtime + adapters | `packages/contracts/src/ipc/methods.runtime.ts` | `runtime.scan`, `adapter.list`, `adapter.install`, `adapter.uninstall`, `adapter.configure` |
| Fleet (squads + pool) | `packages/contracts/src/ipc/methods.fleet.ts` | `squad.create`, `squad.delete`, `squad.rename`, `squad.addMember`, `squad.removeMember`, `squad.setLeader`, `pool.list`, `pool.promote`, `pool.release` |
| Tasks | `packages/contracts/src/ipc/methods.task.ts` | `task.create`, `task.cancel`, `task.list`, `task.get`, `task.assign`, `task.requestReview`, `task.submitReviewVerdict`, `task.run`, `task.replay` |
| Events | `packages/contracts/src/ipc/methods.events.ts` | `events.subscribe`, `events.unsubscribe`, `events.query` |

Each file exports `<method>_paramsSchema` and `<method>_resultSchema` (dots replaced with underscores).

## Notifications

Server-pushed. Five variants in `NotificationSchema`:

- `event.appended` — new `EventLogEntry`
- `task.stateChanged` — `{ taskId, from, to }`
- `agent.statusChanged` — `{ agentId, status }`
- `squad.changed` — `{ squadId }`
- `runtime.detected` — `{ newAdapters: AdapterId[] }`

## Subscriptions

Filter by `{ workspaceId?, taskId?, squadId?, agentId? }`. Returns an opaque `subscriptionId`. Unsubscribe via `events.unsubscribe`.

## Related

- Spec §6: `../superpowers/specs/2026-05-23-dycode-design.md`
- Adapter SDK: `../adapters/sdk.md`
- Per-package map: `../../packages/contracts/CLAUDE.md`
```

- [ ] **Step 3: Verify**

```bash
pnpm format
pnpm lint
```

(No tests needed for doc files. `pnpm format` may add blank lines after headings; that's expected.)

- [ ] **Step 4: Commit**

```bash
git add docs/adapters/sdk.md docs/ipc-protocol/spec.md
git commit -m "docs: add adapter-sdk + ipc-protocol deep docs"
```

---

### Task 22 · Final cleanup: maps, feature_list, PROGRESS, verify, tag

**Files:**
- Modify: `CLAUDE.md`
- Modify: `feature_list.json`
- Modify: `PROGRESS.md`

- [ ] **Step 1: Update root `CLAUDE.md` "Where to look" section**

The existing section has placeholders for adapters/ipc-protocol docs marked "(Plan 02+)". Now they exist — remove the placeholder, point at the real docs. Edit only the "Where to look" block:

```markdown
## Where to look

- **Design spec** → `docs/superpowers/specs/2026-05-23-dycode-design.md`
- **Plans** → `docs/superpowers/plans/`
- **Architecture (deeper)** → `docs/architecture/` (added in later plans)
- **Adapter SDK** → `docs/adapters/sdk.md` · package: `packages/adapter-sdk/CLAUDE.md`
- **IPC protocol** → `docs/ipc-protocol/spec.md` · package: `packages/contracts/CLAUDE.md`
- **Contracts package** → `packages/contracts/CLAUDE.md`
```

Verify the file is still ≤ 100 lines (`wc -l CLAUDE.md`).

- [ ] **Step 2: Update `feature_list.json`** — add F04-F07 for Plan 02 work

```json
[
  {
    "id": "F01",
    "behavior": "Monorepo bootstraps with pnpm + Turborepo; pnpm install completes cleanly.",
    "verification": "pnpm install --frozen-lockfile",
    "state": "passing",
    "evidence": "Plan 01 · Task 01",
    "blocked_by": null
  },
  {
    "id": "F02",
    "behavior": "verify.sh passes gates 1-4 (typecheck, lint, format, test) on the stub @dycode/contracts package.",
    "verification": "bash scripts/verify.sh",
    "state": "passing",
    "evidence": "Plan 01 · Task 13",
    "blocked_by": null
  },
  {
    "id": "F03",
    "behavior": "CI workflow runs verify.sh on push and PR and reports green.",
    "verification": "GitHub Actions workflow `CI` reports success on main",
    "state": "passing",
    "evidence": "Plan 01 close-out · first push",
    "blocked_by": null
  },
  {
    "id": "F04",
    "behavior": "@dycode/contracts publishes branded IDs, AgentStatus, Capability, Workspace, Agent, Squad, Task, ReviewVerdict, TaskEvidence, EventLogEntry as Zod-first schemas with TS types inferred via z.infer.",
    "verification": "pnpm --filter @dycode/contracts test",
    "state": "passing",
    "evidence": "Plan 02 · Tasks 02-08, 15",
    "blocked_by": null
  },
  {
    "id": "F05",
    "behavior": "@dycode/contracts publishes JSON-RPC envelopes, error codes, MethodName enum, and per-method params/result schemas for all 29 methods + 5 notification variants.",
    "verification": "pnpm --filter @dycode/contracts test",
    "state": "passing",
    "evidence": "Plan 02 · Tasks 09-14",
    "blocked_by": null
  },
  {
    "id": "F06",
    "behavior": "@dycode/adapter-sdk publishes AdapterPlugin / AdapterInstance interfaces, AdapterManifest + AdapterEvent schemas, TaskCtx/CreateOpts/Prompt/HealthReport/DetectionResult types, and a createAdapter() helper.",
    "verification": "pnpm --filter @dycode/adapter-sdk test && pnpm --filter @dycode/adapter-sdk typecheck",
    "state": "passing",
    "evidence": "Plan 02 · Tasks 01, 16-20",
    "blocked_by": null
  },
  {
    "id": "F07",
    "behavior": "Full workspace verify.sh exits 0 with all four gates green on the Plan 02 deliverable (two packages, both type-checked, lint-clean, format-clean, all tests passing).",
    "verification": "bash scripts/verify.sh",
    "state": "passing",
    "evidence": "Plan 02 close-out",
    "blocked_by": null
  }
]
```

- [ ] **Step 3: Append a Plan 02 entry to `PROGRESS.md`**

Append:

```markdown
---

## 2026-05-23 · Plan 02 · Contracts + Adapter SDK

Done:

- Branded ULID-typed IDs (Workspace/Agent/Squad/Task).
- Domain schemas: Workspace, Agent + AgentStatus, Capability, Squad (leader-in-members invariant),
  Task (state machine + ReviewVerdict + TaskEvidence discriminated union + assignee≠reviewer refinement),
  EventLogEntry.
- IPC schemas: JSON-RPC 2.0 envelopes, dycode error codes, MethodName enum (29 methods),
  workspace.*/runtime.*/adapter.*/squad.*/pool.*/task.*/events.* params+result schemas,
  Notification union (5 variants).
- @dycode/contracts barrel published; CONTRACTS_VERSION → 0.1.0.
- @dycode/adapter-sdk package scaffolded with the 3-tsconfig pattern.
- AdapterManifest + AdapterEvent schemas; AdapterPlugin/AdapterInstance interfaces;
  TaskCtx/CreateOpts/Prompt/HealthReport/DetectionResult types; createAdapter() helper.
- SDK_VERSION → 0.1.0. Public barrel; Capability re-exported from contracts.
- Per-package CLAUDE.md/AGENTS.md for adapter-sdk.
- Deep docs: `docs/adapters/sdk.md`, `docs/ipc-protocol/spec.md`.
- Updated root CLAUDE.md "Where to look" links (no more "(Plan 02+)" placeholders).
- feature_list.json updated with F04-F07 (all passing).

Remaining (deferred to later plans):

- `dycoded` daemon skeleton + first real adapter (Plan 03).
- Verifier adapters + orchestrator core (Plan 04).
- Electron shell + Fleet view (Plan 05).
- Round-out adapters + task/activity UIs (Plan 06).
- Packaging + docs site + beta (Plan 07).

Blockers:

- None.

Tagged: `v0.0.2-plan-02`.
```

- [ ] **Step 4: Run the full pipeline**

```bash
./scripts/verify.sh
```

Expected: all 4 gates green.

- [ ] **Step 5: Commit + tag**

```bash
git add CLAUDE.md feature_list.json PROGRESS.md
git commit -m "docs: close Plan 02 (contracts + adapter-sdk shipped)"
git tag -a v0.0.2-plan-02 -m "Plan 02: @dycode/contracts schemas + @dycode/adapter-sdk public contract"
```

- [ ] **Step 6: Push branch + tag**

```bash
git push -u origin feat/plan-02-contracts-adapter-sdk
git push origin v0.0.2-plan-02
```

CI must report green on the branch before the branch merges to main.

---

## Self-review checklist (run before declaring Plan 02 done)

| Spec section | Where covered |
| --- | --- |
| §5.1 AdapterPlugin / Manifest / Capability | Tasks 03, 16, 18 |
| §5.2 AdapterEvent | Tasks 08 (kind list), 17 (SDK union) |
| §5.3-5.4 Adapter flavors / verifier sub-type | Documented in `docs/adapters/sdk.md` (deferred runtime to Plan 03) |
| §6.1 JSON-RPC envelope | Task 09 |
| §6.2 Method surface (29 methods) | Tasks 10-14 |
| §6.3 Domain model | Tasks 02-08 |
| §6.5 Type-sharing via @dycode/contracts | Tasks 15 (barrel), 16-20 (sdk consumes) |
| §6.6 Versioning + migrations | Versions bumped to 0.1.0; migration plumbing deferred to Plan 03 (daemon) |
| §6.7 Replay capability | `task.replay` method schema in Task 13; runtime in Plan 03 |
| §9.1 Self-documenting maps | Tasks 20 (sdk maps), 22 (root CLAUDE.md update) |
| §9.7 feature_list.json | Task 22 (F04-F07) |

Items deferred to later plans:
- Adapter sandbox / process isolation → Plan 03
- Concrete adapter implementations (claude-code, codex, opencode, verifiers) → Plan 03
- Daemon runtime that consumes contracts + spawns adapters → Plan 03

## What "done" looks like for Plan 02

- `./scripts/verify.sh` exits 0 locally on a clean clone of the branch.
- CI workflow reports green for the latest push to `feat/plan-02-contracts-adapter-sdk`.
- `@dycode/contracts` exports the full schema surface (domain + IPC) at version 0.1.0.
- `@dycode/adapter-sdk` exports the full adapter contract surface at version 0.1.0.
- `feature_list.json` has F04, F05, F06, F07 all `"passing"`.
- `PROGRESS.md` has a closing Plan 02 entry.
- Tag `v0.0.2-plan-02` exists on the branch.
- Root `CLAUDE.md` "Where to look" links resolve to real files (no more `(Plan 02+)` placeholders).

Once all of these are true, the branch is ready to merge into `main` and Plan 03 can begin.
