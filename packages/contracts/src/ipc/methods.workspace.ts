import { z } from 'zod'
import { WorkspaceIdSchema } from '../ids.js'
import { WorkspaceSchema } from '../domain/workspace.js'

const OkSchema = z.object({ ok: z.literal(true) }).strict()

export const workspace_list_paramsSchema = z.object({}).strict()
export const workspace_list_resultSchema = z
  .object({ workspaces: z.array(WorkspaceSchema) })
  .strict()

export const workspace_add_paramsSchema = z
  .object({
    name: z.string().min(1),
    rootPath: z
      .string()
      .min(1)
      .refine((p) => p.startsWith('/'), 'rootPath must be absolute'),
  })
  .strict()
export const workspace_add_resultSchema = z.object({ workspace: WorkspaceSchema }).strict()

export const workspace_activate_paramsSchema = z.object({ workspaceId: WorkspaceIdSchema }).strict()
export const workspace_activate_resultSchema = OkSchema

export const workspace_remove_paramsSchema = z.object({ workspaceId: WorkspaceIdSchema }).strict()
export const workspace_remove_resultSchema = OkSchema
