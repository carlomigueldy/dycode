# dycode · Plan 16 — Docs site + adapter quickstart

**Status:** Not started · **Depends on:** Plan 02 (adapter SDK) · **Tag at close:** `v0.0.16-plan-16`

**Goal:** Stand up the public docs site (`docs.dycode.dev`) and ship an end-to-end "Write your first adapter in 15 minutes" tutorial. The site is the public contract for community contributors — without it, the plugin-first promise of spec §0 doesn't land.

**Architecture:** New `apps/docs-site/` package built with Astro 5 (chosen for content-first model, native MDX, fast cold builds). Content sourced from `docs/` in the repo plus a few site-specific MDX pages (Getting Started, Tutorials, Reference). Diataxis layout: tutorials + how-to + reference + explanation. Auto-generates API reference from `@dycode/adapter-sdk` and `@dycode/contracts` TypeScript declarations via `typedoc`. Deploys to Vercel on every push to `main`.

---

## Dependencies

- Plan 02 — adapter SDK is the documented contract
- Plan 04 — adapter host (the tutorial installs into a real running daemon)
- Plans 10–11 — built-in adapters give worked examples

## File structure (high-level)

```
apps/
└── docs-site/                  # NEW @dycode/docs-site
    ├── astro.config.mjs
    ├── package.json
    ├── src/
    │   ├── content/            # MDX
    │   │   ├── getting-started/
    │   │   ├── tutorials/
    │   │   │   └── write-your-first-adapter.mdx
    │   │   ├── how-to/
    │   │   ├── reference/      # generated from TS
    │   │   └── explanation/    # design rationale
    │   ├── layouts/
    │   └── pages/
    └── public/                 # logo, og images

scripts/
└── generate-reference-docs.ts  # typedoc wrapper → MDX

.github/workflows/
└── docs-deploy.yml             # Vercel preview + prod
```

## Task list (titles only)

01. Branch + worktree
02. Scaffold `apps/docs-site` with Astro 5 + Tailwind (matches app's oklch theme)
03. Diataxis directory layout — content/ tree
04. Getting Started — install, first launch, add workspace, first task
05. Tutorial — "Write your first adapter in 15 minutes" (scaffolds a `hello-world` adapter)
06. How-to — common tasks (configure an adapter, debug a verifier, replay a task)
07. Reference — auto-generated from `@dycode/adapter-sdk` + `@dycode/contracts` via typedoc
08. Explanation — harness engineering, the 5 OpenAI principles → dycode features map
09. Code-fence theming — IBM Plex Mono, oklch tokens matching the app
10. Search — Pagefind static-site search (no external dep at runtime)
11. Vercel project setup + `docs-deploy.yml` workflow
12. Custom domain wiring — `docs.dycode.dev`
13. Open-graph images per page (generated at build time)
14. Brand-link audit — every link in the app's About menu points to the right docs page
15. Close-out: feature_list F102–F107, PROGRESS, tag

## What "done" looks like

- `docs.dycode.dev` is live and the tutorial actually produces a working `hello-world` adapter on a contributor's machine
- Reference docs reflect the current `@dycode/adapter-sdk@*` and `@dycode/contracts@*` surface
- F102–F107 in `feature_list.json`, all `passing`
- `v0.0.16-plan-16` tag exists

## Deferred to later plans

- Localization (translations) — out of scope for v1
- Adapter marketplace gallery — Plan 17 covers community-adapter discovery via docs links only

## Open questions

- Reference doc generation cadence — on every release tag, or on every main push? (Lean: every main push to keep docs current.)
- Versioned docs — necessary in v1? (Lean: no — only one major exists. Add when v1.0 ships and v0.x is archived.)
