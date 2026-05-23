# dycode · Plan 13 — Activity tab + Replay UI

**Status:** Not started · **Depends on:** Plan 07 (orchestrator + `task.replay`) + Plan 12 (Tasks UI) · **Tag at close:** `v0.0.13-plan-13`

**Goal:** Surface the event log — the "externalized truth" of spec §6.7 — as a live Activity tab plus a per-task Replay scrubber. Users can see every adapter event, every hand-off, every verify run as a stream of timestamped rows, and can step backward/forward through a specific task's history.

**Architecture:** New feature module `apps/dycode/src/features/activity/`. The live Activity tab uses `events.subscribe` (no filter — workspace-scoped) to stream rows into a virtualized list (TanStack Virtual). Replay uses `task.replay` and renders the reconstructed timeline with a slider that scrubs through events; the UI re-renders task state at each point. Filter chips (by adapter, by event kind, by agent) narrow the live view; the URL query string holds the active filter so deep-links work.

---

## Dependencies

- Plan 03 — `events.subscribe` + `events.query`
- Plan 07 — `task.replay` runtime
- Plan 12 — Tasks UI (deep-link target from a task row → Replay)

## File structure (high-level)

```
apps/dycode/src/features/activity/
├── ActivityTab.tsx             # live event stream
├── EventRow.tsx                # one row per EventLogEntry
├── FilterChips.tsx
├── ReplayPane.tsx              # per-task scrubber
├── ReplayTimeline.tsx
├── hooks/
│   ├── useLiveEvents.ts        # events.subscribe + virtualized buffer
│   ├── useEventQuery.ts        # paginated history via events.query
│   └── useTaskReplay.ts        # task.replay
└── __tests__/
```

## Task list (titles only)

01. Branch + worktree
02. `<EventRow>` — type icon, agent badge, ts, payload preview, expand-to-JSON
03. `<ActivityTab>` — virtualized list (TanStack Virtual) + filter chips + pause/resume
04. `useLiveEvents` — `events.subscribe` + bounded ring buffer (default 500 rows)
05. URL state for filters — `?adapter=…&kind=…&agent=…`
06. Backfill — page in older events via `events.query` cursor pagination
07. `<ReplayPane>` — task selector + slider + state preview at point-in-time
08. `useTaskReplay` — calls `task.replay`, exposes `eventsAtPoint(ts)` selector
09. Replay timeline — shows state transitions as ticks on a timeline
10. Performance budget — 500 live rows render at 60fps; measure + lock
11. Deep-link from `<TaskCard>` (Plan 12) → `<ReplayPane>` for that task
12. Playwright e2e — open activity, see live event, scrub a completed task back to start
13. Docs: `docs/architecture/activity-replay.md`
14. Close-out: feature_list F83–F88, PROGRESS, tag

## What "done" looks like

- Live activity stream renders smoothly with no dropped frames at typical event rates
- Replay scrubber reconstructs task state at any point in its history; proven by e2e
- F83–F88 in `feature_list.json`, all `passing`
- `v0.0.13-plan-13` tag exists

## Deferred to later plans

- Cross-task replay (multiple tasks on one timeline) — out of scope for v1
- Export-to-bug-report (zip the replay) — out of scope until v1.1
- Settings + adapters tab — Plan 14

## Open questions

- Ring buffer size — 500 vs configurable? (Lean: configurable in Settings — defaults to 500.)
- Should completed tasks pin to the bottom of the activity feed, or hide by default? (Lean: visible but dimmed.)
