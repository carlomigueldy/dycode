import { z } from 'zod'
import { AgentIdSchema, SquadIdSchema, TaskIdSchema, WorkspaceIdSchema } from '../ids.js'
import { ReviewVerdictSchema, TaskSchema, TaskStateSchema } from '../domain/task.js'
import { EventLogEntrySchema } from '../domain/event-log.js'

const OkSchema = z.object({ ok: z.literal(true) }).strict()

const TaskScopeSchema = z
  .object({
    paths: z.array(z.string().min(1)),
    touchedFiles: z.array(z.string().min(1)),
  })
  .strict()

export const task_create_paramsSchema = z
  .object({
    workspaceId: WorkspaceIdSchema,
    squadId: SquadIdSchema.nullable(),
    parentTaskId: TaskIdSchema.nullable(),
    title: z.string().min(1),
    behavior: z.string().min(1),
    verification: z.string().min(1),
    scope: TaskScopeSchema,
  })
  .strict()
export const task_create_resultSchema = z.object({ taskId: TaskIdSchema }).strict()

export const task_cancel_paramsSchema = z
  .object({ taskId: TaskIdSchema, reason: z.string().min(1) })
  .strict()
export const task_cancel_resultSchema = OkSchema

export const task_list_paramsSchema = z
  .object({
    workspaceId: WorkspaceIdSchema,
    state: TaskStateSchema.optional(),
    squadId: SquadIdSchema.optional(),
    assigneeId: AgentIdSchema.optional(),
  })
  .strict()
export const task_list_resultSchema = z.object({ taskIds: z.array(TaskIdSchema) }).strict()

export const task_get_paramsSchema = z.object({ taskId: TaskIdSchema }).strict()
export const task_get_resultSchema = z.object({ task: TaskSchema }).strict()

export const task_assign_paramsSchema = z
  .object({
    taskId: TaskIdSchema,
    assigneeId: AgentIdSchema,
    reviewerId: AgentIdSchema,
  })
  .strict()
  .refine((p) => p.assigneeId !== p.reviewerId, {
    message: 'assigneeId and reviewerId must differ',
    path: ['reviewerId'],
  })
export const task_assign_resultSchema = OkSchema

export const task_requestReview_paramsSchema = z
  .object({ taskId: TaskIdSchema, reviewerId: AgentIdSchema })
  .strict()
export const task_requestReview_resultSchema = OkSchema

export const task_submitReviewVerdict_paramsSchema = z
  .object({ taskId: TaskIdSchema, verdict: ReviewVerdictSchema })
  .strict()
export const task_submitReviewVerdict_resultSchema = OkSchema

export const task_run_paramsSchema = z.object({ taskId: TaskIdSchema }).strict()
export const task_run_resultSchema = z
  .object({ ok: z.literal(true), runId: z.string().min(1) })
  .strict()

export const task_replay_paramsSchema = z.object({ taskId: TaskIdSchema }).strict()
export const task_replay_resultSchema = z.object({ events: z.array(EventLogEntrySchema) }).strict()
