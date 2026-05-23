# Security Policy

## Supported versions

dycode is pre-1.0. Only the `main` branch is supported. Older tags and branches receive
no security fixes.

## Reporting a vulnerability

**Do not open a public issue for security reports.**

Please send a private report by opening a GitHub **Security Advisory** for this
repository, or by emailing the maintainer listed in the repository profile. Include:

- A description of the issue and the impact.
- Steps to reproduce, or a proof of concept.
- The affected commit SHA (if known).

We will acknowledge receipt within 7 days and aim for a fix or mitigation plan within
30 days for critical issues.

## Scope

In scope:

- The `dycode` Electron app and `dycoded` daemon.
- First-party adapters under `adapters/`.
- The IPC and adapter SDK contracts in `@dycode/contracts`.

Out of scope:

- Third-party adapters (`dycode-adapter-*` published on npm by others). Report to the
  adapter's own maintainers.
- Issues that require local code execution (the adapter trust model assumes installed
  adapters are trusted — see design spec §5.6).
