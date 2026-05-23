# dycode · Plan 07 — Orchestrator core (router, handoff, replay)

**Status:** Not started · **Depends on:** Plan 06 · **Tag at close:** `v0.0.7-plan-07`

**Goal:** Complete the orchestrator core that Plan 05 stubbed: router rules (task → squad/pool), serialized cross-agent handoffs, scheduler with per-adapter concurrency caps + backpressure, and full replay reconstruction from the event log.

**Architecture:** Three new modules in `src/orchestrator/` — `router.ts` (matches tasks to agents/squads by capability + label + load), `handoff.ts` (serialized log of cross-agent transitions; surfaced via `task.handoff` notifications), `scheduler.ts` (queue + cap-aware admission control). Replay becomes deterministic: given an event log, the orchestrator can reconstruct any task's state and evidence trail without touching live process state.

---

## Dependencies

- Plan 05 — task runtime, state machine, TaskRepository
- Plan 06 — verifier-driven gating (state machine refuses promotion without passing run)

## File structure (high-level)

```
daemons/dycoded/
└── src/
    └── orchestrator/
        ├── router.ts           # routing rules (capability + label + load)
        ├── handoff.ts          # serialized cross-agent handoff log
        ├── scheduler.ts        # queue + per-adapter concurrency caps
        └── replay.ts           # reconstruct state from event_log
```

## Task list (titles only)

01. Branch + worktree
02. `RoutingRule` schema in `@dycode/contracts` (capability list + agent label glob + max-load)
03. Router module — input: task; output: candidate agentId list, ranked
04. Handoff log — appended on assignee change, emits `task.stateChanged` + adapter event
05. Scheduler — admission control: respect manifest's per-adapter concurrency cap
06. Backpressure — queued tasks emit `task.stateChanged: blocked → queued` on cap
07. `pool.list` + `pool.promote` + `pool.release` handlers
08. `squad.create` / `squad.delete` / `squad.rename` / `squad.{add,remove,setLeader}` handlers
09. `task.replay` — full implementation: replay events → rebuild task + evidence + scope
10. Replay determinism test — same event log → identical reconstructed state
11. End-to-end test: 3-agent squad, hand off task A→B→C, replay reconstructs the chain
12. Daemon-restart resilience — Plan 03's `daemon-restart` blocked tasks become resumable
13. Docs: `docs/architecture/orchestrator.md` (expand) + handoff diagram
14. Close-out: feature_list F37–F44, PROGRESS, tag

## What "done" looks like

- `task.replay` returns a fully reconstructed task that matches what would be in SQLite — proven by determinism test
- Squad CRUD + pool ops are reflected through `squad.changed` notifications
- Daemon restart no longer permanently blocks in-flight tasks
- F37–F44 in `feature_list.json`, all `passing`
- `v0.0.7-plan-07` tag exists

## Deferred to later plans

- Renderer-side replay UI — Plan 13
- Cross-workspace task routing — out of scope for v1
- Predictive routing (ML-driven assignment) — out of scope

## Open questions

- Cap semantics on adapter reload — drain or kill? (Lean: drain with grace period.)
- Should reviewer assignment be auto-suggested by router, or manual-only? (Lean: manual in v1; suggestion in v2.)
