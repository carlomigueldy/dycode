import type { AdapterManifest } from './manifest.js'
import type { AdapterEvent } from './events.js'
import type { CreateOpts, Prompt, TaskCtx } from './context.js'
import type { DetectionResult, HealthReport } from './health.js'

/**
 * What an adapter author exports as `default`.
 *
 * Lifecycle:
 *  1. dycoded loads the module, reads `manifest`.
 *  2. dycoded calls `detect()` once at boot (and on user request) to find out
 *     whether the underlying CLI is installed and which version.
 *  3. When the user activates this adapter in a workspace, dycoded calls
 *     `create(opts)` once to get an AdapterInstance.
 *  4. For each task assigned to that instance, dycoded calls
 *     `instance.start(prompt, ctx)` and consumes the AsyncIterable of events.
 *  5. dycoded periodically calls `instance.health()` (default every 30s).
 *  6. On workspace close or app shutdown, dycoded calls `instance.dispose()`.
 */
export interface AdapterPlugin {
  readonly manifest: AdapterManifest
  detect(): Promise<DetectionResult>
  create(opts: CreateOpts): AdapterInstance
}

export interface AdapterInstance {
  /**
   * Start work on a prompt. Returns an AsyncIterable of AdapterEvents
   * the daemon will stream into the event log + IPC.
   *
   * The iterable MUST terminate with a single `done` event.
   * An `error` event followed by `done(status: 'error')` is the canonical
   * failure path.
   */
  start(prompt: Prompt, ctx: TaskCtx): AsyncIterable<AdapterEvent>

  /**
   * Cancel any in-flight work and clean up. Resolves once the underlying
   * CLI process has exited (or been killed).
   */
  cancel(reason: string): Promise<void>

  /**
   * Probe the adapter's health. Called periodically by the daemon.
   * Should not block on the underlying CLI; resolve fast.
   */
  health(): Promise<HealthReport>

  /**
   * Final cleanup. Called once when the instance will no longer be used.
   * Implementations should release file handles, kill child processes, etc.
   */
  dispose(): Promise<void>
}
