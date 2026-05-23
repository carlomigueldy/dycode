# dycode · Plan 08 — Electron shell skeleton

**Status:** Not started · **Depends on:** Plan 03 (daemon + ipc-client) · **Tag at close:** `v0.0.8-plan-08`

**Goal:** Stand up the `dycode.app` Electron shell that spawns the daemon as a sidecar, talks to it over the daemon's IPC, and renders the empty Control Room chrome (window layout, Sidebar, Tabs, Resizable drawers, command palette stub). No domain UI yet — that arrives in Plans 09+.

**Architecture:** New `apps/dycode/` package — Vite + React 19 + shadcn UI + Tailwind v4. Electron main process: window mgmt + daemon sidecar spawn (uses `~/.dycode/runtime.json` handshake from Plan 03). Preload bridge exposes a thin `window.dycode.connect()` that returns a `DycodeClient` instance. Renderer state via Zustand (UI shell) + TanStack Query (server state). Aesthetic locked: oklch dark palette, IBM Plex Mono + Sans, acid-lime accent (`#A8FF60` / `oklch(95% 0.2 130)`).

---

## Dependencies

- Plan 03 — daemon binary + `@dycode/ipc-client`
- `@dycode/contracts` for typed method names
- Plans 04+ are NOT required — the shell renders an empty fleet until adapters land

## File structure (high-level)

```
apps/
└── dycode/                     # NEW @dycode/app
    ├── electron/
    │   ├── main.ts             # window + sidecar lifecycle
    │   ├── preload.ts          # window.dycode bridge
    │   └── sidecar.ts          # spawns daemon, polls runtime.json
    ├── src/                    # renderer
    │   ├── components/         # shadcn-derived primitives
    │   ├── features/
    │   │   └── shell/          # Sidebar + Tabs + Resizable layout
    │   ├── stores/             # Zustand
    │   ├── lib/                # WS client wrapper
    │   ├── routes/             # TanStack Router
    │   └── theme/              # oklch tokens, fonts
    ├── index.html
    └── vite.config.ts

packages/
└── ui/                         # NEW @dycode/ui — shadcn primitives, shared
```

## Task list (titles only)

01. Branch + worktree + scaffold `apps/dycode` (Vite + Electron preset)
02. Scaffold `packages/ui` — shadcn init, Tailwind v4 install
03. Tailwind theme — oklch palette, IBM Plex fonts, acid-lime accent token
04. Electron main — window mgmt + native chrome decisions per spec §7.7
05. Sidecar spawn — runs bundled `dycoded` bin, polls `runtime.json`, reads `auth.json`
06. Preload bridge — exposes `window.dycode = { connect, on }` (contextIsolation on)
07. Renderer entry — TanStack Router, TanStack Query, Zustand stores
08. Shell layout — Sidebar + main pane + collapsible right drawer + bottom drawer
09. Sidebar — workspace switcher + fleet anchor
10. Command palette (⌘K) — stub with shadcn `<Command>` (no commands wired yet)
11. Theme toggle + system preference sync
12. Smoke test — Playwright launches Electron, expects Sidebar visible, daemon healthy
13. Docs: `docs/architecture/electron-shell.md` + `docs/architecture/ui-tokens.md`
14. Close-out: feature_list F45–F52, PROGRESS, tag

## What "done" looks like

- `pnpm --filter @dycode/app dev` launches Electron → spawns daemon → connects → shows Sidebar
- Playwright smoke run is green in CI
- F45–F52 in `feature_list.json`, all `passing`
- `v0.0.8-plan-08` tag exists; shell renders the oklch theme correctly

## Deferred to later plans

- Fleet view content (Squads, Pool, Agents) — Plan 09
- Tasks tab — Plan 12
- Activity + Replay tabs — Plan 13
- Settings + Adapters tab — Plan 14
- Editor pane (Monaco) + terminal drawer (xterm.js) — out of scope until v1.1

## Open questions

- Native chrome on macOS — frameless or system? (Lean: frameless with custom title bar to match brutalist aesthetic.)
- electron-builder vs Tauri — confirm Electron is the call (spec §1 locks it in). Confirmed.
