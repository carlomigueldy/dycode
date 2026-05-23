# PROGRESS

Per-branch session log. Append entries below; each entry is date-stamped and lists what
was done, what remains, and any blockers. **End of session = clean state**: anything
in-progress becomes either a follow-up task in `feature_list.json` or a TODO with an
owner.

---

## 2026-05-23 · Plan 01 · Project Foundation

Done:

- Initialized monorepo (pnpm + Turborepo, TS 5.7, ESLint 9, Prettier 3, Vitest 2).
- Stub `@dycode/contracts` package with `CONTRACTS_VERSION` + tests passing.
- `scripts/init.sh` and `scripts/verify.sh` operational.
- GitHub Actions CI workflow scaffolded.
- Root `CLAUDE.md` + `AGENTS.md` maps; per-package maps for `contracts`.
- `feature_list.json` seeded (F01, F02 passing; F03 flips after first green CI run).

Remaining (deferred to later plans):

- Real Zod schemas in `@dycode/contracts` (Plan 02).
- Adapter SDK package (Plan 02).
- Daemon and adapters (Plan 03+).
- Electron shell (Plan 05+).

Blockers:

- None.

---

## 2026-05-23 · Plan 01 closed

- All 20 tasks complete. `./scripts/verify.sh` exits 0 locally with all 4 gates green.
- Final code review verdict (subagent-driven): **10/10** after consolidated fix commit
  `5413dc2` addressing the three Important findings from the initial 9.25/10 review:
  - **I1**: moved test build artifacts out of `dist/.tsc-tests/` so `npm pack` doesn't
    leak them when the contracts package eventually publishes.
  - **I2**: normalized branch prefix to `feat/` across spec and contributing docs.
  - **I3**: added a §9.3 implementation note explaining the gate-numbering choice
    (`format` surfaced separately; e2e collapsed into `test` until Plan 05+).
- Tagged `v0.0.1-plan-01` at `5413dc2` (includes all fixes).
- F03 flipped to `passing`: repo pushed to https://github.com/carlomigueldy/dycode,
  first CI run #26328241858 green in 24s (all 4 automated gates).
- Next plan: Plan 02 — `@dycode/contracts` real Zod schemas + `@dycode/adapter-sdk` package.

---

## 2026-05-23 · Plan 02 · Contracts + Adapter SDK

Done:

- Branded ULID-typed IDs (Workspace/Agent/Squad/Task).
- Domain schemas: Workspace, Agent + AgentStatus, Capability, Squad (leader-in-members invariant),
  Task (state machine + ReviewVerdict + TaskEvidence discriminated union + assignee≠reviewer refinement),
  EventLogEntry.
- IPC schemas: JSON-RPC 2.0 envelopes, dycode error codes, MethodName enum (29 methods),
  workspace._/runtime._/adapter._/squad._/pool._/task._/events.\* params+result schemas,
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
