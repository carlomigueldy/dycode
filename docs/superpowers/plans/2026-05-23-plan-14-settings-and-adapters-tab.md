# dycode · Plan 14 — Settings + Adapters tab

**Status:** Not started · **Depends on:** Plan 04 (adapter host) + Plan 08 (Electron shell) · **Tag at close:** `v0.0.14-plan-14`

**Goal:** Render the install / configure / uninstall surface for adapters and a general Settings panel. Users can discover which adapters they have on PATH, install plugins from a tarball or git URL, configure them (per-adapter `configSchema`), and tune preferences (theme, log level, activity buffer size, concurrency caps).

**Architecture:** New feature module `apps/dycode/src/features/settings/`. Adapter installation calls `adapter.install` with either a `local-path:` or `git+https://…` source. Per-adapter forms are auto-generated from `adapter.manifest.configSchema` — a small Zod-to-RHF renderer crosses the runtime/render boundary. Theme + log level preferences live in `~/.dycode/prefs.json` (new file, validated by Zod, also accessible to the daemon for log level). General preferences propagate via a new IPC method `prefs.set` / `prefs.get`.

---

## Dependencies

- Plan 04 — adapter.* IPC methods + capability gate
- Plan 08 — Electron shell + theme tokens
- Plan 13 — activity buffer size (mentioned in Settings)

## File structure (high-level)

```
apps/dycode/src/features/settings/
├── SettingsTab.tsx
├── AdaptersPanel.tsx
├── AdapterRow.tsx              # installed status + configure / uninstall actions
├── InstallAdapterModal.tsx
├── ConfigureAdapterDrawer.tsx  # auto-generated form from configSchema
├── PreferencesPanel.tsx        # theme / log level / activity buffer
├── lib/zod-to-rhf.ts           # Zod schema → React Hook Form fields
└── __tests__/

packages/contracts/src/ipc/methods.prefs.ts   # NEW prefs.get/set schemas

daemons/dycoded/src/
├── runtime/prefs.ts            # ~/.dycode/prefs.json r/w
└── ipc/handlers/prefs.ts
```

## Task list (titles only)

01. Branch + worktree
02. `@dycode/contracts` — add `prefs.get` / `prefs.set` schemas + `Preferences` shape (theme, logLevel, activityBufferSize, perAdapterCaps)
03. `runtime/prefs.ts` — read/write `~/.dycode/prefs.json` with Zod validation
04. `ipc/handlers/prefs.ts` — wire to dispatcher
05. `<PreferencesPanel>` — theme toggle, log level select, activity buffer slider
06. `<AdaptersPanel>` — list installed + available (registry view)
07. `<AdapterRow>` — status badge + last health + configure / uninstall actions
08. `<InstallAdapterModal>` — input local path or git URL; calls `adapter.install`
09. `lib/zod-to-rhf.ts` — translate `configSchema` (Zod object) into RHF field array
10. `<ConfigureAdapterDrawer>` — auto-generated form; calls `adapter.configure` on submit
11. Per-adapter concurrency cap override — surface to the user
12. Confirmation modals for destructive ops (uninstall, remove workspace)
13. Playwright e2e — install fixture adapter via UI → configure → uninstall
14. Docs: `docs/architecture/settings.md` + `docs/adapters/installing.md`
15. Close-out: feature_list F89–F95, PROGRESS, tag

## What "done" looks like

- Users can install / configure / uninstall adapters end-to-end without touching the CLI
- Preferences round-trip to disk and propagate to the daemon (e.g., log level change takes effect)
- F89–F95 in `feature_list.json`, all `passing`
- `v0.0.14-plan-14` tag exists

## Deferred to later plans

- Adapter marketplace / community gallery — Plan 16 docs only; UI defer
- Per-workspace preference overrides — out of scope until v1.1
- Import / export prefs as a file — out of scope until v1.1

## Open questions

- For `configSchema`, what's the supported Zod feature set in the renderer? (Lean: strings, numbers, booleans, enums, simple objects — no discriminated unions in v1.)
- Should adapter installation run in a worker thread to avoid blocking the daemon main loop? (Lean: yes if it involves npm install; defer the detail to Plan 04 review.)
