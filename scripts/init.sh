#!/usr/bin/env bash
set -euo pipefail

# scripts/init.sh — first-run environment probe + install + health.
# Idempotent: safe to re-run.

readonly REQUIRED_NODE_MAJOR=22
readonly REQUIRED_PNPM_MAJOR=9
readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"

echo "▸ dycode init"
echo "  root: $ROOT"
echo

probe() {
  local name="$1" cmd="$2" required="$3"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "  ✗ $name not found (required: $required)"
    return 1
  fi
  local version
  version="$("$cmd" --version 2>&1 | head -n1)"
  echo "  ✓ $name $version"
}

echo "▸ probing host"
probe "node" node "Node $REQUIRED_NODE_MAJOR LTS" || exit 1
node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$node_major" -lt "$REQUIRED_NODE_MAJOR" ]]; then
  echo "  ✗ Node $node_major < required $REQUIRED_NODE_MAJOR"
  echo "    fix: install Node 22 LTS (see .nvmrc); 'nvm use' or equivalent"
  exit 1
fi

probe "pnpm" pnpm "pnpm $REQUIRED_PNPM_MAJOR+" || {
  echo "    fix: 'npm i -g pnpm@latest' or 'corepack enable && corepack prepare pnpm@latest --activate'"
  exit 1
}
pnpm_major="$(pnpm --version | cut -d. -f1)"
if [[ "$pnpm_major" -lt "$REQUIRED_PNPM_MAJOR" ]]; then
  echo "  ✗ pnpm $pnpm_major < required $REQUIRED_PNPM_MAJOR"
  exit 1
fi

probe "git" git "any"  || exit 1
echo

echo "▸ installing dependencies"
pnpm install --frozen-lockfile=false
echo

echo "▸ health check"
echo "  · workspace packages:"
pnpm -r ls --depth -1 2>/dev/null | grep -E '^@dycode/' || echo "    (none yet)"
echo

echo "✓ dycode initialized"
echo "  next: ./scripts/verify.sh"
