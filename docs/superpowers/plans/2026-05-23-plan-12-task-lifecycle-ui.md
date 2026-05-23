# dycode · Plan 12 — Task lifecycle UI

**Status:** Not started · **Depends on:** Plan 09 (Fleet view) + Plan 07 (orchestrator) · **Tag at close:** `v0.0.12-plan-12`

**Goal:** Render the task lifecycle — create / assign / run / review — as a first-class UI surface. Per spec §4.4, worker and reviewer are different agents, and the reviewer must score ≥10/10 on consistency/scalability/maintainability/correctness for the task to promote. The UI enforces this visibly.

**Architecture:** New feature module `apps/dycode/src/features/tasks/`. Forms use React Hook Form + Zod resolvers — schemas come from `@dycode/contracts` (`task.create` params, `task.submitReviewVerdict` params). Worker/reviewer separation is enforced both in the dispatcher (Plan 05) and in the UI (the reviewer dropdown excludes the assignee). Verification command is a required field on `task.create` — empty string is rejected.

---

## Dependencies

- Plan 03 — IPC client
- Plan 05 — task runtime + handlers
- Plan 06 — verifier-driven state-machine gate
- Plan 07 — full orchestrator (router suggests assignee + reviewer candidates)
- Plan 09 — fleet view (provides agent picker source)

## File structure (high-level)

```
apps/dycode/src/features/tasks/
├── TasksTab.tsx
├── TaskList.tsx
├── TaskCard.tsx
├── TaskDrawer.tsx              # open task detail + evidence trail
├── modals/
│   ├── CreateTaskModal.tsx     # RHF + Zod
│   ├── AssignReviewerModal.tsx
│   └── SubmitVerdictModal.tsx  # 0–10 scorer + notes
├── hooks/
│   ├── useTasks.ts
│   └── useTaskSubscription.ts
└── __tests__/
```

## Task list (titles only)

01. Branch + worktree
02. `useTasks` hook — paginated `task.list` with `state` filter
03. `<TasksTab>` layout — filterable list + detail drawer
04. `<TaskCard>` — title + state pill (oklch token per state) + assignee + reviewer + verification cmd
05. `<TaskDrawer>` — evidence trail, event log replay link, action buttons
06. `<CreateTaskModal>` — RHF + Zod against `workspace.add` schema; verification field required + non-empty
07. `<AssignReviewerModal>` — reviewer dropdown excludes the assignee (UI enforcement of spec §4.4)
08. `<SubmitVerdictModal>` — 0–10 score, notes, three required dimensions checked
09. State-pill color mapping — `not_started/active/passing/blocked` → oklch tokens
10. Promote-blocked banner — UI surfaces "verifier exit ≠ 0; cannot promote" message
11. Real-time updates via `task.stateChanged` subscription
12. Playwright e2e — create task → assign → run → request review → submit verdict → promote
13. Docs: `docs/architecture/task-lifecycle-ui.md` + screenshots
14. Close-out: feature_list F75–F82, PROGRESS, tag

## What "done" looks like

- Full happy path from `New Task` button to `passing` state is achievable in the UI
- Worker/reviewer separation is impossible to violate from the UI (proven by Playwright negative test)
- F75–F82 in `feature_list.json`, all `passing`
- `v0.0.12-plan-12` tag exists

## Deferred to later plans

- Activity tab + replay scrubber — Plan 13
- Settings + adapters tab — Plan 14
- Bulk task ops (close many, reassign many) — out of scope for v1
- Task templates — out of scope until v1.1

## Open questions

- Verdict notes — markdown rendering allowed? (Lean: yes, but no remote-image embeds.)
- Should declined verdicts auto-create a follow-up task? (Lean: no in v1; the spec's "revisions kick state back to `active`" is sufficient.)
