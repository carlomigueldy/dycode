import { z } from 'zod'
import { AgentIdSchema, SquadIdSchema, TaskIdSchema } from '../ids.js'
import { AgentStatusSchema } from '../domain/agent.js'
import { EventLogEntrySchema } from '../domain/event-log.js'
import { TaskStateSchema } from '../domain/task.js'

const base = (method: string) =>
  z.object({ jsonrpc: z.literal('2.0'), method: z.literal(method) }).passthrough()

export const EventAppendedNotificationSchema = base('event.appended').extend({
  method: z.literal('event.appended'),
  params: EventLogEntrySchema,
})

export const TaskStateChangedNotificationSchema = base('task.stateChanged').extend({
  method: z.literal('task.stateChanged'),
  params: z
    .object({
      taskId: TaskIdSchema,
      from: TaskStateSchema,
      to: TaskStateSchema,
    })
    .strict(),
})

export const AgentStatusChangedNotificationSchema = base('agent.statusChanged').extend({
  method: z.literal('agent.statusChanged'),
  params: z.object({ agentId: AgentIdSchema, status: AgentStatusSchema }).strict(),
})

export const SquadChangedNotificationSchema = base('squad.changed').extend({
  method: z.literal('squad.changed'),
  params: z.object({ squadId: SquadIdSchema }).strict(),
})

export const RuntimeDetectedNotificationSchema = base('runtime.detected').extend({
  method: z.literal('runtime.detected'),
  params: z.object({ newAdapters: z.array(z.string().min(1)) }).strict(),
})

export const NotificationSchema = z.discriminatedUnion('method', [
  EventAppendedNotificationSchema,
  TaskStateChangedNotificationSchema,
  AgentStatusChangedNotificationSchema,
  SquadChangedNotificationSchema,
  RuntimeDetectedNotificationSchema,
])
export type Notification = z.infer<typeof NotificationSchema>
