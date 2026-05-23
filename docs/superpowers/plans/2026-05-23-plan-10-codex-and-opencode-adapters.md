# dycode · Plan 10 — `codex` + `opencode` adapters

**Status:** Not started · **Depends on:** Plan 05 (claude-code adapter) · **Tag at close:** `v0.0.10-plan-10`

**Goal:** Ship two more built-in adapters — `@dycode/adapter-codex` (OpenAI's `codex` CLI, structured flavor) and `@dycode/adapter-opencode` (the opencode CLI, interactive flavor). Prove the SDK's three-flavor model by having three real adapters in the registry that the user can pick between.

**Architecture:** Two new packages under `adapters/`. Each declares its `AdapterManifest` (capabilities, configSchema), implements `detect()` against `PATH`, and exposes spawn + stream parsing matching its CLI's quirks. Concurrency caps per spec §3.4: claude-code at 2, codex at 2, opencode at 1. The interactive flavor wires PTY via `node-pty` from Plan 04's host.

---

## Dependencies

- Plan 04 — adapter host (including PTY support for interactive flavor)
- Plan 05 — task runtime + first adapter (proves the contract)
- Plan 06 — verifier sub-type (these are non-verifier adapters; included only for completeness)

## File structure (high-level)

```
adapters/
├── codex/                      # NEW @dycode/adapter-codex
│   ├── src/
│   │   ├── index.ts
│   │   ├── manifest.ts         # structured flavor
│   │   ├── detect.ts
│   │   ├── spawn.ts
│   │   └── stream.ts
│   └── tests/
└── opencode/                   # NEW @dycode/adapter-opencode
    ├── src/
    │   ├── index.ts
    │   ├── manifest.ts         # interactive flavor (PTY)
    │   ├── detect.ts
    │   ├── pty.ts              # node-pty wiring
    │   └── parse.ts            # screen-scrape progress out of TTY output
    └── tests/
```

## Task list (titles only)

01. Branch + worktree
02. Scaffold `adapters/codex` package
03. Codex manifest + capabilities (`code.read`, `code.write`, `shell.exec`, `stream.structured`)
04. Codex detect — `which codex` + version probe
05. Codex spawn + structured event stream parser
06. Codex fixture mock binary in tests/fixtures/
07. Codex end-to-end test (skipped when real CLI absent)
08. Scaffold `adapters/opencode` package
09. Opencode manifest + interactive flavor declaration
10. Opencode detect — `which opencode`
11. Opencode PTY spawn via `node-pty` (cross-platform — confirm prebuilds in CI)
12. Opencode output parser — extract progress markers from raw TTY stream
13. Opencode fixture deterministic mock + end-to-end test
14. Per-adapter concurrency cap config (registry → scheduler)
15. Docs: `docs/adapters/codex.md` + `docs/adapters/opencode.md` + map updates
16. Close-out: feature_list F59–F66, PROGRESS, tag

## What "done" looks like

- A user with `codex` and `opencode` on PATH can install both via `adapter.install` and run tasks against them
- Concurrency caps are honored (proven by a scheduler test that admits ≤2 codex + ≤1 opencode)
- F59–F66 in `feature_list.json`, all `passing`
- `v0.0.10-plan-10` tag exists

## Deferred to later plans

- Community adapter quickstart docs — Plan 16
- Adapter marketplace UI — out of scope for v1
- Per-task adapter overrides (env, args) — out of scope until v1.1

## Open questions

- `codex` CLI's structured-output format may have shifted — confirm against current version
- Opencode's progress markers stability across versions — pin a minimum supported version in manifest
