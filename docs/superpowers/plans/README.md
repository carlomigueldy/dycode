# dycode plans — roadmap

Each row links its plan file, its tracking GitHub issue, and (when shipped) its release tag.
The index is the source of truth for project status. Update the row when the plan moves
state. PRs that don't update this index fail review.

> **Statuses:** `not started` · `in progress` · `shipped` · `deferred`

| #  | Plan                                                                       | Status      | Tag                | Issue |
| -- | -------------------------------------------------------------------------- | ----------- | ------------------ | ----- |
| 01 | [Foundation](2026-05-23-plan-01-foundation.md)                             | shipped     | `v0.0.1-plan-01`   | —     |
| 02 | [Contracts + Adapter SDK](2026-05-23-plan-02-contracts-adapter-sdk.md)     | shipped     | `v0.0.2-plan-02`   | —     |
| 03 | [`dycoded` daemon skeleton](2026-05-23-plan-03-daemon-skeleton.md)         | not started | `v0.0.3-plan-03`   | [#1](https://github.com/carlomigueldy/dycode/issues/1) |
| 04 | [Adapter plugin host](2026-05-23-plan-04-adapter-host.md)                  | not started | `v0.0.4-plan-04`   | [#2](https://github.com/carlomigueldy/dycode/issues/2) |
| 05 | [`claude-code` adapter + task runtime](2026-05-23-plan-05-claude-code-adapter-and-task-runtime.md) | not started | `v0.0.5-plan-05` | [#3](https://github.com/carlomigueldy/dycode/issues/3) |
| 06 | [Verifier sub-type + `vitest`](2026-05-23-plan-06-verifier-subtype-and-vitest.md) | not started | `v0.0.6-plan-06` | [#4](https://github.com/carlomigueldy/dycode/issues/4) |
| 07 | [Orchestrator core](2026-05-23-plan-07-orchestrator-core.md)               | not started | `v0.0.7-plan-07`   | [#5](https://github.com/carlomigueldy/dycode/issues/5) |
| 08 | [Electron shell skeleton](2026-05-23-plan-08-electron-shell-skeleton.md)   | not started | `v0.0.8-plan-08`   | [#6](https://github.com/carlomigueldy/dycode/issues/6) |
| 09 | [Fleet view](2026-05-23-plan-09-fleet-view.md)                             | not started | `v0.0.9-plan-09`   | [#7](https://github.com/carlomigueldy/dycode/issues/7) |
| 10 | [`codex` + `opencode` adapters](2026-05-23-plan-10-codex-and-opencode-adapters.md) | not started | `v0.0.10-plan-10` | [#8](https://github.com/carlomigueldy/dycode/issues/8) |
| 11 | [Remaining verifiers](2026-05-23-plan-11-remaining-verifiers.md)           | not started | `v0.0.11-plan-11`  | [#9](https://github.com/carlomigueldy/dycode/issues/9) |
| 12 | [Task lifecycle UI](2026-05-23-plan-12-task-lifecycle-ui.md)               | not started | `v0.0.12-plan-12`  | [#10](https://github.com/carlomigueldy/dycode/issues/10) |
| 13 | [Activity + Replay UI](2026-05-23-plan-13-activity-and-replay.md)          | not started | `v0.0.13-plan-13`  | [#11](https://github.com/carlomigueldy/dycode/issues/11) |
| 14 | [Settings + Adapters tab](2026-05-23-plan-14-settings-and-adapters-tab.md) | not started | `v0.0.14-plan-14`  | [#12](https://github.com/carlomigueldy/dycode/issues/12) |
| 15 | [Packaging](2026-05-23-plan-15-packaging.md)                               | not started | `v0.0.15-plan-15`  | [#13](https://github.com/carlomigueldy/dycode/issues/13) |
| 16 | [Docs site + adapter quickstart](2026-05-23-plan-16-docs-site-and-adapter-quickstart.md) | not started | `v0.0.16-plan-16` | [#14](https://github.com/carlomigueldy/dycode/issues/14) |
| 17 | [Public beta](2026-05-23-plan-17-public-beta.md)                           | not started | `v0.1.0-beta.1`    | [#15](https://github.com/carlomigueldy/dycode/issues/15) |

## Format conventions

- **Filename:** `YYYY-MM-DD-plan-NN-<slug>.md` where the date is the plan's *creation*
  date (not its execution date). Slug is short, kebab-case.
- **Plans 04+** are mini-specs (~50–100 lines). Each is expanded into a full
  bite-sized plan (like Plan 03) immediately before execution.
- **One plan ↔ one GitHub issue ↔ one tag.** Don't mix.

## How a plan moves through states

1. `not started` → `in progress` — when the GitHub issue is assigned and a worktree
   has been created from `main` via `superpowers:using-git-worktrees`.
2. `in progress` → `shipped` — when the plan's PR merges, its issue auto-closes via
   `Closes #N`, and the close-out tag exists.
3. Any state → `deferred` — when a plan is intentionally postponed past v1; mark
   with a footnote referencing the reason.
