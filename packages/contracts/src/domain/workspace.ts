import { z } from 'zod'
import { WorkspaceIdSchema } from '../ids.js'

const WorkspaceSettingsSchema = z
  .object({
    defaultBranch: z.string().min(1).optional(),
    instructionsPath: z.string().min(1).optional(),
  })
  .strict()
  .default({})

export const WorkspaceSchema = z
  .object({
    id: WorkspaceIdSchema,
    name: z.string().min(1, 'workspace name must not be empty'),
    rootPath: z
      .string()
      .min(1)
      .refine((p) => p.startsWith('/'), {
        message: 'rootPath must be absolute (start with "/")',
      }),
    settings: WorkspaceSettingsSchema,
    createdAt: z.number().int().nonnegative(),
    lastActiveAt: z.number().int().nonnegative(),
  })
  .strict()

export type WorkspaceSettings = z.infer<typeof WorkspaceSettingsSchema>
export type Workspace = z.infer<typeof WorkspaceSchema>
