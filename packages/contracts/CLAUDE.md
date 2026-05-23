# @dycode/contracts — agent map

> Shared Zod schemas and inferred TypeScript types for dycode IPC, the adapter SDK,
> and the domain model. Imported by `dycoded`, the Electron renderer, and all adapters.
> ≤100 lines.

## Responsibility

Single source of truth for:

- WebSocket JSON-RPC 2.0 envelopes + dycode error codes
- The 30 `MethodName` literals and per-method params/result Zod schemas
- 5 server-pushed `Notification` variants
- Branded ULID-typed IDs (Workspace/Agent/Squad/Task)
- Domain entities: Workspace, Agent (+ AgentStatus), Capability, Squad, Task
  (+ state machine, ReviewVerdict, TaskEvidence), EventLogEntry, AdapterEventKind

## Current state (Plan 02 · v0.1.0)

Full surface shipped. Schemas drive types via `z.infer`. Consumers
(`@dycode/adapter-sdk`, future `dycoded`, future renderer) import from the
package barrel — no deep imports.

## Layout

- `src/version.ts` — `CONTRACTS_VERSION`
- `src/ids.ts` — branded ULID-typed IDs + `isXxx` type guards
- `src/domain/`
  - `capability.ts` — `CAPABILITIES` (10) + `CapabilitySchema`
  - `workspace.ts` — `WorkspaceSchema`
  - `agent.ts` — `AGENT_STATUSES` (7) + `AgentSchema` + `AgentStatusSchema`
  - `squad.ts` — `SquadSchema` (leader-in-members invariant)
  - `task.ts` — `TaskSchema` + `TASK_STATES` + `ReviewVerdictSchema` + `TaskEvidenceSchema` + `REVIEW_DIMENSIONS`
  - `event-log.ts` — `EventLogEntrySchema` + `ADAPTER_EVENT_KINDS` (7) + `AdapterEventKindSchema`
- `src/ipc/`
  - `envelope.ts` — `JsonRpcRequestEnvelopeSchema`, `JsonRpcResponseEnvelopeSchema`, `ERROR_CODE` (10)
  - `methods.ts` — `METHOD_NAMES` (30) + `MethodNameSchema`
  - `methods.workspace.ts` — `workspace.*` (4 method pairs)
  - `methods.runtime.ts` — `runtime.scan` + `adapter.*` (5 method pairs)
  - `methods.fleet.ts` — `squad.*` + `pool.*` (9 method pairs)
  - `methods.task.ts` — `task.*` (9 method pairs, with worker/checker refinement)
  - `methods.events.ts` — `events.subscribe/unsubscribe/query`
  - `notifications.ts` — `NotificationSchema` discriminated union (5 variants)
- `src/index.ts` — public barrel; everything goes through here
- `tests/` — Vitest unit tests (mirror `src/` layout)

## How to add a schema

1. Create `src/<area>/<entity>.ts` exporting `<Entity>Schema` (Zod) and `type <Entity> = z.infer<...>`.
2. Re-export from `src/index.ts` in the same PR.
3. Add `tests/<area>/<entity>.test.ts` proving the schema accepts valid examples
   and rejects 1-2 invalid ones.
4. Bump `CONTRACTS_VERSION` minor for additive changes.

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

- Design spec §5 (Adapter SDK) and §6 (IPC + domain model):
  `../../docs/superpowers/specs/2026-05-23-dycode-design.md`
- Adapter SDK deep doc: `../../docs/adapters/sdk.md`
- IPC protocol deep doc: `../../docs/ipc-protocol/spec.md`
