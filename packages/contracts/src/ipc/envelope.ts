import { z } from 'zod'

/**
 * JSON-RPC 2.0 error codes plus dycode-specific extensions in the
 * -32099..-32000 server-error reserved range.
 */
export const ERROR_CODE = {
  // JSON-RPC 2.0 canonical
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // dycode extensions (server-error range)
  PROTOCOL_VERSION_MISMATCH: -32099,
  AUTH_REQUIRED: -32098,
  CAPABILITY_DENIED: -32097,
  AGENT_UNHEALTHY: -32096,
  WORKSPACE_NOT_FOUND: -32095,
} as const
export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE]

export const JsonRpcErrorSchema = z
  .object({
    code: z.number().int(),
    message: z.string().min(1),
    data: z.unknown().optional(),
  })
  .strict()
export type JsonRpcError = z.infer<typeof JsonRpcErrorSchema>

const RequestIdSchema = z.string().min(1)

export const JsonRpcRequestEnvelopeSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
    id: RequestIdSchema,
    method: z.string().min(1),
    params: z.unknown().optional(),
    protocolVersion: z.literal(1),
  })
  .strict()
export type JsonRpcRequestEnvelope = z.infer<typeof JsonRpcRequestEnvelopeSchema>

export const JsonRpcResponseEnvelopeSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
    id: RequestIdSchema,
    result: z.unknown().optional(),
    error: JsonRpcErrorSchema.optional(),
  })
  .strict()
  .refine(
    (r) =>
      ('result' in r && r.result !== undefined && r.error === undefined) ||
      ('error' in r && r.error !== undefined && r.result === undefined),
    {
      message: 'exactly one of `result` or `error` must be present',
      path: ['result'],
    },
  )
export type JsonRpcResponseEnvelope = z.infer<typeof JsonRpcResponseEnvelopeSchema>
