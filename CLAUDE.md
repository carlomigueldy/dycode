# dycode — agent map

> A multi-agent orchestration IDE. You are working on it.
> This file is the entry point. Stay here, follow links. ≤100 lines by design.

## Stack

- Electron + TypeScript · React + shadcn UI + Tailwind v4 (Plan 05+)
- Sidecar Node daemon (`dycoded`) · WebSocket JSON-RPC · SQLite (Plan 03)
- pnpm 9 workspaces + Turborepo 2 · Vitest 2 · ESLint 9 (flat) · Prettier 3
- Apache 2.0 · single license across the monorepo

## First commands

```bash
./scripts/init.sh     # env probe, install, health check
./scripts/verify.sh   # the 5-gate quality pipeline (1–4 automated, 5 = reviewer)
pnpm test:watch       # iterative dev loop
```

## Where to look

- **Design spec** → `docs/superpowers/specs/2026-05-23-dycode-design.md`
- **Plan roadmap (status of every plan)** → `docs/superpowers/plans/README.md`
- **Plans** → `docs/superpowers/plans/`
- **Architecture (deeper)** → `docs/architecture/` (added in later plans)
- **Adapter SDK** → `docs/adapters/sdk.md` · package: `packages/adapter-sdk/CLAUDE.md`
- **IPC protocol** → `docs/ipc-protocol/spec.md` · package: `packages/contracts/CLAUDE.md`
- **Contracts package** → `packages/contracts/CLAUDE.md`
- **Project skills** → `.claude/settings.json` (`superpowers`, `frontend-design`)

## Hard constraints

1. **No PR merges unless `./scripts/verify.sh` exits 0.** Same locally and in CI.
2. **Reviewer verdict ≥ 10/10** required to promote a task. Score on consistency,
   scalability, maintainability, correctness. Anything below 10 blocks promotion.
3. **Worker ≠ Reviewer.** Two different agents (or humans). Enforced.
4. **Update relevant `CLAUDE.md` / `AGENTS.md` in the same PR** as the change.
   Stale map links fail CI.
5. **Touch `feature_list.json` when adding or closing scope.**
6. **Conventional commits.** `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`,
   `test:`, `build:`, `ci:`.
7. **No emojis in code or docs** unless explicitly asked for a UI surface.
8. **No half-broken features.** If you can't define a verification command, it
   isn't a feature yet — it's a question.
9. **No LLM attribution in commits.** Commits must list a human as author and
   contain no `Co-Authored-By:` lines naming an LLM (Claude, GPT, Codex, etc.).
   The work is yours; tools assist. Same rule for PR descriptions and tags.
10. **Superpowers-first.** Reach for `superpowers:<skill>` (TDD, debugging,
    brainstorming, dispatching parallel agents, requesting/receiving code
    review, plan writing, git worktrees) before improvising a workflow.
11. **UI work pre-loads `/frontend-design:frontend-design`.** Any agent touching
    React, shadcn, Tailwind, or the Electron renderer loads the skill on
    session start and stays consistent with the design system it encodes. No
    bespoke styling that diverges from it.

## Layout (current)

```
dycode/
├── packages/
│   └── contracts/        # @dycode/contracts — shared Zod schemas + types
├── scripts/
│   ├── init.sh
│   └── verify.sh
├── docs/
│   └── superpowers/
│       ├── specs/        # design specs
│       └── plans/        # implementation plans
└── feature_list.json     # scope of record
```

Future layout (added by Plans 02–07): `apps/dycode` (Electron), `daemons/dycoded`,
`packages/adapter-sdk`, `packages/ui`, `packages/ipc-client`, `adapters/*`.

## Quality gates (the only "done")

1. `pnpm typecheck` — exit 0
2. `pnpm lint` — exit 0, zero warnings
3. `pnpm format` — exit 0
4. `pnpm test` — exit 0
5. Reviewer verdict 10/10 (review protocol; not enforced by `verify.sh`)
