import { z } from 'zod'
import { CapabilitySchema } from './capability.js'
import { AgentIdSchema, TaskIdSchema, WorkspaceIdSchema } from '../ids.js'

export const AGENT_STATUSES = [
  'idle',
  'busy',
  'queued',
  'blocked',
  'unhealthy',
  'uninstalled',
  'auth_required',
] as const

export const AgentStatusSchema = z.enum(AGENT_STATUSES)
export type AgentStatus = z.infer<typeof AgentStatusSchema>

export const AgentSchema = z
  .object({
    id: AgentIdSchema,
    workspaceId: WorkspaceIdSchema,
    adapterId: z.string().min(1),
    adapterVersion: z.string().min(1),
    displayName: z.string().min(1),
    capabilities: z.array(CapabilitySchema).refine((arr) => new Set(arr).size === arr.length, {
      message: 'capabilities must be unique',
    }),
    config: z.record(z.unknown()).default({}),
    status: AgentStatusSchema,
    currentTaskId: TaskIdSchema.nullable(),
  })
  .strict()

export type Agent = z.infer<typeof AgentSchema>
