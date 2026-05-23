import { z } from 'zod'
import { AgentIdSchema, SquadIdSchema, TaskIdSchema, WorkspaceIdSchema } from '../ids.js'
import { EventLogEntrySchema } from '../domain/event-log.js'

const EventFilterSchema = z
  .object({
    workspaceId: WorkspaceIdSchema.optional(),
    taskId: TaskIdSchema.optional(),
    squadId: SquadIdSchema.optional(),
    agentId: AgentIdSchema.optional(),
  })
  .strict()

export const events_subscribe_paramsSchema = z
  .object({ filter: EventFilterSchema.optional() })
  .strict()
export const events_subscribe_resultSchema = z
  .object({ subscriptionId: z.string().min(1) })
  .strict()

export const events_unsubscribe_paramsSchema = z
  .object({ subscriptionId: z.string().min(1) })
  .strict()
export const events_unsubscribe_resultSchema = z.object({ ok: z.literal(true) }).strict()

export const events_query_paramsSchema = z
  .object({
    workspaceId: WorkspaceIdSchema,
    taskId: TaskIdSchema.optional(),
    agentId: AgentIdSchema.optional(),
    sinceTs: z.number().int().nonnegative().optional(),
    limit: z.number().int().positive().max(1000).optional(),
    cursor: z.string().optional(),
  })
  .strict()
export const events_query_resultSchema = z
  .object({
    events: z.array(EventLogEntrySchema),
    nextCursor: z.string().nullable(),
  })
  .strict()
