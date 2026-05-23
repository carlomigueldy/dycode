# dycode · Plan 09 — Fleet view (Squads + Pool + Agents)

**Status:** Not started · **Depends on:** Plan 07 (orchestrator) + Plan 08 (Electron shell) · **Tag at close:** `v0.0.9-plan-09`

**Goal:** Render the fleet — the Control Room's primary view per spec §7. Subscribe to `squad.changed` + `agent.statusChanged` notifications, query `squad.*` / `pool.list` / `task.list` via TanStack Query, and surface squads (with leader badges), the free pool, agents (with status pills), and the active workspace's outstanding tasks.

**Architecture:** New feature module `apps/dycode/src/features/fleet/`. TanStack Query keyed by `[workspaceId, ...]` with cache invalidation driven by IPC notifications (a thin adapter listens to `subscriptions.onNotification` and calls `queryClient.invalidateQueries`). Real-time updates without polling. Components: `<SquadCard>`, `<AgentChip>`, `<PoolList>`, `<FleetHeader>` — all shadcn-derived, oklch-themed.

---

## Dependencies

- Plan 03 — IPC client (`@dycode/ipc-client`) for typed `request` / `subscribe`
- Plan 07 — orchestrator with squad/pool/handoff handlers wired
- Plan 08 — Electron shell skeleton with TanStack Query + Zustand stores

## File structure (high-level)

```
apps/dycode/src/features/fleet/
├── FleetView.tsx               # main layout
├── SquadCard.tsx
├── AgentChip.tsx
├── PoolList.tsx
├── FleetHeader.tsx
├── hooks/
│   ├── useFleet.ts             # TanStack Query orchestration
│   ├── useFleetSubscription.ts # IPC notification → invalidate
│   └── useStatusColor.ts       # AgentStatus → oklch token
└── __tests__/

apps/dycode/src/lib/
└── ipc-react.tsx               # context provider for DycodeClient + queryClient
```

## Task list (titles only)

01. Branch + worktree
02. `ipc-react.tsx` — React context providing the live `DycodeClient` + `QueryClient`
03. `useFleet` hook — parallel queries for squads, pool, agents
04. `useFleetSubscription` — wires `squad.changed` + `agent.statusChanged` → invalidate
05. `<SquadCard>` — leader chip + members + count + new-task action
06. `<AgentChip>` — adapter icon + nickname + status pill (oklch token per status)
07. `<PoolList>` — unassigned agents, sortable by status / last-active
08. `<FleetHeader>` — workspace name + active task count + active agents count
09. `<FleetView>` — composes them into the main pane
10. Empty states — no workspaces, no agents, no tasks
11. Action affordances — "Add agent" / "New squad" / "New task" buttons (open modals to be implemented in Plan 12)
12. Loading + error states — toast surface via shadcn `<Toast>`
13. Playwright test — fleet view renders with seeded fixtures
14. Docs: `docs/architecture/fleet-view.md`
15. Close-out: feature_list F53–F58, PROGRESS, tag

## What "done" looks like

- Launching the app shows squads + pool + agents + task counts
- A change made via CLI (e.g., `dycoded squad rename` in Plan 07) reflects within ~1s in the UI without manual refresh
- F53–F58 in `feature_list.json`, all `passing`
- `v0.0.9-plan-09` tag exists

## Deferred to later plans

- Task lifecycle UI (create, assign, review) — Plan 12
- Activity tab + Replay — Plan 13
- Settings + Adapters tab — Plan 14
- Drag-and-drop assignment from pool → squad — out of scope until v1.1

## Open questions

- Stale-while-revalidate window for fleet queries (default vs custom) — confirm with TanStack Query defaults
- Should AgentChip's status pill animate on transition? (Lean: subtle fade — no looping motion to keep brutalist aesthetic.)
