import { z } from 'zod'
import { AgentIdSchema, SquadIdSchema, TaskIdSchema, WorkspaceIdSchema } from '../ids.js'

export const TASK_STATES = ['not_started', 'active', 'passing', 'blocked'] as const
export const TaskStateSchema = z.enum(TASK_STATES)
export type TaskState = z.infer<typeof TaskStateSchema>

export const REVIEW_DIMENSIONS = [
  'consistency',
  'scalability',
  'maintainability',
  'correctness',
] as const
export type ReviewDimension = (typeof REVIEW_DIMENSIONS)[number]

const ReviewScoreSchema = z.number().int().min(0).max(10)

export const ReviewVerdictSchema = z
  .object({
    score: ReviewScoreSchema,
    notes: z.string().min(1),
    reviewerId: AgentIdSchema,
  })
  .strict()
export type ReviewVerdict = z.infer<typeof ReviewVerdictSchema>

const TsSchema = z.number().int().nonnegative()

export const TaskEvidenceSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('commit'),
      sha: z.string().min(1),
      message: z.string().min(1),
      ts: TsSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('verify_run'),
      cmd: z.string().min(1),
      exitCode: z.number().int(),
      logRef: z.string().min(1),
      ts: TsSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('review'),
      reviewerId: AgentIdSchema,
      score: ReviewScoreSchema,
      notes: z.string().min(1),
      ts: TsSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('handoff'),
      fromAgentId: AgentIdSchema,
      toAgentId: AgentIdSchema,
      ts: TsSchema,
    })
    .strict(),
])
export type TaskEvidence = z.infer<typeof TaskEvidenceSchema>

const TaskScopeSchema = z
  .object({
    paths: z.array(z.string().min(1)),
    touchedFiles: z.array(z.string().min(1)),
  })
  .strict()
export type TaskScope = z.infer<typeof TaskScopeSchema>

export const TaskSchema = z
  .object({
    id: TaskIdSchema,
    workspaceId: WorkspaceIdSchema,
    squadId: SquadIdSchema.nullable(),
    assigneeId: AgentIdSchema.nullable(),
    reviewerId: AgentIdSchema.nullable(),
    parentTaskId: TaskIdSchema.nullable(),
    title: z.string().min(1),
    behavior: z.string().min(1),
    verification: z.string().min(1),
    state: TaskStateSchema,
    reviewVerdict: ReviewVerdictSchema.nullable(),
    scope: TaskScopeSchema,
    evidence: z.array(TaskEvidenceSchema),
    createdAt: TsSchema,
    startedAt: TsSchema.nullable(),
    completedAt: TsSchema.nullable(),
  })
  .strict()
  .refine((t) => t.assigneeId === null || t.reviewerId === null || t.assigneeId !== t.reviewerId, {
    message: 'assigneeId and reviewerId must differ (worker/checker separation)',
    path: ['reviewerId'],
  })
export type Task = z.infer<typeof TaskSchema>
