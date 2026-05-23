/**
 * Result of a periodic health probe on a live AdapterInstance.
 * Returned by AdapterInstance.health().
 */
export interface HealthReport {
  /** True if the adapter is currently able to accept work. */
  readonly healthy: boolean
  /** Human-readable status (logged + surfaced in UI). */
  readonly message?: string
  /** Optional structured detail (e.g., quota, last-error). */
  readonly detail?: Readonly<Record<string, unknown>>
  /** Unix ms timestamp when the report was taken. */
  readonly ts: number
}

/**
 * Result of AdapterPlugin.detect() — does this CLI exist on the host?
 */
export interface DetectionResult {
  /** True if the CLI was found and is usable. */
  readonly installed: boolean
  /** Resolved version string, if installed. */
  readonly version?: string
  /** Absolute path to the CLI, if installed. */
  readonly path?: string
  /** Human-readable reason if not installed (e.g., "not on PATH"). */
  readonly reason?: string
}
