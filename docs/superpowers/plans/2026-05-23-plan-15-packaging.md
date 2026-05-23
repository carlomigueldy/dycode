# dycode · Plan 15 — Packaging (electron-builder + sidecar bundle + signing)

**Status:** Not started · **Depends on:** Plan 14 (UI complete) · **Tag at close:** `v0.0.15-plan-15`

**Goal:** Produce distributable installers for macOS (.dmg), Windows (.exe via NSIS), and Linux (.AppImage + .deb). Bundle the `dycoded` daemon binary, all built-in adapters, and the prebuilt `node-pty` / `better-sqlite3` native modules. Sign + notarize on macOS, sign on Windows. Wire up `release.yml` GitHub Actions workflow to publish to GitHub Releases on tag push.

**Architecture:** `electron-builder` config in `apps/dycode/electron-builder.yml`. The daemon is bundled as a forked Node process inside the app — no separate binary for users to manage. Native modules are rebuilt for Electron's ABI via `@electron/rebuild`. Signing identity for macOS lives in repo secrets (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`); Windows signing uses a `.pfx` cert in `WIN_CSC_LINK`. Notarization via Apple notarytool. Linux is unsigned.

---

## Dependencies

- All prior plans (the user-facing app must be feature-complete before packaging)
- GitHub repo secrets for signing — provisioned by the project lead before this plan runs

## File structure (high-level)

```
apps/dycode/
├── electron-builder.yml        # NEW — full builder config
├── entitlements.mac.plist      # NEW — hardened runtime allows
├── build/                      # icons + dmg background
└── scripts/
    └── rebuild-natives.cjs     # @electron/rebuild wrapper

.github/workflows/
└── release.yml                 # NEW — triggers on tag push, builds 3 OSes, publishes
```

## Task list (titles only)

01. Branch + worktree
02. Install `electron-builder` + `@electron/rebuild` as devDependencies
03. `electron-builder.yml` — appId, productName, files, asarUnpack for natives
04. macOS config — hardened runtime, entitlements, notarization via notarytool
05. Windows config — NSIS installer, signed via `.pfx`
06. Linux config — AppImage + deb
07. Bundle daemon — invoke `pnpm --filter @dycode/dycoded build` and include `dist/` in app
08. Bundle built-in adapters — same pattern
09. Native rebuild script — runs `@electron/rebuild` for `node-pty` + `better-sqlite3`
10. Smoke test the produced macOS .dmg locally — install → launch → daemon spawns → fleet renders
11. `release.yml` GitHub Action — matrix across macOS/Windows/Linux runners, signs, uploads to GH Releases
12. Auto-update foundation (electron-updater) wired but disabled by default until v1.0
13. Crash report integration stub — Sentry-shaped local file dump (no remote upload by default)
14. Docs: `docs/release/packaging.md` + `docs/release/signing.md`
15. Close-out: feature_list F96–F101, PROGRESS, tag

## What "done" looks like

- Pushing tag `v0.0.15-plan-15` produces three signed installers on GitHub Releases
- Installing the macOS .dmg on a clean machine launches the app, spawns the daemon, and renders the fleet view
- F96–F101 in `feature_list.json`, all `passing`
- `v0.0.15-plan-15` tag exists

## Deferred to later plans

- Auto-update channel enablement — until v1.0
- Remote crash reporting (Sentry endpoint) — opt-in, defer to v1.1
- Microsoft Store / Mac App Store distribution — out of scope for v1

## Open questions

- Apple notarization timing — sometimes 5+ min per artifact; release.yml needs adequate timeout
- Linux distro coverage — AppImage works everywhere, but should we also ship `.rpm` / `.snap`? (Lean: AppImage + .deb only in v1.)
