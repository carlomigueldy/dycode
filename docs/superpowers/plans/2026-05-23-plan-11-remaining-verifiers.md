# dycode · Plan 11 — Remaining verifier adapters

**Status:** Not started · **Depends on:** Plan 06 (verifier sub-type + vitest) · **Tag at close:** `v0.0.11-plan-11`

**Goal:** Ship the remaining verifier adapters from spec §5.8 — `@dycode/adapter-jest`, `@dycode/adapter-tsc`, `@dycode/adapter-eslint`, `@dycode/adapter-playwright`. Cover the most common JS/TS verification surfaces so dycode's harness gate (Plan 06) works for the majority of real-world repos out of the box.

**Architecture:** Four new packages under `adapters/`, each implementing `VerifierAdapter` from the SDK. Each parses its tool's JSON / SARIF / stylish output into a `VerifyResult` with structured `parsedFailures[]`. The orchestrator's `verify.ts` (Plan 06) selects the verifier by the leading token of the `task.verification` command — `jest …` → adapter-jest, `tsc …` → adapter-tsc, etc.

---

## Dependencies

- Plan 06 — `VerifierAdapter` interface + `verify.ts` runner + state-machine gating

## File structure (high-level)

```
adapters/
├── jest/                       # NEW @dycode/adapter-jest
├── tsc/                        # NEW @dycode/adapter-tsc
├── eslint/                     # NEW @dycode/adapter-eslint
└── playwright/                 # NEW @dycode/adapter-playwright
```

Each follows the same shape: `src/{index,manifest,detect,run,parse}.ts` + `tests/`.

## Task list (titles only)

01. Branch + worktree
02. Scaffold `adapters/jest` package
03. Jest detect + `--json --outputFile` runner + JSON output parser
04. Jest end-to-end test with a fixture failing spec
05. Scaffold `adapters/tsc` package
06. TSC detect + `tsc --noEmit --pretty false` runner + diagnostic line parser
07. TSC end-to-end test (passing + failing scenarios)
08. Scaffold `adapters/eslint` package
09. ESLint detect + `eslint --format json` runner + per-file/per-rule failure parser
10. ESLint end-to-end test
11. Scaffold `adapters/playwright` package
12. Playwright detect + `playwright test --reporter=json` runner + per-spec failure parser
13. Playwright end-to-end test (headless run against a tiny example)
14. Verifier dispatch table — leading-token → adapter mapping in `orchestrator/verify.ts`
15. Docs: `docs/adapters/verifiers.md` (one page covering all four with examples)
16. Close-out: feature_list F67–F74, PROGRESS, tag

## What "done" looks like

- A task with `verification: "tsc --noEmit"` produces structured failure rows in its evidence trail
- All four verifiers can be invoked by setting `task.verification` to the right leading command
- F67–F74 in `feature_list.json`, all `passing`
- `v0.0.11-plan-11` tag exists

## Deferred to later plans

- Custom user-supplied verifiers (plugin SDK is already public; user docs in Plan 16)
- Cross-verifier orchestration (run all four, succeed only if all pass) — out of scope for v1

## Open questions

- Should `tsc` support project references via `--build` mode? (Lean: yes; pass `--build` through.)
- ESLint v9 flat-config detection — handle both flat and legacy `.eslintrc` (default to v9)
