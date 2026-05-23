# dycode

> Open-source multi-agent orchestration IDE. Built on Electron + TypeScript. Apache 2.0.

dycode auto-detects local AI coding CLIs (Claude Code, Codex, OpenCode, Hermes, OpenClaw,
Gemini-CLI, Cursor Agent, and more), groups them into squads with leaders or keeps them in
a free pool, and orchestrates work across them with first-class harness primitives —
verification commands, reviewer roles, replayable hand-offs.

**Status:** Pre-implementation. Design spec committed; foundation in progress.

## Design

- [docs/superpowers/specs/2026-05-23-dycode-design.md](docs/superpowers/specs/2026-05-23-dycode-design.md) — full design

## Map (for agents)

- [CLAUDE.md](CLAUDE.md) — agent entry point
- [AGENTS.md](AGENTS.md) — agent map (mirror)

## Quickstart (once foundation is in)

```bash
./scripts/init.sh          # env probe + install + health
pnpm dev                   # renderer + daemon hot reload (Plan 03+)
./scripts/verify.sh        # the only gate to "done"
```

## License

Apache 2.0. See [LICENSE](LICENSE).
