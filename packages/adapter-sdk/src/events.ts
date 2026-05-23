import { z } from 'zod'

const OutputEvent = z.object({ type: z.literal('output'), chunk: z.string() }).strict()

const ToolCallEvent = z
  .object({
    type: z.literal('tool_call'),
    name: z.string().min(1),
    input: z.record(z.unknown()),
  })
  .strict()

const ToolResultEvent = z
  .object({
    type: z.literal('tool_result'),
    name: z.string().min(1),
    out: z.record(z.unknown()),
  })
  .strict()

const ProgressEvent = z
  .object({
    type: z.literal('progress'),
    ratio: z.number().min(0).max(1).optional(),
    note: z.string().optional(),
  })
  .strict()

const VerifyRequestEvent = z
  .object({ type: z.literal('verify_request'), cmd: z.string().min(1) })
  .strict()

const DoneEvent = z
  .object({
    type: z.literal('done'),
    status: z.enum(['ok', 'error']),
    summary: z.string(),
  })
  .strict()

const ErrorEvent = z
  .object({
    type: z.literal('error'),
    message: z.string().min(1),
    code: z.string().optional(),
  })
  .strict()

export const AdapterEventSchema = z.discriminatedUnion('type', [
  OutputEvent,
  ToolCallEvent,
  ToolResultEvent,
  ProgressEvent,
  VerifyRequestEvent,
  DoneEvent,
  ErrorEvent,
])
export type AdapterEvent = z.infer<typeof AdapterEventSchema>
