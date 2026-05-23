import { z } from 'zod'
import { AgentIdSchema, SquadIdSchema, WorkspaceIdSchema } from '../ids.js'

export const SquadSchema = z
  .object({
    id: SquadIdSchema,
    workspaceId: WorkspaceIdSchema,
    name: z.string().min(1, 'squad name must not be empty'),
    leaderAgentId: AgentIdSchema.nullable(),
    memberAgentIds: z.array(AgentIdSchema).refine((arr) => new Set(arr).size === arr.length, {
      message: 'memberAgentIds must be unique',
    }),
    createdAt: z.number().int().nonnegative(),
  })
  .strict()
  .refine((s) => s.leaderAgentId === null || s.memberAgentIds.includes(s.leaderAgentId), {
    message: 'leaderAgentId must appear in memberAgentIds',
    path: ['leaderAgentId'],
  })

export type Squad = z.infer<typeof SquadSchema>
