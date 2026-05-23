// Versioning
export { CONTRACTS_VERSION } from './version.js'

// Branded IDs
export {
  AgentIdSchema,
  isAgentId,
  isSquadId,
  isTaskId,
  isWorkspaceId,
  SquadIdSchema,
  TaskIdSchema,
  WorkspaceIdSchema,
} from './ids.js'
export type { AgentId, SquadId, TaskId, WorkspaceId } from './ids.js'

// Domain — capability
export { CAPABILITIES, CapabilitySchema } from './domain/capability.js'
export type { Capability } from './domain/capability.js'

// Domain — workspace
export { WorkspaceSchema } from './domain/workspace.js'
export type { Workspace, WorkspaceSettings } from './domain/workspace.js'

// Domain — agent
export { AGENT_STATUSES, AgentSchema, AgentStatusSchema } from './domain/agent.js'
export type { Agent, AgentStatus } from './domain/agent.js'

// Domain — squad
export { SquadSchema } from './domain/squad.js'
export type { Squad } from './domain/squad.js'

// Domain — task
export {
  REVIEW_DIMENSIONS,
  ReviewVerdictSchema,
  TASK_STATES,
  TaskEvidenceSchema,
  TaskSchema,
  TaskStateSchema,
} from './domain/task.js'
export type {
  ReviewDimension,
  ReviewVerdict,
  Task,
  TaskEvidence,
  TaskScope,
  TaskState,
} from './domain/task.js'

// Domain — event log
export {
  ADAPTER_EVENT_KINDS,
  AdapterEventKindSchema,
  EventLogEntrySchema,
} from './domain/event-log.js'
export type { AdapterEventKind, EventLogEntry } from './domain/event-log.js'
