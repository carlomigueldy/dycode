# dycode · Plan 01 — Project Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the dycode monorepo with pnpm + Turborepo, strict TypeScript, ESLint v9 (flat), Prettier, Vitest, GitHub Actions CI, root harness artifacts (`CLAUDE.md`, `AGENTS.md`, `feature_list.json`, `init.sh`, `verify.sh`), and a stub `@dycode/contracts` package that builds, lints, types, and tests cleanly — proving the 5-gate pipeline end-to-end.

**Architecture:** pnpm workspaces with Turborepo as the task graph. TypeScript composite project references so packages stay typecheckable in isolation. ESLint flat config + Prettier shared at the root. Vitest with a workspace config. CI runs the *same* `scripts/verify.sh` the developer runs locally. The stub contracts package is intentionally minimal — it exists to prove pipelines work, not to define real types yet (Plan 02 does that).

**Tech Stack:** Node 22 LTS · pnpm 9 · Turborepo 2 · TypeScript 5.5 · Vitest 2 · ESLint 9 (flat) · Prettier 3 · GitHub Actions

**Starting state:** The repo has `main` with one root commit (`a28fa7d`) containing `.gitignore` and `docs/superpowers/specs/2026-05-23-dycode-design.md`. Working directory is `/Users/carlomigueldy/personal/dycode`. No `package.json` yet.

---

## File structure produced by this plan

```
dycode/
├── .editorconfig                    # editor consistency
├── .github/
│   └── workflows/
│       └── ci.yml                   # runs scripts/verify.sh
├── .nvmrc                           # pins Node 22 LTS
├── .npmrc                           # pnpm settings
├── .prettierignore
├── .prettierrc.json
├── AGENTS.md                        # ≤100-line agent-flavored map
├── CLAUDE.md                        # ≤100-line root TOC
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE                          # Apache 2.0
├── PROGRESS.md                      # branch session log seed
├── README.md
├── SECURITY.md
├── eslint.config.js                 # flat config
├── feature_list.json                # F01..F02 seed
├── package.json                     # root, private, workspaces scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json               # strict + composite
├── tsconfig.json                    # solution file (references)
├── turbo.json                       # task graph + caching
├── vitest.workspace.ts              # vitest workspace
├── scripts/
│   ├── init.sh                      # env probe + install + health
│   └── verify.sh                    # typecheck → lint → unit
└── packages/
    └── contracts/                   # stub @dycode/contracts
        ├── CLAUDE.md
        ├── AGENTS.md
        ├── package.json
        ├── tsconfig.json
        ├── vitest.config.ts
        ├── src/
        │   ├── index.ts
        │   └── version.ts
        └── tests/
            └── version.test.ts
```

Files NOT created here (deferred to later plans): `daemons/`, `apps/`, `adapters/`, `docs/architecture/*`, IPC schemas, runtime detection. Plan 01 only proves the *pipeline* works.

---

## Conventions locked in by this plan

1. **Node:** `>=22 <25` in `engines`, `.nvmrc` pinned to `22.13.0` (latest 22 LTS as of plan date).
2. **Package manager:** **pnpm 9**, enforced via `packageManager` field. No npm/yarn.
3. **Workspaces:** packages under `packages/*`. Future: `apps/*`, `daemons/*`, `adapters/*` (added by later plans).
4. **TypeScript:** `strict: true`, `noUncheckedIndexedAccess: true`, `composite: true`, project references everywhere.
5. **Module system:** ESM only (`"type": "module"`). All TS compiled with `tsc` to `dist/`.
6. **Lint:** ESLint 9 flat config; `@typescript-eslint` type-checked rules. Zero warnings in CI.
7. **Format:** Prettier 3. `verify.sh` runs `prettier --check`.
8. **Tests:** Vitest 2 with workspace config. Tests co-located in `tests/` per package OR `*.test.ts` adjacent.
9. **Commits:** Conventional commits. `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `build:`, `ci:`.
10. **Branches:** `feat/<short-id>-<slug>`, `fix/<...>`, `chore/<slug>`.
11. **No emojis in files** (unless explicitly user-requested for a UI surface).

---

## Task list

| # | Task | Output |
|---|---|---|
| 01 | Initialize root `package.json` + pnpm workspace | pnpm install works |
| 02 | Add `.nvmrc`, `.npmrc`, `.editorconfig` | environment pinned |
| 03 | Add `LICENSE` (Apache 2.0) + `README.md` stub | legal + entry doc |
| 04 | Add `tsconfig.base.json` + solution `tsconfig.json` | tsc baseline |
| 05 | Add Prettier config + ignore | format check works |
| 06 | Add ESLint flat config | lint works |
| 07 | Add Turborepo `turbo.json` | task graph works |
| 08 | Add Vitest workspace config | test runner works |
| 09 | Scaffold `@dycode/contracts` stub package | first package compiles |
| 10 | Add stub `version` module + failing test | TDD foundation |
| 11 | Implement `version` module, make test pass | first green |
| 12 | Add `scripts/init.sh` | onboarding command |
| 13 | Add `scripts/verify.sh` | 5-gate pipeline |
| 14 | Add GitHub Actions `ci.yml` | CI runs verify.sh |
| 15 | Add root `CLAUDE.md` (≤100 lines) | agent map |
| 16 | Add root `AGENTS.md` (mirror) | agent map B |
| 17 | Add package `CLAUDE.md` + `AGENTS.md` for contracts | per-package maps |
| 18 | Add `feature_list.json` (seed F01, F02) | machine-readable scope |
| 19 | Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `PROGRESS.md` | governance docs |
| 20 | End-to-end smoke + push + verify CI green | milestone |

Each task below: a few labeled, checkboxed steps. Code blocks are complete and ready to paste.

---

### Task 01 · Initialize root `package.json` and pnpm workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "dycode",
  "version": "0.0.0",
  "private": true,
  "description": "Open-source multi-agent orchestration IDE (Electron + TypeScript).",
  "license": "Apache-2.0",
  "type": "module",
  "engines": {
    "node": ">=22 <25",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "eslint .",
    "format": "prettier --check .",
    "format:fix": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "verify": "bash scripts/verify.sh",
    "init": "bash scripts/init.sh",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@typescript-eslint/eslint-plugin": "^8.20.0",
    "@typescript-eslint/parser": "^8.20.0",
    "eslint": "^9.18.0",
    "globals": "^15.14.0",
    "prettier": "^3.4.2",
    "tsx": "^4.19.2",
    "turbo": "^2.3.3",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.20.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  # future: "apps/*", "daemons/*", "adapters/*"
```

- [ ] **Step 3: Install dependencies**

Run: `pnpm install`
Expected: `Done in <some time>` with `node_modules/` populated. No errors.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore: initialize root package.json and pnpm workspace"
```

---

### Task 02 · Pin Node + editor + pnpm settings

**Files:**
- Create: `.nvmrc`
- Create: `.npmrc`
- Create: `.editorconfig`

- [ ] **Step 1: Write `.nvmrc`**

```
22.13.0
```

- [ ] **Step 2: Write `.npmrc`**

```ini
auto-install-peers=true
strict-peer-dependencies=false
enable-pre-post-scripts=false
node-linker=isolated
```

`isolated` linker = pnpm's default symlink scheme; deterministic and fast. `enable-pre-post-scripts=false` prevents accidental script execution from dependencies.

- [ ] **Step 3: Write `.editorconfig`**

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
```

- [ ] **Step 4: Commit**

```bash
git add .nvmrc .npmrc .editorconfig
git commit -m "chore: pin Node 22 LTS and editor settings"
```

---

### Task 03 · Add `LICENSE` and `README.md`

**Files:**
- Create: `LICENSE`
- Create: `README.md`

- [ ] **Step 1: Write `LICENSE` (Apache 2.0, standard text)**

Use the verbatim Apache License 2.0 text from <https://www.apache.org/licenses/LICENSE-2.0.txt>. Copy the entire license file verbatim. Do not modify. Replace the year/owner placeholders at the bottom only if the chosen template has them — the canonical Apache 2.0 license text has no copyright line; year/owner is communicated via `NOTICE` if needed (not required for v1).

Concrete: run

```bash
curl -fsSL https://www.apache.org/licenses/LICENSE-2.0.txt -o LICENSE
```

Verify SHA: the file should match upstream. If `curl` is unavailable, paste the canonical text manually.

- [ ] **Step 2: Write `README.md`**

```markdown
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

\`\`\`bash
./scripts/init.sh          # env probe + install + health
pnpm dev                   # renderer + daemon hot reload (Plan 03+)
./scripts/verify.sh        # the only gate to "done"
\`\`\`

## License

Apache 2.0. See [LICENSE](LICENSE).
```

- [ ] **Step 3: Commit**

```bash
git add LICENSE README.md
git commit -m "docs: add Apache 2.0 license and README"
```

---

### Task 04 · TypeScript base and solution configs

**Files:**
- Create: `tsconfig.base.json`
- Create: `tsconfig.json`

- [ ] **Step 1: Write `tsconfig.base.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "useUnknownInCatchVariables": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true,
    "newLine": "lf"
  },
  "exclude": ["node_modules", "**/dist/**", "**/build/**"]
}
```

- [ ] **Step 2: Write `tsconfig.json` (solution file with references)**

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "references": [
    { "path": "./packages/contracts" }
  ],
  "include": []
}
```

`include: []` is intentional — the solution file orchestrates references; project files configure their own includes.

- [ ] **Step 3: Commit**

```bash
git add tsconfig.base.json tsconfig.json
git commit -m "chore(ts): add strict base and solution tsconfig"
```

---

### Task 05 · Prettier config

**Files:**
- Create: `.prettierrc.json`
- Create: `.prettierignore`

- [ ] **Step 1: Write `.prettierrc.json`**

```json
{
  "$schema": "https://json.schemastore.org/prettierrc",
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "endOfLine": "lf",
  "arrowParens": "always",
  "overrides": [
    { "files": "*.md", "options": { "printWidth": 100 } },
    { "files": "*.json", "options": { "printWidth": 80 } }
  ]
}
```

- [ ] **Step 2: Write `.prettierignore`**

```
node_modules
dist
build
out
coverage
pnpm-lock.yaml
*.tsbuildinfo
.turbo
.superpowers
docs/superpowers/specs/**/*.md
```

We exclude the spec file because it has hand-formatted ASCII diagrams Prettier would mangle.

- [ ] **Step 3: Verify format check passes**

Run: `pnpm format`
Expected: `All matched files use Prettier code style!` (or it auto-fixes nothing because the workspace is small)

- [ ] **Step 4: Commit**

```bash
git add .prettierrc.json .prettierignore
git commit -m "chore: add Prettier 3 config and ignore"
```

---

### Task 06 · ESLint flat config

**Files:**
- Create: `eslint.config.js`

- [ ] **Step 1: Write `eslint.config.js`**

```js
// @ts-check
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  // 1. global ignores
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/.superpowers/**',
      'pnpm-lock.yaml',
    ],
  },

  // 2. base recommended
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // 3. TS files with type-aware linting
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // 4. JS files (eslint config itself, scripts)
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
)
```

Need `@eslint/js` as a devDep — install it.

- [ ] **Step 2: Add missing dev dep**

Run: `pnpm add -DwE @eslint/js`
Expected: `@eslint/js` added to root `devDependencies`.

- [ ] **Step 3: Smoke-test lint on the empty repo**

Run: `pnpm lint`
Expected: clean output, no files matched (still pre-package), exit 0.

If you see errors about `tsconfigRootDir`, the `projectService` resolves at lint time; on a fresh repo with no TS files yet, that's fine.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js package.json pnpm-lock.yaml
git commit -m "chore(lint): add ESLint 9 flat config with type-checked rules"
```

---

### Task 07 · Turborepo config

**Files:**
- Create: `turbo.json`

- [ ] **Step 1: Write `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**", "*.tsbuildinfo"],
      "inputs": [
        "src/**",
        "tests/**",
        "package.json",
        "tsconfig.json",
        "tsconfig.*.json"
      ]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": ["*.tsbuildinfo"],
      "inputs": [
        "src/**",
        "tests/**",
        "package.json",
        "tsconfig.json",
        "tsconfig.*.json",
        "../../tsconfig.base.json"
      ]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": [
        "src/**",
        "tests/**",
        "vitest.config.ts",
        "package.json"
      ]
    },
    "lint": {
      "outputs": [],
      "inputs": ["src/**", "tests/**", "*.json", "../../eslint.config.js"]
    },
    "clean": {
      "cache": false,
      "outputs": []
    }
  }
}
```

- [ ] **Step 2: Smoke-test**

Run: `pnpm exec turbo run typecheck --dry`
Expected: dry-run output listing tasks (none yet — no packages have `typecheck` scripts). Exit 0.

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "chore: add Turborepo task graph config"
```

---

### Task 08 · Vitest workspace

**Files:**
- Create: `vitest.workspace.ts`

- [ ] **Step 1: Write `vitest.workspace.ts`**

```ts
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/*',
])
```

- [ ] **Step 2: Smoke-test**

Run: `pnpm test`
Expected: Vitest finds zero tests (no packages yet), exit 0 (or exit code documenting "no tests" — both are acceptable as long as later runs work).

If Vitest 2 returns non-zero for zero tests, install with `--allowOnly=false` later or add `--passWithNoTests` to the root `test` script. Edit the root `package.json` `test` script to:

```json
"test": "vitest run --passWithNoTests"
```

Re-run `pnpm test` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add vitest.workspace.ts package.json
git commit -m "chore(test): add Vitest workspace config"
```

---

### Task 09 · Scaffold `@dycode/contracts` stub package

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/vitest.config.ts`
- Create: `packages/contracts/src/index.ts`

This package will be fleshed out in Plan 02 with real Zod schemas. For now it's a stub that proves the build/test/lint pipeline.

- [ ] **Step 1: Write `packages/contracts/package.json`**

```json
{
  "name": "@dycode/contracts",
  "version": "0.0.0",
  "private": true,
  "description": "Shared Zod schemas and TypeScript types for dycode IPC, adapter SDK, and domain model.",
  "license": "Apache-2.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -b",
    "typecheck": "tsc -b",
    "test": "vitest run",
    "clean": "rm -rf dist *.tsbuildinfo"
  }
}
```

- [ ] **Step 2: Write `packages/contracts/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "tests"]
}
```

- [ ] **Step 3: Write `packages/contracts/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
})
```

- [ ] **Step 4: Write `packages/contracts/src/index.ts`**

```ts
export { CONTRACTS_VERSION } from './version.js'
```

- [ ] **Step 5: Add reference back to the root tsconfig.json** — already done in Task 04, verify it includes `./packages/contracts`. If missing, edit `tsconfig.json` to add it.

- [ ] **Step 6: Install (refreshes workspace links)**

Run: `pnpm install`
Expected: `+ @dycode/contracts` shown in summary; symlinked under `node_modules`.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts/package.json packages/contracts/tsconfig.json packages/contracts/vitest.config.ts packages/contracts/src/index.ts pnpm-lock.yaml
git commit -m "feat(contracts): scaffold @dycode/contracts stub package"
```

---

### Task 10 · Write the failing test for `version` module

**Files:**
- Create: `packages/contracts/tests/version.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { CONTRACTS_VERSION } from '../src/index.js'

describe('CONTRACTS_VERSION', () => {
  it('exports a non-empty semver string', () => {
    expect(typeof CONTRACTS_VERSION).toBe('string')
    expect(CONTRACTS_VERSION.length).toBeGreaterThan(0)
  })

  it('matches a basic semver shape', () => {
    expect(CONTRACTS_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/)
  })

  it('starts at major version 0 for pre-1.0 contract', () => {
    const major = Number.parseInt(CONTRACTS_VERSION.split('.')[0] ?? '', 10)
    expect(major).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @dycode/contracts test`
Expected: FAIL with module-not-found or cannot-find-name error for `version.js` (since `src/version.ts` doesn't exist yet).

Output should resemble:

```
FAIL  tests/version.test.ts
Cannot find module '../src/version.js'
```

If instead the test passes, the test isn't actually exercising what we think — re-check that `src/index.ts` is the *only* re-export and `version.ts` is genuinely missing.

- [ ] **Step 3: Commit the failing test**

```bash
git add packages/contracts/tests/version.test.ts
git commit -m "test(contracts): add failing test for CONTRACTS_VERSION"
```

---

### Task 11 · Implement `version` to make the test pass

**Files:**
- Create: `packages/contracts/src/version.ts`

- [ ] **Step 1: Write `packages/contracts/src/version.ts`**

```ts
/**
 * Semver of the dycode IPC + adapter contracts surface.
 * Bump major on any breaking change to public types or JSON-RPC methods.
 */
export const CONTRACTS_VERSION = '0.0.0' as const
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `pnpm --filter @dycode/contracts test`
Expected: 3 tests passing.

```
✓ CONTRACTS_VERSION > exports a non-empty semver string
✓ CONTRACTS_VERSION > matches a basic semver shape
✓ CONTRACTS_VERSION > starts at major version 0 for pre-1.0 contract
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @dycode/contracts typecheck`
Expected: clean exit, `dist/.tsbuildinfo` created.

- [ ] **Step 4: Run lint on the package**

Run: `pnpm lint`
Expected: zero errors, zero warnings.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/version.ts
git commit -m "feat(contracts): implement CONTRACTS_VERSION 0.0.0"
```

---

### Task 12 · `scripts/init.sh` — env probe + install + health

**Files:**
- Create: `scripts/init.sh`

This is the "Environment" harness subsystem in code.

- [ ] **Step 1: Write `scripts/init.sh`**

```bash
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
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x scripts/init.sh`

- [ ] **Step 3: Smoke test**

Run: `./scripts/init.sh`
Expected: All probes succeed; `pnpm install` runs without error; workspace lists `@dycode/contracts`; ends with `✓ dycode initialized`.

- [ ] **Step 4: Commit**

```bash
git add scripts/init.sh
git commit -m "chore(scripts): add init.sh env probe and install"
```

---

### Task 13 · `scripts/verify.sh` — the 5-gate pipeline

**Files:**
- Create: `scripts/verify.sh`

Gates 1–4 are automated here. Gate 5 (reviewer 10/10) is enforced by review protocol, not this script.

- [ ] **Step 1: Write `scripts/verify.sh`**

```bash
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
```

Note: `format` is logically a sub-gate of "lint" but we surface it separately so failures are clearer.

- [ ] **Step 2: Make it executable**

Run: `chmod +x scripts/verify.sh`

- [ ] **Step 3: Run the full pipeline**

Run: `./scripts/verify.sh`
Expected:

```
── GATE 1 / 5 · typecheck     ✓
── GATE 2 / 5 · lint          ✓
── GATE 3 / 5 · format check  ✓
── GATE 4 / 5 · tests         ✓ (3 passing)

✓ verify passed gates 1–4. Gate 5 (reviewer 10/10) is enforced by review protocol.
```

If any gate fails, fix the underlying issue — do not skip gates.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify.sh
git commit -m "chore(scripts): add verify.sh 5-gate quality pipeline"
```

---

### Task 14 · GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  verify:
    name: verify.sh (gates 1–4)
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Verify
        run: bash scripts/verify.sh
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run scripts/verify.sh on push and PR"
```

CI will green-light after the final push at Task 20.

---

### Task 15 · Root `CLAUDE.md` (≤100 lines)

**Files:**
- Create: `CLAUDE.md`

This is the agent entry point. It is the *only* full-codebase context an agent should need at the start of a session.

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
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
- **Plans** → `docs/superpowers/plans/`
- **Architecture (deeper)** → `docs/architecture/` (added in later plans)
- **Adapter SDK** → `docs/adapters/` (Plan 02+)
- **IPC protocol** → `docs/ipc-protocol/` (Plan 02+)
- **Contracts package** → `packages/contracts/CLAUDE.md`

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
```

This file should be exactly ≤100 lines including comments and the closing fence. Verify with `wc -l CLAUDE.md`.

- [ ] **Step 2: Verify line count**

Run: `wc -l CLAUDE.md`
Expected: ≤100.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add root CLAUDE.md (agent entry map)"
```

---

### Task 16 · Root `AGENTS.md` (mirror)

**Files:**
- Create: `AGENTS.md`

Mirror of `CLAUDE.md` with agent-flavored phrasing. Maintaining both lets us serve any agent that looks for either name. Same content, slightly different voice.

- [ ] **Step 1: Write `AGENTS.md`**

```markdown
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

## Progressive disclosure

If it's not linked from this map, it doesn't exist for you. Follow links into
`docs/` and per-package maps. Don't go reading the whole repo.

## Quality gates (the only "done")
1. `pnpm typecheck`     — exit 0
2. `pnpm lint`          — exit 0, zero warnings
3. `pnpm format`        — exit 0
4. `pnpm test`          — exit 0
5. Reviewer verdict 10/10 (review protocol)
```

- [ ] **Step 2: Verify line count**

Run: `wc -l AGENTS.md`
Expected: ≤100.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add root AGENTS.md mirror"
```

---

### Task 17 · Per-package maps for `@dycode/contracts`

**Files:**
- Create: `packages/contracts/CLAUDE.md`
- Create: `packages/contracts/AGENTS.md`

- [ ] **Step 1: Write `packages/contracts/CLAUDE.md`**

```markdown
# @dycode/contracts — agent map

> Shared Zod schemas and inferred TypeScript types for dycode IPC, the adapter SDK,
> and the domain model. Imported by `dycoded`, the Electron renderer, and all adapters.
> ≤100 lines.

## Responsibility
Single source of truth for:
- WebSocket JSON-RPC request/response/notification shapes (added in Plan 02)
- Adapter SDK contract types (Plan 02)
- Domain entities: Workspace, Agent, Squad, Pool (derived), Task, EventLogEntry (Plan 02)

## Current state (Plan 01)
Stub only. Exports a `CONTRACTS_VERSION` constant. Real schemas land in Plan 02.

## Files
- `src/index.ts`    — public barrel; re-exports everything
- `src/version.ts`  — semver string of the contracts surface
- `tests/*.test.ts` — Vitest unit tests

## How to add a schema (Plan 02+)
1. Create `src/<area>/<entity>.schema.ts` exporting `<Entity>Schema` (Zod) and `type <Entity>`.
2. Re-export from `src/index.ts`.
3. Add a test under `tests/<area>/<entity>.test.ts` proving the schema accepts valid
   examples and rejects 1–2 invalid ones.
4. Bump `CONTRACTS_VERSION` minor.

## Build / test
```bash
pnpm --filter @dycode/contracts typecheck
pnpm --filter @dycode/contracts test
pnpm --filter @dycode/contracts build
```

## Versioning
- 0.x = pre-stable.
- Bump **major** on any breaking change to a public type or schema.
- Bump **minor** for additive changes.
- Bump **patch** for fixes that don't change shape.

## Linked design
- `../../docs/superpowers/specs/2026-05-23-dycode-design.md` §6 (IPC), §5 (adapter SDK)
```

- [ ] **Step 2: Write `packages/contracts/AGENTS.md`**

```markdown
# AGENTS — @dycode/contracts

> Shared Zod schemas + TS types. Imported by daemon, renderer, and adapters.
> ≤100 lines.

## What lives here
Schemas and types for IPC, adapter SDK, and the domain model. Currently a stub
exporting `CONTRACTS_VERSION` (Plan 01). Real shapes added in Plan 02.

## Add a schema
1. `src/<area>/<entity>.schema.ts` — export `<Entity>Schema` (Zod) + `type <Entity>`
2. Re-export from `src/index.ts`
3. Test: `tests/<area>/<entity>.test.ts` — accept valid, reject invalid examples
4. Bump `CONTRACTS_VERSION` (minor for additive)

## Commands
```bash
pnpm --filter @dycode/contracts typecheck
pnpm --filter @dycode/contracts test
pnpm --filter @dycode/contracts build
```

## Rules
- Schemas drive types via `z.infer<typeof Schema>`. Never hand-write a type that has a schema.
- Public exports go through `src/index.ts`. No deep imports from consumers.
- Each schema gets at least one happy-path test and one rejection test.

## Linked design
- Design spec §5 (Adapter SDK), §6 (IPC + domain model) — `../../docs/superpowers/specs/2026-05-23-dycode-design.md`
```

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/CLAUDE.md packages/contracts/AGENTS.md
git commit -m "docs(contracts): add per-package CLAUDE.md and AGENTS.md maps"
```

---

### Task 18 · `feature_list.json` seed

**Files:**
- Create: `feature_list.json`

- [ ] **Step 1: Write `feature_list.json`**

```json
[
  {
    "id": "F01",
    "behavior": "Monorepo bootstraps with pnpm + Turborepo; pnpm install completes cleanly.",
    "verification": "pnpm install --frozen-lockfile",
    "state": "passing",
    "evidence": "Plan 01 · Task 01",
    "blocked_by": null
  },
  {
    "id": "F02",
    "behavior": "verify.sh passes gates 1-4 (typecheck, lint, format, test) on the stub @dycode/contracts package.",
    "verification": "bash scripts/verify.sh",
    "state": "passing",
    "evidence": "Plan 01 · Task 13",
    "blocked_by": null
  },
  {
    "id": "F03",
    "behavior": "CI workflow runs verify.sh on push and PR and reports green.",
    "verification": "GitHub Actions workflow `CI` reports success on main",
    "state": "not_started",
    "evidence": null,
    "blocked_by": null
  }
]
```

After Plan 01 completes and CI is green, flip F03's state to `passing` (Task 20).

- [ ] **Step 2: Commit**

```bash
git add feature_list.json
git commit -m "docs: seed feature_list.json with Plan 01 features"
```

---

### Task 19 · `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `PROGRESS.md`

**Files:**
- Create: `CONTRIBUTING.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `SECURITY.md`
- Create: `PROGRESS.md`

- [ ] **Step 1: Write `CONTRIBUTING.md`**

```markdown
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

## Adapters

Adapter authoring guide lives at `docs/tutorials/adapter-quickstart.md` (added in Plan 02+).
Built-in adapters live in `adapters/<id>/` (`@dycode/adapter-<id>`). Community adapters
publish as `dycode-adapter-<id>`.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). We follow the Contributor Covenant v2.1.

## Security

See [SECURITY.md](SECURITY.md) for reporting.
```

- [ ] **Step 2: Write `CODE_OF_CONDUCT.md`** (Contributor Covenant 2.1, short notice form)

```markdown
# Contributor Covenant Code of Conduct

This project adopts the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)
as its Code of Conduct.

By participating, you agree to abide by its terms. Reports of unacceptable behavior may be
sent to the maintainers via the channel listed in `SECURITY.md` (private contact). All
complaints will be reviewed and investigated promptly and fairly.

The full text is available at
<https://www.contributor-covenant.org/version/2/1/code_of_conduct/>.
```

- [ ] **Step 3: Write `SECURITY.md`**

```markdown
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
```

- [ ] **Step 4: Write `PROGRESS.md`** (per-branch session log seed)

```markdown
# PROGRESS

Per-branch session log. Append entries below; each entry is date-stamped and lists what
was done, what remains, and any blockers. **End of session = clean state**: anything
in-progress becomes either a follow-up task in `feature_list.json` or a TODO with an
owner.

---

## 2026-05-23 · Plan 01 · Project Foundation

Done:
- Initialized monorepo (pnpm + Turborepo, TS 5.7, ESLint 9, Prettier 3, Vitest 2).
- Stub `@dycode/contracts` package with `CONTRACTS_VERSION` + tests passing.
- `scripts/init.sh` and `scripts/verify.sh` operational.
- GitHub Actions CI workflow scaffolded.
- Root `CLAUDE.md` + `AGENTS.md` maps; per-package maps for `contracts`.
- `feature_list.json` seeded (F01, F02 passing; F03 flips after first green CI run).

Remaining (deferred to later plans):
- Real Zod schemas in `@dycode/contracts` (Plan 02).
- Adapter SDK package (Plan 02).
- Daemon and adapters (Plan 03+).
- Electron shell (Plan 05+).

Blockers:
- None.
```

- [ ] **Step 5: Commit**

```bash
git add CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md PROGRESS.md
git commit -m "docs: add governance docs (CONTRIBUTING/COC/SECURITY/PROGRESS)"
```

---

### Task 20 · End-to-end smoke + push + verify CI green

**Files:** none new; this task verifies and ships.

- [ ] **Step 1: Run end-to-end smoke locally**

Run, in order:

```bash
./scripts/init.sh
./scripts/verify.sh
```

Expected output for `verify.sh`:

```
── GATE 1 / 5 · typecheck         (passes)
── GATE 2 / 5 · lint              (passes, zero warnings)
── GATE 3 / 5 · format check      (passes)
── GATE 4 / 5 · tests             (3 passing in @dycode/contracts)

✓ verify passed gates 1–4. Gate 5 (reviewer 10/10) is enforced by review protocol.
```

If any gate fails, fix the underlying cause. Do not bypass.

- [ ] **Step 2: Ensure remote exists (skip if you haven't created one yet)**

This step is for an engineer who already has a GitHub remote. If not, create the repo via `gh repo create dycode --public --source=. --remote=origin --description "Open-source multi-agent orchestration IDE"` (requires `gh` auth). If you can't create the remote yet, skip to Step 4 — Plan 01 still completes locally and you can push later.

- [ ] **Step 3: Push and watch CI**

Run:

```bash
git push -u origin main
```

Then watch the workflow:

```bash
gh run watch
```

Expected: the `CI` workflow's `verify` job succeeds end-to-end (gates 1–4 pass).

- [ ] **Step 4: Flip F03 to `passing` and commit**

Edit `feature_list.json`: change F03's `state` from `"not_started"` to `"passing"` and set `evidence` to the CI run URL (or run id) for posterity.

```bash
git add feature_list.json
git commit -m "chore: F03 — CI verified green"
git push
```

- [ ] **Step 5: Tag the milestone**

```bash
git tag -a v0.0.1-plan-01 -m "Plan 01 milestone: foundation complete"
git push origin v0.0.1-plan-01
```

- [ ] **Step 6: Update PROGRESS.md to close out the session**

Append to `PROGRESS.md`:

```markdown
## 2026-05-23 · Plan 01 closed

- All tasks complete. Verify green locally and in CI. Tagged `v0.0.1-plan-01`.
- Next plan: Plan 02 — `@dycode/contracts` real Zod schemas + `@dycode/adapter-sdk` package.
```

Commit:

```bash
git add PROGRESS.md
git commit -m "docs(progress): close Plan 01"
git push
```

---

## Self-review (run before declaring Plan 01 done)

| Spec requirement                                                | Where covered                  |
| --------------------------------------------------------------- | ------------------------------ |
| pnpm + Turborepo monorepo (§1 foundation, §8 layout)            | Tasks 01, 07                   |
| TypeScript strict (§3, §6.5)                                    | Task 04                        |
| ESLint + Prettier (§9.3 gates 2 + 3)                            | Tasks 05, 06                   |
| Vitest 2 (§9.3 gate 4)                                          | Task 08                        |
| `@dycode/contracts` package scaffold (§6.5)                     | Tasks 09–11                    |
| `init.sh` (environment subsystem · §4.2)                        | Task 12                        |
| `verify.sh` 5-gate pipeline (§9.3)                              | Task 13                        |
| GitHub Actions CI matching local (§9.3)                         | Task 14                        |
| Root `CLAUDE.md` ≤100 lines + TOC pattern (§4.6, §9.1)          | Task 15                        |
| Root `AGENTS.md` mirror (§9.1)                                  | Task 16                        |
| Per-package maps (§9.1, §9.5)                                   | Task 17                        |
| `feature_list.json` schema + seed (§9.7)                        | Task 18                        |
| `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` (§9.8)   | Task 19                        |
| `PROGRESS.md` per branch (§9.6)                                 | Tasks 19, 20                   |
| Apache 2.0 license (§1)                                         | Task 03                        |
| `feature_list.json` F01/F02/F03 reflecting Plan 01 deliverables | Tasks 18, 20                   |

Items deferred to later plans (not gaps in Plan 01):
- Real Zod schemas in contracts → Plan 02
- Adapter SDK package → Plan 02
- Daemon `dycoded` → Plan 03
- Built-in adapters → Plan 03 (first) and Plan 06 (rest)
- Electron app → Plan 05
- Packaging / docs site / public beta → Plan 07

## What "done" looks like for Plan 01

- `./scripts/verify.sh` exits 0 locally on a clean clone.
- `gh run watch` reports the `CI` workflow green for the latest push to `main`.
- The repository tree matches the **File structure** section above.
- All 20 tasks have checkboxes ticked.
- `feature_list.json` F01, F02, F03 are all `"passing"`.
- `PROGRESS.md` has a closing entry.
- Tag `v0.0.1-plan-01` exists on `main`.

Once these are all true, Plan 01 is complete and Plan 02 can begin.
