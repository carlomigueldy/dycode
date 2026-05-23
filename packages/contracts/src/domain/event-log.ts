import { z } from 'zod'
import { AgentIdSchema, TaskIdSchema, WorkspaceIdSchema } from '../ids.js'

export const ADAPTER_EVENT_KINDS = [
  'output',
  'tool_call',
  'tool_result',
  'progress',
  'verify_request',
  'done',
  'error',
] as const
export const AdapterEventKindSchema = z.enum(ADAPTER_EVENT_KINDS)
export type AdapterEventKind = z.infer<typeof AdapterEventKindSchema>

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

export const EventLogEntrySchema = z
  .object({
    id: z.string().regex(ULID_RE, 'id must be a 26-char Crockford-base32 ULID'),
    ts: z.number().int().nonnegative(),
    workspaceId: WorkspaceIdSchema,
    taskId: TaskIdSchema.nullable(),
    agentId: AgentIdSchema.nullable(),
    type: AdapterEventKindSchema,
    payload: z.record(z.unknown()),
  })
  .strict()

export type EventLogEntry = z.infer<typeof EventLogEntrySchema>
