#!/usr/bin/env bash
set -euo pipefail

# scripts/verify.sh — gates 1–4 of the dycode quality bar.
# Same commands run locally and in CI. No skipping. No --no-verify.

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

stage() {
  local n="$1" name="$2"
  echo
  echo "── GATE $n / 5 · $name"
}

fail() {
  echo
  echo "✗ verify failed at gate $1"
  exit 1
}

stage 1 "typecheck"
pnpm typecheck || fail 1

stage 2 "lint (zero warnings)"
pnpm lint --max-warnings 0 || fail 2

stage 3 "format check"
pnpm format || fail 3

stage 4 "tests"
pnpm test || fail 4

echo
echo "✓ verify passed gates 1–4. Gate 5 (reviewer 10/10) is enforced by review protocol."
