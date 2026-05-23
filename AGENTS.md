# AGENTS — dycode map

> Open this when you (the agent) start a session in this repo. ≤100 lines by design.
> Same map as CLAUDE.md, phrased for agents.

## You are working on

A multi-agent orchestration IDE. Local Electron app, Node sidecar daemon, plugin-first
adapters for AI coding CLIs (Claude Code, Codex, OpenCode, Hermes, OpenClaw, etc.).
Apache 2.0, open-source.

## Stack

- Electron + TypeScript · React + shadcn UI + Tailwind v4 (Plan 05+)
- Node daemon `dycoded` · WebSocket JSON-RPC · SQLite (Plan 03)
- pnpm 9 · Turborepo 2 · Vitest 2 · ESLint 9 · Prettier 3 · TypeScript 5.7

## First commands

```bash
./scripts/init.sh
./scripts/verify.sh
pnpm test:watch
```

## Where to look

- Design spec → `docs/superpowers/specs/2026-05-23-dycode-design.md`
- Active plan → `docs/superpowers/plans/`
- Architecture → `docs/architecture/` (later plans)
- Per-package map → `packages/<name>/AGENTS.md`

## Rules of engagement

1. `./scripts/verify.sh` exit 0 is the only path to "done". No skipping.
2. Reviewer verdict ≥ 10/10 to promote a task (worker ≠ reviewer).
3. Score reviews on consistency, scalability, maintainability, correctness.
4. Update relevant `CLAUDE.md` / `AGENTS.md` in the same PR.
5. Update `feature_list.json` when scope changes.
6. Conventional commits.
7. No emojis in source / docs unless requested for UI.
8. No half-broken features. Verification command required per feature.
9. No LLM attribution in commits, PRs, or tags. Author is the human; no
   `Co-Authored-By: <LLM>` lines.

## Progressive disclosure

If it's not linked from this map, it doesn't exist for you. Follow links into
`docs/` and per-package maps. Don't go reading the whole repo.

## Quality gates (the only "done")

1. `pnpm typecheck` — exit 0
2. `pnpm lint` — exit 0, zero warnings
3. `pnpm format` — exit 0
4. `pnpm test` — exit 0
5. Reviewer verdict 10/10 (review protocol)
