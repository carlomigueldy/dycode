# dycode · Plan 17 — Public beta + call for community adapters

**Status:** Not started · **Depends on:** Plans 15 (packaging) + 16 (docs site) · **Tag at close:** `v0.1.0-beta.1`

**Goal:** Ship the public beta. This is the "we are real" plan — installers in users' hands, docs live, adapter SDK documented, community contribution paths visible. Not a code-heavy plan; mostly polish, comms, and validation.

**Architecture:** Meta-plan. No major new code surfaces — instead a curated pass over the existing surface for v0.1.0-beta.1 quality, a feedback channel (GitHub Discussions enabled), a community-adapter index page on the docs site, and a launch checklist.

---

## Dependencies

- All prior plans complete + `v0.0.16-plan-16` tagged
- Beta launch comms drafted offline (blog post, social posts, launch HN/Reddit threads)

## File structure (high-level)

```
.github/
├── DISCUSSION_TEMPLATE/
│   ├── adapter-share.yml       # template for community adapter announcements
│   ├── bug-report.yml
│   └── feature-request.yml
└── ISSUE_TEMPLATE/
    └── beta-feedback.yml

apps/docs-site/src/content/community/
└── adapters.mdx                # curated list, community submissions PR-able
```

## Task list (titles only)

01. Branch + worktree
02. Audit pass — all 17 prior tags pass `verify.sh` on a clean clone
03. Audit pass — every reviewer 10/10 verdict is recorded (per repo rule #2)
04. Polish pass — empty states, error messages, keyboard nav coverage
05. Accessibility audit — WCAG AA on the fleet, tasks, settings views
06. Performance audit — Lighthouse-equivalent on the renderer; activity tab still 60fps at 500 rows
07. Security pass — auth.json mode 0600 verified on macOS/Linux; daemon refuses non-localhost connections
08. GitHub Discussions enabled + welcome post drafted
09. Discussion templates — community-adapter-share, bug-report, feature-request
10. Community-adapters page on docs site — curated list, PR-able
11. CONTRIBUTING.md updated with adapter-author flow + DCO statement
12. Launch checklist — blog post live, HN/Reddit threads ready, mailing list set up
13. Beta installer artifacts hosted on GH Releases as `v0.1.0-beta.1`
14. Final docs review — every page builds, every example runs
15. Close-out: feature_list F108–F112, PROGRESS, tag

## What "done" looks like

- `v0.1.0-beta.1` is published on GitHub Releases as a Pre-release
- `docs.dycode.dev` reflects beta content; tutorial works end-to-end on a fresh machine
- GitHub Discussions is open and seeded
- F108–F112 in `feature_list.json`, all `passing`
- At least one community-contributed adapter (or proof someone outside the team has written one against the public SDK)

## Deferred (deliberately) to v1.0 / post-beta

- Auto-update channel enablement
- Microsoft Store / Mac App Store
- Localization
- Predictive routing
- Editor pane + terminal drawer (Monaco + xterm.js)
- Headless `dycoded` mode hardening for server-side use

## Open questions

- Beta opt-in telemetry — what minimal signal do we collect? (Lean: anonymous version + OS + crash stub only; opt-in toggle in Settings.)
- License of community-contributed adapters — Apache 2.0 strongly suggested, not enforced. Decide before launch.
