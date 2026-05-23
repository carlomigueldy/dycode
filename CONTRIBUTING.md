# Contributing to dycode

Thanks for your interest. dycode is built using **harness engineering** — see the design
spec at `docs/superpowers/specs/2026-05-23-dycode-design.md` §4 for the discipline overview.

## TL;DR

1. Read `CLAUDE.md` (or `AGENTS.md`).
2. Branch: `feat/<short-id>-<slug>` or `fix/<short-id>-<slug>`.
3. Make your change. Include relevant `CLAUDE.md`/`AGENTS.md` updates and `feature_list.json`
   scope changes in the same commit / PR.
4. Run `./scripts/verify.sh` — must exit 0.
5. Open a PR. CI runs the same `verify.sh`.
6. A reviewer (≠ you) gives a verdict on **consistency · scalability · maintainability ·
   correctness**. Anything below 10/10 blocks merge until addressed.

## The 5 quality gates

```
typecheck → lint → format → test → reviewer 10/10
```

1. `pnpm typecheck` — exit 0
2. `pnpm lint` — exit 0, zero warnings
3. `pnpm format` — exit 0 (Prettier check)
4. `pnpm test` — exit 0
5. Reviewer verdict ≥ 10/10

Gates 1–4 are automated by `scripts/verify.sh` and CI. Gate 5 is the review protocol.

## Reviewer protocol

- Reviewer ≠ author.
- Score 0–10 on each dimension: consistency, scalability, maintainability, correctness.
- Composite verdict must be **10/10** to approve.
- Concrete, named feedback. "Add error handling" is not feedback; "L42 swallows the
  parse failure — surface it as a `Result.Err` with the input range" is.
- Stale reviews invalidated on `git push --force-with-lease` to the PR branch.

## Commit style

Conventional commits:

- `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `build:`, `ci:`
- Scope optional: `feat(adapters): …`, `fix(daemon): …`
- One feature per branch. Don't bundle unrelated changes.

## Plans and linked GitHub issues

Each plan in `docs/superpowers/plans/` has exactly one tracking issue on GitHub.
The plan file is the spec; the issue is the worklog and status.

- **Branch from a plan issue.** If you're picking up Plan NN, your branch is
  `feat/plan-NN-<slug>` (same `<slug>` as the plan filename, lowercase, kebab-case).
- **Link the PR to the issue.** Include `Closes #N` (where `N` is the plan
  issue's number) in the PR description. When the PR merges to `main`, GitHub
  auto-closes the linked issue. Do not close plan issues by hand.
- **One plan, one PR (preferred).** Plans are sized so the whole plan lands in
  a single PR with the tag at the end. If you must split, the final PR carries
  the `Closes #N` line and the rest reference the issue without closing it.
- **Update the index in the same PR.** Move the plan entry in
  `docs/superpowers/plans/README.md` from "Not started" to "Shipped" along with
  the tag. CI checks that the index is current.

The plan index — `docs/superpowers/plans/README.md` — is the source of truth
for what's shipped, what's in flight, and what's queued. Read it before
starting any plan work.

## Adapters

Adapter authoring guide lives at `docs/tutorials/adapter-quickstart.md` (added in Plan 02+).
Built-in adapters live in `adapters/<id>/` (`@dycode/adapter-<id>`). Community adapters
publish as `dycode-adapter-<id>`.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). We follow the Contributor Covenant v2.1.

## Security

See [SECURITY.md](SECURITY.md) for reporting.
