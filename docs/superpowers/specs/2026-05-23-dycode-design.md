# dycode — Multi-Agent Orchestration IDE · Design Spec

| Field           | Value                                                       |
| --------------- | ----------------------------------------------------------- |
| Codename        | **dycode**                                                  |
| Working title   | DyCode Control Room                                         |
| Status          | Design Approved · Pre-Implementation                        |
| Spec date       | 2026-05-23                                                  |
| Spec authors    | Carlo Miguel Dy · Claude (Opus 4.7) brainstorming session   |
| Implementation  | To follow via `writing-plans` skill                         |
| License         | Apache 2.0                                                  |

---

## 0 · Executive summary

`dycode` is an open-source, Electron-based **multi-agent orchestration IDE**. It treats CLI agent harnesses
(Claude Code, Codex, OpenCode, OpenClaw, Hermes, Gemini-CLI, Cursor Agent, Kimi, Kiro CLI, and others)
as first-class runtimes that can be discovered on the local machine, grouped into **squads** with leaders,
or kept in a **free pool** for ad-hoc work — and orchestrated together via a long-running sidecar daemon.

The product surface is a **Control Room** — the fleet of agents is the primary view; the code editor and
terminal live behind collapsible drawers. The product mental model and the development methodology of the
project itself are both grounded in **harness engineering** (OpenAI Frontier, Walking Labs):
*the model didn't change — the harness did.*

dycode ships with a plugin-first adapter SDK from day one. Two stable contracts (the IDE↔daemon protocol
and the daemon↔adapter protocol) keep every other concern free to evolve.

---

## 1 · Foundation decisions

| Concern              | Decision                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Product shape        | **Control Room** — fleet-first IDE; editor + terminal are summonable drawers                   |
| Topology             | **Squads + Free Pool** — stable named groups with a leader, plus an ad-hoc pool                |
| Shell stack          | Electron + TypeScript · React · Vite · **shadcn UI + Tailwind v4**                             |
| Runtime architecture | **Sidecar daemon** (`dycoded`, Node/TS) over WebSocket JSON-RPC; Electron is a thin client     |
| Persistence          | **SQLite** (better-sqlite3) inside the daemon; append-only event log is source of truth        |
| MVP scope            | **Plugin-first** · ship with adapters for claude-code, codex, opencode + 5 verifier adapters   |
| License              | **Apache 2.0** (explicit patent grant + permissive)                                            |
| Workspace model      | **VS Code-style multi-workspace**, one project active per IDE window                           |
| Design language      | Terminal-brutalism · oklch dark palette · acid-lime accent · IBM Plex Mono + Sans              |
| Governance           | Harness-engineering driven · `CLAUDE.md`/`AGENTS.md` maps · 5-gate quality bar (reviewer 10/10) |
| Monorepo tooling     | **pnpm workspaces + Turborepo**                                                                |

---

## 2 · System overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  USER MACHINE                                                            │
│                                                                          │
│  ┌──────────────────────────┐         ┌───────────────────────────────┐ │
│  │  dycode.app  (Electron)  │  ws://  │  dycoded  (Node/TS daemon)    │ │
│  │  · React + shadcn UI     │ ◄─────► │  · orchestrator core          │ │
│  │  · Renderer (Vite)       │ JSON-RPC│  · workspace registry         │ │
│  │  · Monaco editor pane    │  2.0    │  · adapter plugin host        │ │
│  │  · Zustand UI state      │         │  · sqlite (better-sqlite3)    │ │
│  │  · TanStack Query        │         │  · http+ws server (Hono)      │ │
│  │  · React Hook Form + Zod │         │  · cron scheduler             │ │
│  └──────────────────────────┘         └──────────────┬────────────────┘ │
│           ▲                                          │                   │
│           │   (future) headless mode:                │ spawns + manages  │
│           │   web/mobile client connects             ▼                   │
│           │   to the same daemon                                          │
│           │                          ┌──────────────────────────┐       │
│           │                          │  CLI adapter processes   │       │
│           │                          │  (each as a child PTY)   │       │
│           │                          │  · claude-code  (built-in)│       │
│           │                          │  · codex        (built-in)│       │
│           │                          │  · opencode     (built-in)│       │
│           │                          │  · hermes       (plugin) │       │
│           │                          │  · openclaw     (plugin) │       │
│           │                          │  · gemini-cli   (plugin) │       │
│           │                          │  · …                     │       │
│           │                          └──────────────────────────┘       │
└──────────┴──────────────────────────────────────────────────────────────┘
```

**Three big pieces:**

1. **`dycode.app`** — Electron renderer (Vite + React + shadcn). Pure presentation + interaction.
   No business logic, no agent management, no DB. Talks to the daemon over WebSocket. Closing the app
   does not kill agents.
2. **`dycoded`** — Long-lived Node/TS daemon. Owns squads, the pool, tasks, hand-off log, SQLite state,
   and the adapter plugin host. Boots on demand (launched by the Electron app, or run manually for
   headless). Single source of truth for fleet state.
3. **Adapter processes** — Each connected CLI is a child of `dycoded`, spawned through an **adapter
   plugin**. The adapter is the translation layer between dycode's internal protocol and that CLI's
   quirks.

**Two stable contracts** that decouple everything else:

- **IDE ↔ daemon protocol** (WebSocket JSON-RPC 2.0) — versioned, documented, public. Any future
  client (web companion, mobile remote, CLI scripts) speaks this.
- **Daemon ↔ adapter protocol** — defines what an adapter must implement (spawn, send-prompt,
  stream-output, cancel, capabilities, health). Plugin authors target this.

---

## 3 · `dycoded` daemon

### 3.1 Package layout

```
daemons/dycoded/
├── src/
│   ├── runtime/
│   │   ├── boot.ts                 # idempotent startup, lockfile, port pick
│   │   ├── lifecycle.ts            # graceful shutdown, signal handlers
│   │   └── ipc-server.ts           # Hono HTTP + ws JSON-RPC server
│   ├── orchestrator/
│   │   ├── orchestrator.ts         # central coordinator (state machine)
│   │   ├── router.ts               # task → squad/pool routing rules
│   │   ├── handoff.ts              # serialized cross-agent transitions
│   │   └── scheduler.ts            # queue + backpressure + concurrency caps
│   ├── adapters/
│   │   ├── host.ts                 # plugin loader, sandbox, capability negotiation
│   │   ├── registry.ts             # installed adapters + manifests
│   │   ├── adapter-api.ts          # types/contract every adapter implements
│   │   └── builtin/                # claude-code, codex, opencode (Apache 2.0)
│   ├── domain/
│   │   ├── squad.ts                # named groups + leader role
│   │   ├── pool.ts                 # unassigned runtimes
│   │   ├── agent.ts                # adapter instance + capabilities + state
│   │   ├── task.ts                 # work unit + status machine
│   │   └── workspace.ts            # registered project + active project
│   ├── persistence/
│   │   ├── db.ts                   # better-sqlite3 connection + migrations
│   │   ├── schema/                 # one file per table, source of truth
│   │   ├── repositories/           # domain-shaped data access
│   │   └── event-log.ts            # append-only handoff + activity stream
│   ├── detection/
│   │   ├── path-scanner.ts         # which CLIs exist on PATH
│   │   ├── version-probe.ts        # invoke `<cli> --version`, parse, validate
│   │   └── manifest-registry.ts    # known-CLI fingerprints for auto-detect
│   └── telemetry/
│       ├── logger.ts               # pino, file rotation, structured
│       └── metrics.ts              # opt-in
├── migrations/
├── CLAUDE.md
├── AGENTS.md
└── package.json
```

### 3.2 Lifecycle

1. Electron launches → checks for a running `dycoded` (lockfile + port handshake at
   `~/.dycode/runtime.json`) → spawns the sidecar binary if absent.
2. `dycoded` boots → runs migrations forward-only → restores fleet state from SQLite → reattaches PTYs
   for in-flight tasks where possible (otherwise marks them `blocked` with reason `daemon-restart`) →
   starts the IPC server.
3. Electron connects over `ws://127.0.0.1:<port>`, authenticates with a per-session bearer token
   stored in `~/.dycode/auth.json` (file mode 0600).
4. On graceful close: Electron quits, `dycoded` keeps running until `dycoded stop` or OS shutdown.
   Agents in flight continue. A new IDE launch resumes the same fleet.
5. **Headless**: `dycoded --headless` boots with no Electron parent. Same protocol, no UI client.
   Future web/mobile companion can connect identically without daemon changes.

### 3.3 Why these splits matter

- **`orchestrator/`** owns *what* happens (state transitions, routing, hand-offs). Pure logic, unit-testable.
- **`adapters/`** owns *how* a specific CLI is driven. Plugin-hosted (§5).
- **`persistence/`** is a thin repository layer over SQLite — no business logic. Migrations are
  forward-only with a generated migration file per change.
- **`detection/`** is the auto-connect feature — runs on boot and on user request, writes results to
  the runtime registry so the Pool can populate.
- **`event-log.ts`** is critical: every hand-off, status change, output chunk, and decision lands in an
  append-only table. This is what feeds replay, audit, and the Activity tab.

### 3.4 Concurrency model

Single Node process with a worker-thread pool for CPU-bound tasks (output parsing, replay
reconstruction). PTYs are managed via `node-pty` on the main event loop. The orchestrator state machine
is single-threaded — all writes go through one queue — which eliminates a whole class of race
conditions and makes hand-offs deterministic. Each adapter runs its CLI as a child process;
backpressure is per-adapter (cap claude-code at 2 concurrent runs, opencode at 1, etc.).

### 3.5 Escape hatch to Rust

The daemon-adapter contract is strict JSON-RPC. If a hot path (high-volume log streaming, dense PTY
multiplexing) becomes a bottleneck, that subsystem can be rewritten in Rust behind the same protocol
with zero adapter-side changes. We deliberately do not preemptively split.

---

## 4 · Harness engineering as core discipline

dycode integrates harness engineering at **two levels simultaneously**:
1. As **the product** — dycode renders the 5 harness subsystems as user-facing UI primitives.
2. As **the development methodology** — the dycode repo itself is built on a real harness.

### 4.1 The 5 OpenAI principles → dycode design commitments

| OpenAI principle                          | What it means in dycode                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| **Constrain** what agents can do          | Adapter capability negotiation · per-adapter concurrency caps · sandboxed workspaces · explicit tool grants |
| **Inform** them about what they should do | Workspace `AGENTS.md`/`CLAUDE.md` auto-injected into every task; progressive disclosure (ToC → docs/) |
| **Verify** their work                     | First-class `verification` command on every task; verifier adapters; externalized execution-based gates |
| **Correct** their mistakes                | Reviewer role in squads · auto-rerun on verification fail · replay-from-event-log |
| **Keep humans in the loop**               | Human approval gates on high-stakes tasks (commit to main, deploy, deleted files); Control Room IS the human-in-loop UI |

### 4.2 The 5 harness subsystems → dycode product features (Walking Labs)

| Subsystem                          | dycode realization                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| **Instructions** (Recipe Shelf)    | `AGENTS.md` + `CLAUDE.md` discovery per workspace · auto-inject ≤100-line maps into prompts · docs/ for depth |
| **Tools** (Knife Rack)             | Adapter plugin SDK — each CLI declares its capabilities; orchestrator enforces grants per task |
| **Environment** (Stove)            | Runtime detection scanner · per-workspace env probes (`.nvmrc`, lockfiles) · workspace health panel |
| **State** (Prep Station)           | Event log + task state machine in SQLite · `PROGRESS.md`-equivalent written back at end-of-session · resumes between IDE restarts |
| **Feedback** (Quality Check Window)| Verification adapters callable by orchestrator (jest, vitest, eslint, tsc, playwright) · three-layer validation |

### 4.3 Task state machine (feature_list.json-style)

Every task in dycode follows the irreversible state machine from harness engineering:

```
not_started ─► active ─► passing
                  │
                  └─► blocked
```

The **only** path from `active → passing` is the verification command exiting 0. Subjective agent
claims of "done" do not promote state — only execution evidence does. Gating is enforced at the
orchestrator layer.

```ts
type Task = {
  id: TaskId                                  // "tk_2026-05-23-a7f3"
  behavior: string                            // human-readable acceptance
  verification: string                        // executable; orchestrator gates on this
  state: "not_started" | "active" | "passing" | "blocked"
  assigneeId: AgentId | null                  // who claimed it (worker)
  reviewerId: AgentId | null                  // must be != assigneeId (checker)
  reviewVerdict: {
    score: 0|1|2|3|4|5|6|7|8|9|10            // 10 to promote
    notes: string
    reviewerId: AgentId
  } | null
  evidence: TaskEvidence[]
  scope: { paths: string[]; touchedFiles: string[] }
  ...
}
```

### 4.4 Worker/Checker separation

Every task has two role slots: **assignee** (worker) and **reviewer** (checker). They must be
different agents. The reviewer's verdict is graded 0–10 on consistency, scalability, maintainability,
and correctness. Nothing under 10 promotes the task to `passing`. Reviewer can demand revisions;
revisions kick state back to `active`.

### 4.5 Two-level adoption

**(A) Product**: dycode ships these primitives as the user-visible mental model. Tasks carry
verification commands; the orchestrator gates state on execution evidence; reviewer roles are
first-class in squads; the event log is the externalized truth.

**(B) Codebase**: dycode is built using harness engineering itself. The repo conventions in §9 are
not aspirational — they are *the contract* for any contributor (human or agent).

### 4.6 Progressive disclosure rule

Agents enter at the top-level `CLAUDE.md` / `AGENTS.md` map. They follow links to package-level maps.
They follow links to docs. They **never** read everything. *If it's not linked from the map, it
doesn't exist for the agent* — which forces the maps to stay current as the source of truth.

---

## 5 · Adapter plugin SDK

The adapter SDK is the platform piece. The IDE shell is replaceable; what makes dycode the
orchestration layer is that any CLI in the wild can become a first-class agent by writing one adapter.

### 5.1 Contract

```ts
// @dycode/adapter-sdk
export interface AdapterPlugin {
  manifest: AdapterManifest          // static metadata
  detect(): Promise<DetectionResult> // is this CLI present & usable?
  create(opts: CreateOpts): AdapterInstance
}

export interface AdapterManifest {
  id: string                         // "claude-code", "codex", "cursor-agent"
  displayName: string                // "Claude Code"
  vendor: string                     // "anthropic"
  apiVersion: 1                      // SDK contract version (semver-major)
  capabilities: Capability[]         // declared upfront, gated by orchestrator
  iconUrl?: string
  configSchema: ZodSchema            // per-user config (e.g., model, API key)
}

export type Capability =
  | "code.read" | "code.write"       // edit files in workspace
  | "shell.exec"                     // run shell commands
  | "web.fetch"                      // outbound HTTP
  | "tool.mcp"                       // speaks MCP natively
  | "stream.structured"              // emits JSON event stream (not just text)
  | "verify.run"                     // can BE a verifier (jest, eslint, tsc adapter)
  | "review.judge"                   // can BE a reviewer (worker/checker separation)
  | "plan.decompose"                 // can plan a task into subtasks
  | "longrunning"                    // expects multi-minute sessions

export interface AdapterInstance {
  start(prompt: Prompt, ctx: TaskCtx): AsyncIterable<AdapterEvent>
  cancel(reason: string): Promise<void>
  health(): Promise<HealthReport>
  dispose(): Promise<void>
}
```

The orchestrator never knows whether a given `AdapterInstance` wraps a PTY, an HTTP SDK client, an MCP
server, or a remote API. It speaks one protocol. The adapter knows the CLI's quirks.

### 5.2 Event stream

```ts
type AdapterEvent =
  | { type: "output"; chunk: string }              // raw text (terminal-style)
  | { type: "tool_call"; name: string; input: J }  // CLI requested a tool
  | { type: "tool_result"; name: string; out: J }
  | { type: "progress"; ratio?: number; note?: string }
  | { type: "verify_request"; cmd: string }        // CLI asks for verification
  | { type: "done"; status: "ok" | "error"; summary: string }
  | { type: "error"; message: string; code?: string }
```

All event payloads are Zod-validated via `@dycode/adapter-sdk/schemas`, shared with the daemon and IDE
through `@dycode/contracts` — single source of truth.

### 5.3 Three adapter flavors (same interface)

1. **PTY adapter** (default, universal). Spawns the CLI in a pseudo-TTY (`node-pty`), pipes
   `stdin/stdout`, emits `output` events as text. Heuristics parse tool calls when the CLI prints
   recognizable patterns.
2. **Structured adapter** (preferred when available). Uses the CLI's native structured mode:
   Claude Code's `claude --output-format stream-json`, Codex's JSON streaming flag, etc. Adapter
   translates the native event format into `AdapterEvent`. Higher fidelity, fewer parsing bugs.
   Declares `stream.structured` capability.
3. **MCP adapter** (future-friendly). When the CLI speaks MCP natively, dycoded acts as an MCP host,
   the adapter is thin glue. Path forward as MCP becomes ubiquitous.

### 5.4 Verifier adapters

A sub-type. Same interface, but `capabilities` includes `verify.run`. Built-ins ship at launch:

- `@dycode/adapter-jest`
- `@dycode/adapter-vitest`
- `@dycode/adapter-eslint`
- `@dycode/adapter-tsc`
- `@dycode/adapter-playwright`

When a task's `verification` command runs, the orchestrator routes it to a verifier adapter, captures
the result as an event-log entry, and gates state transitions on the exit code. Verifiers are also
visible in the Pool — power-user feature.

### 5.5 Lifecycle

```
Boot:
  for each adapter in registry:
    adapter.detect() ─► { installed: true, version: "2.1.4", path: "/usr/local/bin/claude" }
                       │
                       └─► register in Runtime Detection table

User assigns task:
  orchestrator picks adapter by capability requirements
  ─► adapter.create({ workspaceRoot, env, config })
  ─► instance.start(prompt, ctx) returns AsyncIterable
  ─► dycoded streams events into event_log table + WebSocket → IDE
  ─► on cancel/dispose, instance cleans up its PTY child cleanly

Health:
  cron probe runs instance.health() every 30s
  unhealthy adapters surface a banner in the Control Room
```

### 5.6 Sandbox & permissions (the "Constrain" principle)

For MVP, adapters are Node modules loaded **in-process** in `dycoded` (same trust model as VS Code
extensions). Mitigations:

- **Capability gating**: an adapter declaring `shell.exec` is granted it; one that doesn't can't use
  it. Orchestrator enforces.
- **Workspace scoping**: filesystem access restricted to the active workspace root.
- **Network egress allowlist**: declared in manifest, surfaced in IDE permissions UI before install.
- **Audit log**: every shell call, file write, network request lands in the event log.

Future hardening (post-MVP): out-of-process adapters in a child Node worker with `node:vm` or a real
isolate sandbox.

### 5.7 Packaging & distribution

- First-party: `@dycode/adapter-<id>`
- Community: `dycode-adapter-<id>`
- Daemon discovery walks `~/.dycode/adapters/node_modules`
- Users install with `dycode adapter add <id>` (CLI) or via Settings · Adapters
- A manifest field `dycodeAdapter: true` in `package.json` makes adapters greppable on npm
- No central registry needed for MVP — npm is the registry

### 5.8 What ships at launch

| Adapter                          | Flavor      | Capabilities                                                  |
| -------------------------------- | ----------- | ------------------------------------------------------------- |
| `@dycode/adapter-claude-code`    | structured  | code.r/w · shell · plan · longrunning · stream.structured     |
| `@dycode/adapter-codex`          | structured  | code.r/w · shell · longrunning · stream.structured            |
| `@dycode/adapter-opencode`       | pty         | code.r/w · shell · longrunning                                |
| `@dycode/adapter-jest`           | verifier    | verify.run                                                    |
| `@dycode/adapter-vitest`         | verifier    | verify.run                                                    |
| `@dycode/adapter-tsc`            | verifier    | verify.run                                                    |
| `@dycode/adapter-eslint`         | verifier    | verify.run                                                    |
| `@dycode/adapter-playwright`     | verifier    | verify.run                                                    |

Community-track at launch: published `Writing an adapter` guide + an example PR for an adapter like
`cursor-agent`, `hermes`, `openclaw`, or `gemini-cli`. **The platform is the product.**

---

## 6 · IPC protocol & domain model

Two stable contracts, both Zod-validated, both versioned semver-major.

### 6.1 IPC: WebSocket JSON-RPC 2.0

```ts
// transport: ws://127.0.0.1:<dyn-port>/ws
// auth:      bearer token from ~/.dycode/auth.json (mode 0600)
// framing:   one JSON object per WS message, JSON-RPC 2.0

type Request<M extends MethodName> = {
  jsonrpc: "2.0"
  id: string                 // ulid; correlates with response
  method: M
  params: MethodParams[M]
  protocolVersion: 1
}

type Response<M extends MethodName> =
  | { jsonrpc: "2.0"; id: string; result: MethodResult[M] }
  | { jsonrpc: "2.0"; id: string; error: { code: number; message: string; data?: J } }

type Notification =
  | { jsonrpc: "2.0"; method: "event.appended"; params: EventLogEntry }
  | { jsonrpc: "2.0"; method: "task.stateChanged"; params: { taskId: string; from: TaskState; to: TaskState } }
  | { jsonrpc: "2.0"; method: "agent.statusChanged"; params: { agentId: string; status: AgentStatus } }
  | { jsonrpc: "2.0"; method: "squad.changed"; params: { squadId: string } }
  | { jsonrpc: "2.0"; method: "runtime.detected"; params: { newAdapters: AdapterId[] } }
```

### 6.2 Method surface (initial)

```ts
type MethodName =
  // Workspaces
  | "workspace.list" | "workspace.add" | "workspace.activate" | "workspace.remove"
  // Runtime detection + adapters
  | "runtime.scan" | "adapter.list" | "adapter.install" | "adapter.uninstall" | "adapter.configure"
  // Fleet primitives
  | "squad.create" | "squad.delete" | "squad.rename"
  | "squad.addMember" | "squad.removeMember" | "squad.setLeader"
  | "pool.list" | "pool.promote" | "pool.release"
  // Tasks
  | "task.create" | "task.cancel" | "task.list" | "task.get"
  | "task.assign" | "task.requestReview" | "task.submitReviewVerdict"
  | "task.run" | "task.replay"
  // Event subscriptions
  | "events.subscribe" | "events.unsubscribe" | "events.query"
```

Subscriptions register the client to receive notifications matching a filter
(`{ workspaceId?, taskId?, squadId? }`). Unsubscribe by handle.

### 6.3 Domain model

```ts
type WorkspaceId = `ws_${string}`
type AgentId     = `ag_${string}`
type SquadId     = `sq_${string}`
type TaskId      = `tk_${string}`

type Workspace = {
  id: WorkspaceId
  name: string
  rootPath: string
  settings: { defaultBranch?: string; instructionsPath?: string }
  createdAt: number
  lastActiveAt: number
}

type Agent = {
  id: AgentId
  workspaceId: WorkspaceId           // agents are workspace-scoped
  adapterId: string
  adapterVersion: string
  displayName: string                // user-overridable nickname
  capabilities: Capability[]
  config: J                          // validated by adapter.configSchema
  status: AgentStatus
  currentTaskId: TaskId | null
}

type AgentStatus =
  | "idle" | "busy" | "queued" | "blocked"
  | "unhealthy" | "uninstalled" | "auth_required"

type Squad = {
  id: SquadId
  workspaceId: WorkspaceId
  name: string                       // "backend", "frontend", "infra"
  leaderAgentId: AgentId | null
  memberAgentIds: AgentId[]          // includes leader
  createdAt: number
}
// Pool is *derived*: workspace.agents - all squad members. Not a table.

type Task = {
  id: TaskId
  workspaceId: WorkspaceId
  squadId: SquadId | null            // null = pool task (ad-hoc)
  assigneeId: AgentId | null
  reviewerId: AgentId | null         // must be != assigneeId
  parentTaskId: TaskId | null        // for decomposed subtasks
  title: string
  behavior: string                   // acceptance criteria, human-readable
  verification: string               // executable cmd; orchestrator gates on this
  state: "not_started" | "active" | "passing" | "blocked"
  reviewVerdict: { score: number; notes: string; reviewerId: AgentId } | null
  scope: { paths: string[]; touchedFiles: string[] }
  evidence: TaskEvidence[]
  createdAt: number
  startedAt: number | null
  completedAt: number | null
}

type TaskEvidence =
  | { kind: "commit"; sha: string; message: string; ts: number }
  | { kind: "verify_run"; cmd: string; exitCode: number; logRef: string; ts: number }
  | { kind: "review"; reviewerId: AgentId; score: number; notes: string; ts: number }
  | { kind: "handoff"; fromAgentId: AgentId; toAgentId: AgentId; ts: number }

type EventLogEntry = {
  id: string                         // ulid (sortable by time)
  ts: number
  workspaceId: WorkspaceId
  taskId: TaskId | null
  agentId: AgentId | null
  type: AdapterEvent["type"]
  payload: J
}
```

### 6.4 SQLite schema (sketch — full tables in `dycoded/persistence/schema/`)

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  root_path TEXT NOT NULL,
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  adapter_id TEXT NOT NULL,
  adapter_version TEXT NOT NULL,
  display_name TEXT NOT NULL,
  capabilities_json TEXT NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
  current_task_id TEXT REFERENCES tasks(id)
);
CREATE INDEX idx_agents_workspace ON agents(workspace_id);

CREATE TABLE squads (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  leader_agent_id TEXT REFERENCES agents(id),
  created_at INTEGER NOT NULL,
  UNIQUE (workspace_id, name)
);

CREATE TABLE squad_members (
  squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  PRIMARY KEY (squad_id, agent_id)
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  squad_id TEXT REFERENCES squads(id) ON DELETE SET NULL,
  assignee_id TEXT REFERENCES agents(id),
  reviewer_id TEXT REFERENCES agents(id),
  parent_task_id TEXT REFERENCES tasks(id),
  title TEXT NOT NULL,
  behavior TEXT NOT NULL,
  verification TEXT NOT NULL,
  state TEXT NOT NULL,
  review_verdict_json TEXT,
  scope_json TEXT NOT NULL DEFAULT '{}',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  CHECK (assignee_id IS NULL OR reviewer_id IS NULL OR assignee_id <> reviewer_id)
);
CREATE INDEX idx_tasks_workspace_state ON tasks(workspace_id, state);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);

CREATE TABLE event_log (
  id TEXT PRIMARY KEY,                 -- ulid
  ts INTEGER NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id),
  agent_id TEXT REFERENCES agents(id),
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL
) WITHOUT ROWID;
CREATE INDEX idx_event_ws_ts ON event_log(workspace_id, ts);
CREATE INDEX idx_event_task ON event_log(task_id);
```

### 6.5 Type-sharing strategy

A monorepo workspace package `@dycode/contracts` exports:

- Zod schemas for every method, event, and entity
- Inferred TypeScript types
- JSON-RPC error code enum

Both `dycoded` and `dycode-app` import from it. Adapters import a subset (`AdapterEvent`, `Capability`,
`TaskCtx`). One source of truth, no drift.

### 6.6 Versioning & evolution

- `protocolVersion: 1` on every request. Daemon rejects mismatched majors with a structured error
  and a recommended upgrade path. Renderer prompts to update on mismatch.
- New methods / new event types are minor-version bumps (safe to add).
- Schema migrations live in `dycoded/persistence/schema/`, one TS file per migration, forward-only,
  ordered, executed at boot. Each migration has a verification step (count, integrity checks) —
  itself a harness primitive.

### 6.7 Replay capability

Because every state transition is mediated by the event log, any task's history can be reconstructed
exactly. The "Activity" tab subscribes to the log; the "Replay" feature loads historical events and
re-renders. Useful for post-mortems, training adapters, and reproductions in bug reports.

---

## 7 · Electron shell & shadcn component map

Aesthetic is locked: terminal-brutalist dark theme, oklch palette, IBM Plex Mono + Sans, acid-lime
accent. Light theme supported (system preference + manual toggle).

### 7.1 Window layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ▸ DYCODE  │  [workspace ▾]  ●●●●○ 5 runtimes  │  ⌘K   ●5 active   ⚙   │  TopBar
├────────────┬────────────────────────────────────────────────────────────┤
│            │  [Fleet] · Tasks · Activity · Skills · Settings            │  Tabs
│  Sidebar   ├────────────────────────────────────────────────────────────┤
│            │                                                            │
│  WORKSPACE │   ─── SQUAD · backend (3) ──────── ★ leader: claude-code   │
│   ▾ dycode │   ● claude-code   /api/users POST   ▓▓▓▓▓░░ 62%   2m41s   │
│     ▸ Back │   ● codex         handler tests     ▓▓▓░░░░ 38%   1m12s   │
│     ▸ Front│   ○ hermes        queued                                  │
│     ▸ Pool │                                                            │
│   ▸ work-2 │   ─── SQUAD · frontend (2) ───── ★ leader: opencode       │
│            │   ● opencode      UserCard.tsx     ▓▓▓▓▓▓░ 71%   3m05s    │
│  AGENTS    │   ● openclaw      review · 9/10 · revise                  │
│  + Install │                                                            │
│            │   ─── POOL · available (3) ────                            │
│  ACTIVITY  │   ○ gemini    ○ kimi    ○ cursor-agent                    │
│  (12 new)  │                                                            │
│            │   [+ New task]   [+ New squad]                             │
├────────────┴────────────────────────────────────────────────────────────┤
│ 📁 Editor (Monaco) · ⌃E   |   💻 Terminal (xterm) · ⌃`  |  📊 Log · ⌃L  │  Bottom drawer
└─────────────────────────────────────────────────────────────────────────┘
```

Bottom drawer is collapsed by default in Control Room mode. Splits within the drawer
(editor / terminal / log) are themselves `ResizablePanelGroup` instances.

### 7.2 shadcn component map

| Region                       | Primary components                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Top bar                      | `Button`, `DropdownMenu` (workspace switcher), `Tooltip`, `Badge`, `Avatar`, `CommandDialog` (⌘K)              |
| Sidebar                      | shadcn `Sidebar` (v0.9+), `Collapsible`, `ContextMenu`, `Badge`                                               |
| Tab strip                    | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`                                                              |
| Fleet view                   | `Card`, `Avatar`, `Progress`, `Badge`, `HoverCard`, `ContextMenu`, `Separator`                                |
| Squad header                 | `Badge`, `DropdownMenu`, `Tooltip`                                                                            |
| Pool                         | `Badge`, `HoverCard`, drag handle via `@dnd-kit/core`                                                         |
| New task / Edit agent        | `Sheet` (right-side), `Form` (RHF + Zod), `Input`, `Textarea`, `Select`, `Combobox`, `Switch`                 |
| Task review                  | `Dialog`, `RadioGroup` or `Slider` (0–10 score), `Textarea`, `Button`                                         |
| Settings                     | `Tabs` (Workspace · Adapters · Appearance · Keyboard · About), `Form`, `Switch`, `Select`, `Input`            |
| Bottom drawer                | `ResizablePanelGroup`, `ResizablePanel`, `Collapsible`, `Tabs` (per-pane)                                     |
| Toasts                       | `Sonner`                                                                                                      |
| Confirmations                | `AlertDialog`                                                                                                 |
| Activity tab                 | `Table` (or `DataTable`) + TanStack Virtual                                                                   |
| Empty states                 | `Card` + `Skeleton` while loading                                                                             |
| Permission prompts           | `Dialog` listing declared capabilities from adapter manifest                                                  |

### 7.3 Command palette (⌘K)

Global, opens anywhere. Sections: Tasks · Squads · Agents · Workspaces · Run (verifiers, replay) · Help.
Fuzzy match across all sections. Recent items pinned. Keyboard-first.

### 7.4 State management

| Concern                                                                          | Tool                                                                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Client-only UI state (active workspace, selected agent, pane sizes, theme)       | **Zustand** with `persist` middleware                                                                               |
| Server state mirrored from `dycoded` (squads, agents, tasks, events)             | **TanStack Query** with a custom WebSocket adapter; subscriptions seed the cache; notifications push partial updates |
| Forms                                                                            | **React Hook Form** + **Zod** resolvers, schemas imported from `@dycode/contracts`                                  |
| Live event stream (Activity tab)                                                 | TanStack Query subscription with list cache that appends from `event.appended` notifications                        |
| Theming                                                                          | CSS variables overriding shadcn defaults; `next-themes` for light/dark/system toggle                                |

### 7.5 Theming tokens

```css
:root[data-theme="dark"] {
  --background:           oklch(0.143 0.005 255);
  --foreground:           oklch(0.965 0.003 250);
  --primary:              oklch(0.86 0.19 112);   /* acid lime — accent */
  --secondary:            oklch(0.205 0.006 255);
  --muted:                oklch(0.205 0.006 255);
  --muted-foreground:     oklch(0.66 0.006 255);
  --accent:               oklch(0.21 0.05 112);   /* dim accent surface */
  --accent-foreground:    oklch(0.86 0.19 112);
  --destructive:          oklch(0.7 0.18 25);
  --border:               oklch(0.27 0.006 255);
  --input:                oklch(0.27 0.006 255);
  --ring:                 oklch(0.86 0.19 112);
  --radius:               0.3rem;                  /* sharper than shadcn default 0.5rem */
}
:root[data-theme="light"] { /* lighter palette, same hue logic */ }
```

We extend the shadcn theme — not fork it — so components remain update-able.

### 7.6 Accessibility & keyboard model

- All shadcn primitives are Radix-based → full keyboard + screen-reader support out of the box.
- App-level shortcuts (declared in one registry, surfaced in Settings · Keyboard):
  - `⌘K` Command palette
  - `⌘N` New task
  - `⌘⇧N` New squad
  - `⌃E` Toggle editor drawer
  - `` ⌃` `` Toggle terminal drawer
  - `⌃L` Toggle log drawer
  - `⌃1..5` Switch top-level tabs
  - `[` / `]` Cycle workspaces
- Status changes (task moves to `passing`) announced via `aria-live="polite"`.

### 7.7 Native window chrome

- macOS: hidden title bar + custom drag region in top bar; traffic lights inset to top-bar baseline.
- Windows / Linux: standard window controls in top bar.
- Single-instance lock (`app.requestSingleInstanceLock`): second launch focuses existing window and
  passes args.

### 7.8 Builder

- **Vite** for the renderer.
- **electron-builder** for packaging; ships universal macOS (arm64 + x64), Win NSIS, Linux AppImage + deb.
- `dycoded` ships as a **sidecar binary** in the app bundle. Electron spawns it from
  `process.resourcesPath`. Users see "one app". Power users can run `dycoded` standalone for headless mode.
- Dev: `tsx watch` for the daemon; Vite for the renderer; both watched by a top-level `pnpm dev`.

---

## 8 · Repo structure

```
dycode/
├── CLAUDE.md                       # ≤100 lines · root TOC into docs/
├── AGENTS.md                       # ≤100 lines · agent-flavored mirror
├── feature_list.json               # machine-readable scope + verification
├── PROGRESS.md                     # per-branch session log
├── README.md
├── LICENSE                         # Apache 2.0
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
│
├── apps/
│   ├── dycode/                     # Electron app (renderer + main)
│   │   ├── electron/
│   │   │   ├── main.ts             # window mgmt, daemon sidecar spawn
│   │   │   ├── preload.ts
│   │   │   └── sidecar.ts
│   │   ├── src/                    # renderer (Vite + React + shadcn)
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── fleet/
│   │   │   │   ├── tasks/
│   │   │   │   ├── activity/
│   │   │   │   ├── settings/
│   │   │   │   └── workspace/
│   │   │   ├── ipc/                # WS JSON-RPC client adapter
│   │   │   ├── stores/             # Zustand
│   │   │   ├── lib/
│   │   │   └── routes/
│   │   ├── CLAUDE.md
│   │   ├── AGENTS.md
│   │   └── package.json
│   └── docs-site/                  # public docs (Astro or VitePress)
│
├── daemons/
│   └── dycoded/                    # the daemon (§3)
│
├── packages/
│   ├── @dycode/contracts/          # Zod schemas + types (shared IPC + adapter)
│   ├── @dycode/adapter-sdk/        # plugin contract (public API)
│   ├── @dycode/ui/                 # shadcn + custom components (shared)
│   └── @dycode/ipc-client/         # typed WS JSON-RPC client
│
├── adapters/                       # built-in adapters (Apache 2.0)
│   ├── claude-code/
│   ├── codex/
│   ├── opencode/
│   ├── jest/                       # verifier
│   ├── vitest/                     # verifier
│   ├── tsc/                        # verifier
│   ├── eslint/                     # verifier
│   └── playwright/                 # verifier
│
├── docs/
│   ├── architecture/
│   ├── adapters/
│   ├── ipc-protocol/
│   ├── governance/
│   └── tutorials/
│
├── scripts/
│   ├── init.sh                     # env probe · install · migrate · health
│   ├── verify.sh                   # typecheck → lint → unit → e2e (hard-fail)
│   └── new-adapter.ts              # scaffolds a new adapter package
│
└── .github/
    └── workflows/
        ├── ci.yml
        ├── release.yml             # electron-builder · sign · notarize
        └── publish-adapters.yml
```

---

## 9 · Governance & quality bar

> *This section is the contract for every contributor — human or agent. It is enforced by CI for
> gates 1–4 and by review protocol for gate 5.*

### 9.1 Self-documenting code (mandatory)

- **Every package** ships its own `CLAUDE.md` and `AGENTS.md` at its root.
- Each is **≤100 lines** and serves as a **table of contents** pointing into `docs/`.
- Contents per map: stack summary, first commands, "where to look" links, hard constraints.
- **Detailed documentation lives in `docs/`** — never inline a long reference inside a map.
- **Every PR that changes structure updates the relevant maps in the same PR**. No "I'll fix the doc
  later." CI will check that map links resolve.
- The root `CLAUDE.md` is the entry point. Agents follow links from there.

### 9.2 Thorough thinking before code

- No half-broken features. If you can't define a verification command for a feature, it isn't a
  feature yet — it's a question.
- Decompose before implementing. Long tasks are decomposed into subtasks each with their own
  verification.
- Spec-then-code: design decisions land in `docs/architecture/` or `docs/adapters/` before
  implementation begins on any non-trivial change.

### 9.3 The 5 quality gates (the only path to "done")

```
typecheck ─► lint ─► unit ─► e2e ─► reviewer 10/10 ─► passing
   exit 0     exit 0   exit 0    exit 0    (verdict)
```

Gates 1–4 are automated. CI enforces them. `scripts/verify.sh` runs the same gates locally — *the
same commands work for the human and the agent.*

| Gate | Command                          | What it proves                                                              |
| ---- | -------------------------------- | --------------------------------------------------------------------------- |
| 1    | `pnpm typecheck`                 | TypeScript compiles across all packages with no errors                      |
| 2    | `pnpm lint`                      | ESLint + Prettier pass; no warnings allowed in CI                           |
| 3    | `pnpm test`                      | Unit + integration suite pass (Vitest)                                      |
| 4    | `pnpm test:e2e`                  | End-to-end suite pass (Playwright) for any task with E2E scope              |
| 5    | Reviewer verdict                 | A reviewer (human or `review.judge`-capable agent) gives **10/10**          |

**Plan 01 implementation note:** Until the E2E suite lands (Plan 05+), gate 4 (`pnpm test:e2e`) is collapsed into gate 3 (`pnpm test`), and Prettier `pnpm format` is surfaced as a separate gate for failure clarity. The 5-gate count is preserved; the order is `typecheck → lint → format → test → reviewer 10/10`.

### 9.4 Reviewer protocol

- The reviewer is **a different agent (or human) than the assignee**. The orchestrator enforces
  this constraint at the task layer; CI enforces it at the PR layer.
- Verdict scored 0–10 on **consistency · scalability · maintainability · correctness**.
- Anything **below 10 blocks promotion to `passing`** and forces revisions.
- The reviewer's notes are persisted as task `TaskEvidence` of kind `review`.
- For PRs against this repo, the human-equivalent is "no merge without an approving review that
  attests to all four dimensions in writing." Stale review = stale verdict; force re-review on push.

### 9.5 Maintaining context files

- When you add a new module: link it from the nearest map.
- When you rename or move a module: update every map that references it.
- When you delete a module: remove the link and any orphaned docs in `docs/`.
- When you add a new doc in `docs/`: link to it from at least one map.
- Stale links fail CI.

### 9.6 PROGRESS.md per branch

- Each non-trivial feature branch maintains a `PROGRESS.md` at the repo root (gitignored by default,
  but committed if you want session-level audit trail).
- Entries are date-stamped, name what was done, name what remains, list blockers.
- **At end of session**, the file must leave a clean state — anything in-progress is converted to
  either a follow-up task in `feature_list.json` or a TODO with an owner.

### 9.7 feature_list.json

Root-level, machine-readable. Schema:

```jsonc
[
  {
    "id": "F01",
    "behavior": "Electron app launches with sidecar dycoded",
    "verification": "pnpm test:e2e -- boot.spec",
    "state": "passing",                 // not_started | active | passing | blocked
    "evidence": "commit a7f3 · run #142",
    "blocked_by": null                  // or feature id string
  },
  …
]
```

Touching scope = touching this file in the same PR.

### 9.8 Contribution mechanics

- Branches: `feat/<short-id>-<slug>`, `fix/<short-id>-<slug>`, `chore/<slug>`.
- Commits: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- One feature per branch. Don't bundle unrelated changes.
- New adapters live in `adapters/<adapter-id>/` (built-in) or a separate repo (community).
- Plugin author guide: `docs/tutorials/adapter-quickstart.md`.

### 9.9 What "done" means

A task is **done** only when **all five gates have been passed and the event log contains the
matching `verify_run`-exit-0 evidence plus a `review`-score-10 evidence**. Agent self-assertions of
completion are ignored by the orchestrator — only execution evidence promotes state.

This rule applies to the product (runtime behavior) **and** the codebase (PRs against this repo).

---

## 10 · Open questions (resolve before / during implementation)

1. **Adapter sandbox post-MVP** — when do we move to out-of-process adapters? Trigger criteria
   (incident? user count?) need a written rule.
2. **MCP-native CLIs** — should MCP support be a separate v1.1 milestone, or do we ship a thin MCP
   host inside `dycoded` from day one for forward-compat?
3. **Telemetry** — opt-in vs opt-out, what fields, where shipped. Default off until v0.2.
4. **Auth for headless mode** — local-only bearer token works for desktop; what's the remote
   scenario (web companion) story? Likely OAuth2 device flow against a future cloud, but explicitly
   out of scope for v1.
5. **Multi-machine deployments** — power-user wants `dycoded` on a workstation and IDE on a laptop.
   Network discovery + auth model needs design before we promise it.
6. **Editor pane fidelity** — Monaco-only, or do we eventually embed Code-OSS? Monaco-only for v1.
7. **Plugin registry UI** — Settings · Adapters reads from npm via shell. Browseable marketplace UI
   deferred to v0.3.
8. **Conflict resolution for parallel agents touching the same file** — soft locks via
   `task.scope.paths` is the v1 strategy; deeper conflict UI is later.
9. **Replay store size budget** — event log can grow unbounded; need rotation/compaction policy.
10. **`6th subsystem` for human-in-the-loop approvals** — the OpenAI list calls it out separately
    from Walking Labs' five. We track it as part of "constrain" + reviewer protocol for now;
    revisit if it deserves its own surface.

---

## 11 · Non-goals (v1)

- Full IDE fidelity (no extensions marketplace beyond adapters, no debugger UI, no source-control UI
  beyond what Monaco shows).
- Hosted / SaaS version of dycode — v1 is local-first only.
- Cross-workspace task sharing.
- Built-in cloud agent (we orchestrate local CLIs; cloud agents arrive via MCP later).
- A central adapter marketplace site (npm is the registry).
- Mobile / web companion clients (the architecture *supports* them; the surface for v1 is the
  Electron app only).
- Translation / localization (English-only for v1).

---

## 12 · Implementation order (informs the plan)

The `writing-plans` skill will sequence these into milestones. Rough phases:

1. **Foundation** — pnpm workspace, Turborepo, tsconfig base, CI scaffolding, LICENSE,
   `CLAUDE.md`/`AGENTS.md` roots.
2. **`@dycode/contracts`** — Zod schemas + types for IPC + adapter SDK + domain model.
3. **`@dycode/adapter-sdk`** — public package, types + helpers for adapter authors.
4. **`dycoded` skeleton** — boot, lifecycle, SQLite, migration runner, Hono WS server, auth.
5. **Adapter host & registry** — load built-ins, capability negotiation, lifecycle.
6. **First adapter: `@dycode/adapter-claude-code`** (structured flavor) — proves the contract.
7. **Verifier adapter: `@dycode/adapter-vitest`** — proves verifier sub-type + state-machine gating.
8. **Orchestrator core** — domain state machine, router, handoff log, replay reconstruction.
9. **Electron shell skeleton** — Vite + React + shadcn + Sidebar + Tabs + Resizable drawers; dev
   sidecar spawn.
10. **Fleet view + IPC client** — TanStack Query over WS; render squads/pool/agents/tasks.
11. **Second + third adapters** — `codex`, `opencode`.
12. **Remaining verifiers** — jest, tsc, eslint, playwright.
13. **Task lifecycle UI** — create / assign / review with worker-checker enforcement.
14. **Activity tab & replay** — event log surface.
15. **Settings + adapters tab** — install / configure / uninstall.
16. **Packaging** — electron-builder for macOS / Win / Linux; sidecar binary bundling; signing.
17. **Docs site + adapter quickstart** — public surface.
18. **Public beta** — call for community adapters.

---

## 13 · References

- [OpenAI · Harness Engineering: leveraging Codex in an agent-first world (Ryan Lopopolo, 2026-02-11)](https://openai.com/index/harness-engineering/)
- [Walking Labs · learn-harness-engineering (GitHub)](https://github.com/walkinglabs/learn-harness-engineering)
- [Walking Labs · Lecture 02 — What a harness actually is](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-02-what-a-harness-actually-is/)
- [Walking Labs · Lecture 08 — Why feature lists are harness primitives](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-08-why-feature-lists-are-harness-primitives/)
- [Walking Labs · Lecture 09 — Why agents declare victory too early](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-09-why-agents-declare-victory-too-early/)
- [multica.ai · Open-source managed agents platform (Go reference architecture)](https://github.com/multica-ai/multica)
- [shadcn/ui](https://ui.shadcn.com/) · [Tailwind CSS](https://tailwindcss.com/) · [Radix UI](https://www.radix-ui.com/)
- [TanStack Query](https://tanstack.com/query) · [Zustand](https://zustand-demo.pmnd.rs/) · [React Hook Form](https://react-hook-form.com/) · [Zod](https://zod.dev/)
- [Hono](https://hono.dev/) · [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) · [node-pty](https://github.com/microsoft/node-pty)
- [Electron](https://electronjs.org/) · [Vite](https://vitejs.dev/) · [electron-builder](https://www.electron.build/) · [Monaco](https://microsoft.github.io/monaco-editor/) · [xterm.js](https://xtermjs.org/)
