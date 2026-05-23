# dycode · Plan 06 — Verifier sub-type + `vitest` adapter

**Status:** Not started · **Depends on:** Plan 05 · **Tag at close:** `v0.0.6-plan-06`

**Goal:** Introduce the verifier adapter sub-type — adapters that don't drive an agent but execute a verification command, report exit code + structured output, and feed the orchestrator's state-machine gate. Ship the first concrete verifier (`@dycode/adapter-vitest`) and make the `task.verification` field actually gate `active → passing` transitions.

**Architecture:** Extend `@dycode/adapter-sdk` with a `VerifierAdapter` sub-interface (declarative result schema, no PTY needed). Add a verifier lookup in the orchestrator: when a task's `verification` command is run, the matching verifier adapter executes it, returns `{ exitCode, stdoutLogRef, stderrLogRef, parsedFailures? }`, and the orchestrator records a `verify_run` `TaskEvidence` entry. The state machine refuses to promote `active → passing` unless the latest `verify_run` for the task has `exitCode === 0`.

---

## Dependencies

- Plan 02 — adapter SDK base interfaces
- Plan 04 — adapter host (verifier shares loader + registry)
- Plan 05 — task runtime + state machine + TaskEvidence shape

## File structure (high-level)

```
packages/adapter-sdk/
└── src/
    ├── verifier.ts             # VerifierAdapter interface + result schema
    └── index.ts                # re-export

adapters/
└── vitest/                     # NEW @dycode/adapter-vitest
    ├── src/
    │   ├── index.ts
    │   ├── manifest.ts         # flavor='verifier', no shell.exec capability needed beyond exec
    │   └── parse.ts            # parse Vitest JSON reporter output
    └── tests/

daemons/dycoded/
└── src/
    └── orchestrator/
        ├── verify.ts           # runs verifier → records verify_run evidence
        └── state.ts            # gate: refuse active→passing without exitCode=0
```

## Task list (titles only)

01. Branch + worktree
02. Extend `@dycode/adapter-sdk` — `VerifierAdapter` interface + `VerifyResult` schema; bump to 0.2.0
03. Update `@dycode/contracts` — extend `TaskEvidence.verify_run` if needed; bump if changed
04. `orchestrator/verify.ts` — invokes verifier by adapter id, captures exit code + logs
05. Log capture — write stdout/stderr to `<dataDir>/logs/<taskId>-<runId>.{out,err}`, store ref
06. Refactor state machine — block `active → passing` unless last `verify_run.exitCode === 0`
07. Scaffold `adapters/vitest` package
08. `vitest` manifest + detect (`which vitest` / inspect package.json)
09. `vitest` runner — child process executes `vitest run --reporter=json --outputFile=...`
10. `vitest` JSON output parser → structured `parsedFailures[]`
11. Wire verify.ts → vitest adapter when adapter id matches `task.verification` directive
12. `task.requestReview` — auto-fires a verifier run when reviewer submits, attaches evidence
13. End-to-end test: a task with `verification: "vitest run"` cannot promote without a passing run
14. Negative test: failing verification keeps task in `active`, reviewer must re-request
15. Docs: `docs/adapters/verifier-sub-type.md` + adapter-vitest map
16. Close-out: feature_list F31–F36, PROGRESS, tag

## What "done" looks like

- A task with `verification` referencing a vitest spec gets a `verify_run` evidence entry after `task.run`
- The state machine refuses to promote without a passing run — proven by a negative test
- F31–F36 in `feature_list.json`, all `passing`
- `v0.0.6-plan-06` tag exists; daemon honors the spec's harness-engineering promise that "execution evidence promotes state, not subjective claims"

## Deferred to later plans

- Remaining verifier adapters (jest, tsc, eslint, playwright) — Plan 11
- Verifier output replay UI — Plan 13
- Cross-workspace verifier sharing — out of scope for v1

## Open questions

- Should the verifier run inside the same workspace dir as the task, or in a temp checkout? (Lean: same dir; future plan adds sandbox.)
- Log retention policy — bounded by size? by age? (Defer until Plan 14 packaging.)
