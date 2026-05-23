import { z } from 'zod'
import { CapabilitySchema } from '@dycode/contracts'

export const AdapterManifestSchema = z
  .object({
    id: z.string().min(1),
    displayName: z.string().min(1),
    vendor: z.string().min(1),
    apiVersion: z.literal(1),
    capabilities: z.array(CapabilitySchema).refine((arr) => new Set(arr).size === arr.length, {
      message: 'capabilities must be unique',
    }),
    iconUrl: z.string().url().optional(),
  })
  .strict()

export type AdapterManifest = z.infer<typeof AdapterManifestSchema>
