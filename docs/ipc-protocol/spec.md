# IPC Protocol · WebSocket JSON-RPC 2.0

> The wire contract between any client (Electron renderer, future web/mobile companion) and `dycoded`. Source of truth lives in `@dycode/contracts`.

## Transport

`ws://127.0.0.1:<port>/ws` · bearer auth from `~/.dycode/auth.json` (mode 0600) · one JSON message per WS frame.

## Envelope

| Shape        | Source                                                                     |
| ------------ | -------------------------------------------------------------------------- |
| Request      | `packages/contracts/src/ipc/envelope.ts` → `JsonRpcRequestEnvelopeSchema`  |
| Response     | same → `JsonRpcResponseEnvelopeSchema` (exactly one of `result` / `error`) |
| Error codes  | same → `ERROR_CODE` (JSON-RPC 2.0 + dycode extensions in -32099..-32095)   |
| Notification | `packages/contracts/src/ipc/notifications.ts` → `NotificationSchema`       |

## Versioning

Every request carries `protocolVersion: 1`. Mismatches return error code `PROTOCOL_VERSION_MISMATCH (-32099)`.

## Methods (29)

Canonical list: `MethodName` from `packages/contracts/src/ipc/methods.ts`.

| Area                  | Source file                                       | Methods                                                                                                                                                 |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspaces            | `packages/contracts/src/ipc/methods.workspace.ts` | `workspace.list`, `workspace.add`, `workspace.activate`, `workspace.remove`                                                                             |
| Runtime + adapters    | `packages/contracts/src/ipc/methods.runtime.ts`   | `runtime.scan`, `adapter.list`, `adapter.install`, `adapter.uninstall`, `adapter.configure`                                                             |
| Fleet (squads + pool) | `packages/contracts/src/ipc/methods.fleet.ts`     | `squad.create`, `squad.delete`, `squad.rename`, `squad.addMember`, `squad.removeMember`, `squad.setLeader`, `pool.list`, `pool.promote`, `pool.release` |
| Tasks                 | `packages/contracts/src/ipc/methods.task.ts`      | `task.create`, `task.cancel`, `task.list`, `task.get`, `task.assign`, `task.requestReview`, `task.submitReviewVerdict`, `task.run`, `task.replay`       |
| Events                | `packages/contracts/src/ipc/methods.events.ts`    | `events.subscribe`, `events.unsubscribe`, `events.query`                                                                                                |

Each file exports `<method>_paramsSchema` and `<method>_resultSchema` (dots replaced with underscores).

## Notifications

Server-pushed. Five variants in `NotificationSchema`:

- `event.appended` — new `EventLogEntry`
- `task.stateChanged` — `{ taskId, from, to }`
- `agent.statusChanged` — `{ agentId, status }`
- `squad.changed` — `{ squadId }`
- `runtime.detected` — `{ newAdapters: AdapterId[] }`

## Subscriptions

Filter by `{ workspaceId?, taskId?, squadId?, agentId? }`. Returns an opaque `subscriptionId`. Unsubscribe via `events.unsubscribe`.

## Related

- Spec §6: `../superpowers/specs/2026-05-23-dycode-design.md`
- Adapter SDK: `../adapters/sdk.md`
- Per-package map: `../../packages/contracts/CLAUDE.md`
