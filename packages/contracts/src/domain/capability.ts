import { z } from 'zod'

/**
 * The closed set of capabilities an adapter may declare in its manifest.
 * Order is canonical — used by tests and by tools that render lists.
 */
export const CAPABILITIES = [
  'code.read',
  'code.write',
  'shell.exec',
  'web.fetch',
  'tool.mcp',
  'stream.structured',
  'verify.run',
  'review.judge',
  'plan.decompose',
  'longrunning',
] as const

export const CapabilitySchema = z.enum(CAPABILITIES)
export type Capability = z.infer<typeof CapabilitySchema>
