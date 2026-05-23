export { SDK_VERSION } from './version.js'

// Manifest
export { AdapterManifestSchema } from './manifest.js'
export type { AdapterManifest } from './manifest.js'

// Events
export { AdapterEventSchema } from './events.js'
export type { AdapterEvent } from './events.js'

// Plugin interfaces
export type { AdapterInstance, AdapterPlugin } from './plugin.js'

// Context
export type { CreateOpts, Prompt, TaskCtx } from './context.js'

// Health
export type { DetectionResult, HealthReport } from './health.js'
