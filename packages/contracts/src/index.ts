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
