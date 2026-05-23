# dycode · Plan 04 — Adapter plugin host

**Status:** Not started · **Depends on:** Plan 03 · **Tag at close:** `v0.0.4-plan-04`

**Goal:** Stand up the adapter plugin host inside `dycoded` — load adapters that conform to `@dycode/adapter-sdk`, gate calls by declared `Capability`, spawn/manage their lifecycle, and route their events into the daemon's event bus.

**Architecture:** New `src/adapters/` subtree in `daemons/dycoded` — `host.ts` (plugin loader + capability gate), `registry.ts` (installed adapters + manifests), `lifecycle.ts` (spawn/health/shutdown per instance). A *fixture* adapter ships in `tests/fixtures/` so the host is exercisable without any real CLI. Backpressure caps are per-adapter and live in the registry. PTY support uses `node-pty` and is gated behind an `AdapterFlavor` discriminator (interactive/structured/oneshot/verifier).

---

## Dependencies

- Plan 02 — `@dycode/adapter-sdk` (AdapterPlugin, AdapterManifest, AdapterEvent, Capability)
- Plan 03 — daemon scaffolding + event bus + subscription registry

## File structure (high-level)

```
daemons/dycoded/
└── src/
    └── adapters/
        ├── host.ts             # loader + capability check
        ├── registry.ts         # installed adapters + manifests + caps
        ├── lifecycle.ts        # per-instance spawn/health/shutdown
        ├── builtin/            # placeholder dir for Plan 05+
        └── ipc-bridge.ts       # AdapterEvent → EventBus translation
```

New IPC handlers: `adapter.list`, `adapter.install`, `adapter.uninstall`, `adapter.configure`, `runtime.scan` — wired through the dispatcher built in Plan 03.

## Task list (titles only — expanded at execution time)

01. Add `node-pty` to daemon deps + worktree + branch
02. `AdapterRegistry` — in-memory + SQLite persistence (migration 003 adapters)
03. `AdapterHost.load(manifest)` — schema-validates manifest, registers
04. Capability gate — refuse handler calls that need a capability the adapter didn't declare
05. `AdapterInstance` lifecycle — spawn/onEvent/health/shutdown wrappers
06. PTY flavor wiring via `node-pty` (gated by manifest.flavor === 'interactive')
07. IPC bridge — translate `AdapterEvent` to `EventLogEntry` and emit through EventBus
08. `adapter.list` + `adapter.install` + `adapter.uninstall` handlers
09. `adapter.configure` handler — validates against per-adapter `configSchema`
10. `runtime.scan` handler — invokes detection scanner per registered adapter
11. Fixture adapter in `tests/fixtures/` — exercises the full lifecycle without external CLI
12. Migration 003 — `adapters` table (installed + config + last health)
13. End-to-end test: install fixture adapter → adapter.list → runtime.scan → instance lifecycle
14. Docs: `docs/architecture/adapter-host.md` + map updates
15. Close-out: feature_list F15–F20, PROGRESS, tag

## What "done" looks like

- `pnpm --filter @dycode/dycoded test` exits 0 across host + bridge + handlers + fixture
- A user-installable adapter can be `adapter.install`'d, its capabilities are honored, and its events stream to subscribed clients
- F15–F20 in `feature_list.json`, all `passing`
- `v0.0.4-plan-04` tag exists; daemon CLI gains `dycoded adapter list`

## Deferred to later plans

- Concrete `claude-code` adapter → Plan 05
- Verifier sub-type + first verifier (`vitest`) → Plan 06
- `task.*` runtime that drives adapters end-to-end → Plan 05
- Adapter sandbox (process isolation, fs/net jails) — initial implementation here; hardening in Plan 15

## Open questions

- `node-pty` cross-platform build story (prebuilds vs source compilation in CI)
- Adapter package distribution (npm? GitHub Releases? bundled tarballs?) — defer until Plan 16
