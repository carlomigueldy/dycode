import type { AgentId, WorkspaceId, TaskId } from '@dycode/contracts'

/**
 * Per-task context handed to an AdapterInstance.start().
 * Read-only from the adapter's perspective.
 */
export interface TaskCtx {
  readonly workspaceId: WorkspaceId
  readonly agentId: AgentId
  readonly taskId: TaskId
  /** Absolute filesystem path to the active workspace root. */
  readonly workspaceRoot: string
  /** Environment variables the adapter may read. Already filtered by the daemon. */
  readonly env: Readonly<Record<string, string>>
  /**
   * AbortSignal that fires when the task is cancelled or the adapter
   * instance is being disposed.
   */
  readonly signal: AbortSignal
}

/**
 * Options for AdapterPlugin.create() — once per adapter *instance*.
 * The instance is reused across .start() invocations.
 */
export interface CreateOpts {
  /** Absolute filesystem path to the workspace this instance is bound to. */
  readonly workspaceRoot: string
  /** Environment variables the daemon allows the adapter to see. */
  readonly env: Readonly<Record<string, string>>
  /** User-provided config, validated against the adapter's manifest.configSchema (if any). */
  readonly config: Readonly<Record<string, unknown>>
}

/**
 * The prompt object sent to an instance.start().
 * Adapters MAY accept additional structured metadata via the `metadata` slot.
 */
export interface Prompt {
  /** Primary instruction the adapter should act on. */
  readonly text: string
  /** Optional structured context (e.g., touched files, prior agent's summary). */
  readonly metadata?: Readonly<Record<string, unknown>>
}
