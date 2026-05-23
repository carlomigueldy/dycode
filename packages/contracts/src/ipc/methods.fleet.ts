import { z } from 'zod'
import { AgentIdSchema, SquadIdSchema, WorkspaceIdSchema } from '../ids.js'
import { SquadSchema } from '../domain/squad.js'

const OkSchema = z.object({ ok: z.literal(true) }).strict()

export const squad_create_paramsSchema = z
  .object({ workspaceId: WorkspaceIdSchema, name: z.string().min(1) })
  .strict()
export const squad_create_resultSchema = z.object({ squad: SquadSchema }).strict()

export const squad_delete_paramsSchema = z.object({ squadId: SquadIdSchema }).strict()
export const squad_delete_resultSchema = OkSchema

export const squad_rename_paramsSchema = z
  .object({ squadId: SquadIdSchema, name: z.string().min(1) })
  .strict()
export const squad_rename_resultSchema = OkSchema

export const squad_addMember_paramsSchema = z
  .object({ squadId: SquadIdSchema, agentId: AgentIdSchema })
  .strict()
export const squad_addMember_resultSchema = OkSchema

export const squad_removeMember_paramsSchema = squad_addMember_paramsSchema
export const squad_removeMember_resultSchema = OkSchema

export const squad_setLeader_paramsSchema = z
  .object({ squadId: SquadIdSchema, agentId: AgentIdSchema.nullable() })
  .strict()
export const squad_setLeader_resultSchema = OkSchema

export const pool_list_paramsSchema = z.object({ workspaceId: WorkspaceIdSchema }).strict()
export const pool_list_resultSchema = z.object({ agentIds: z.array(AgentIdSchema) }).strict()

export const pool_promote_paramsSchema = z
  .object({ squadId: SquadIdSchema, agentId: AgentIdSchema })
  .strict()
export const pool_promote_resultSchema = OkSchema

export const pool_release_paramsSchema = z.object({ agentId: AgentIdSchema }).strict()
export const pool_release_resultSchema = OkSchema
