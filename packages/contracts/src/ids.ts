import { z } from 'zod'

/**
 * dycode IDs are ULIDs (26-char Crockford base32) prefixed with a
 * 2-letter domain tag, e.g. `ws_01ARZ3NDEKTSV4RRFFQ69G5FAV`.
 *
 * Branding via Zod prevents accidental cross-domain assignment.
 */
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

function makeIdSchema<TBrand extends string>(prefix: string, _brand: TBrand) {
  return z
    .string()
    .refine((s) => s.startsWith(`${prefix}_`), {
      message: `must start with "${prefix}_"`,
    })
    .refine((s) => ULID_RE.test(s.slice(prefix.length + 1)), {
      message: 'suffix must be a ULID (26-char Crockford base32)',
    })
    .brand<TBrand>()
}

export const WorkspaceIdSchema = makeIdSchema('ws', 'WorkspaceId')
export const AgentIdSchema = makeIdSchema('ag', 'AgentId')
export const SquadIdSchema = makeIdSchema('sq', 'SquadId')
export const TaskIdSchema = makeIdSchema('tk', 'TaskId')

export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>
export type AgentId = z.infer<typeof AgentIdSchema>
export type SquadId = z.infer<typeof SquadIdSchema>
export type TaskId = z.infer<typeof TaskIdSchema>

export const isWorkspaceId = (v: unknown): v is WorkspaceId =>
  WorkspaceIdSchema.safeParse(v).success
export const isAgentId = (v: unknown): v is AgentId => AgentIdSchema.safeParse(v).success
export const isSquadId = (v: unknown): v is SquadId => SquadIdSchema.safeParse(v).success
export const isTaskId = (v: unknown): v is TaskId => TaskIdSchema.safeParse(v).success
