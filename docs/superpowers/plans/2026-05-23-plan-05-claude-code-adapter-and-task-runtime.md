# dycode · Plan 05 — `claude-code` adapter + task runtime

**Status:** Not started · **Depends on:** Plan 04 · **Tag at close:** `v0.0.5-plan-05`

**Goal:** Ship the first concrete adapter (`@dycode/adapter-claude-code`) and the daemon-side task runtime that drives it end-to-end: `task.create → task.assign → task.run → events stream → task.requestReview → task.submitReviewVerdict → passing`.

**Architecture:** New `adapters/claude-code/` package implementing `AdapterPlugin` (structured flavor — emits JSON event stream). New `src/orchestrator/` subtree in `dycoded` — minimal slice: task state machine, single-queue serialized writer, assign/run/review handlers. Migrations 004/005/006 add `agents`, `squads`, `squad_members`, `tasks` tables (spec §6.4 schema). The verification command is *captured* in the task row but not yet *gated* on (gating arrives with the verifier adapter in Plan 06).

---

## Dependencies

- Plan 02 — `@dycode/contracts` task/squad/agent schemas + IPC method schemas
- Plan 04 — adapter host, lifecycle, capability gate, IPC bridge

## File structure (high-level)

```
adapters/
└── claude-code/                # NEW package @dycode/adapter-claude-code
    ├── package.json
    ├── src/
    │   ├── index.ts            # createAdapter(...) export
    │   ├── manifest.ts         # AdapterManifest (id, capabilities, configSchema)
    │   ├── detect.ts           # which-style PATH probe + version parse
    │   ├── spawn.ts            # spawn `claude` CLI as child process
    │   └── stream.ts           # parse structured JSON event stream
    └── tests/

daemons/dycoded/
└── src/
    ├── orchestrator/
    │   ├── state.ts            # Task state machine (not_started/active/passing/blocked)
    │   ├── queue.ts            # single-threaded write queue
    │   ├── handoff.ts          # serialized cross-agent transitions
    │   └── router.ts           # task → squad/pool routing rules
    └── persistence/migrations/
        ├── 003-adapters.ts     # (from Plan 04)
        ├── 004-agents.ts
        ├── 005-squads.ts
        └── 006-tasks.ts
```

## Task list (titles only)

01. Scaffold `adapters/claude-code` package + worktree + branch
02. Migration 004 — `agents` table (with `idx_agents_workspace`)
03. Migration 005 — `squads` + `squad_members` tables
04. Migration 006 — `tasks` table (with `idx_tasks_workspace_state` + assignee/reviewer CHECK)
05. `AgentRepository` + `SquadRepository` + `TaskRepository`
06. Task state machine module — pure functions: `canTransition(from, to, ctx)`
07. Single-queue serialized write loop — every state mutation goes through it
08. `task.create` handler — minimum scope (workspace + behavior + verification)
09. `task.list` + `task.get` handlers
10. `task.assign` handler — sets assignee, refuses if reviewer == assignee
11. `task.run` handler — calls adapter instance, streams events into EventBus
12. `task.requestReview` + `task.submitReviewVerdict` handlers
13. `task.replay` handler — reconstructs state by replaying event_log
14. `claude-code` manifest + capability set
15. `claude-code` detect — `which claude` + version probe
16. `claude-code` spawn — child process + stdio piping
17. `claude-code` structured event stream parser
18. End-to-end test: real `claude` CLI on a sample workspace (skipped when CLI absent)
19. Smoke fixture: deterministic mock claude binary in tests/fixtures/
20. Docs: `docs/architecture/orchestrator.md` + `docs/adapters/claude-code.md` + maps
21. Close-out: feature_list F21–F30, PROGRESS, tag

## What "done" looks like

- A workspace with a `claude` adapter installed can run `task.create → assign → run`; events flow; review verdict ≥10 promotes the task to `passing`
- All 30 IPC methods from spec §6.2 have either a real handler (Plan 03/04/05) or a stub that returns `METHOD_NOT_FOUND` (Plan 06+)
- F21–F30 in `feature_list.json`, all `passing`
- `v0.0.5-plan-05` tag exists

## Deferred to later plans

- Verifier sub-type — Plan 06 (vitest adapter + state-machine gating on verification exit code)
- `codex`, `opencode` adapters — Plan 10
- Full orchestrator features (router rules, scheduler with backpressure caps beyond per-adapter) — Plan 07
- Renderer UI for tasks — Plans 12–14

## Open questions

- Real `claude` CLI's structured-output flag/contract — confirm before adapter authoring
- Should `task.run` block on the JSON-RPC response, or return immediately with a `runId`? (Lean: return immediately; client subscribes to events.)
