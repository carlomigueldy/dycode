import { describe, expect, it } from 'vitest'
import {
  ERROR_CODE,
  JsonRpcErrorSchema,
  JsonRpcRequestEnvelopeSchema,
  JsonRpcResponseEnvelopeSchema,
} from '../../src/ipc/envelope.js'

describe('ERROR_CODE', () => {
  it('exposes the canonical JSON-RPC 2.0 errors + dycode-specific extensions', () => {
    expect(ERROR_CODE.PARSE_ERROR).toBe(-32700)
    expect(ERROR_CODE.INVALID_REQUEST).toBe(-32600)
    expect(ERROR_CODE.METHOD_NOT_FOUND).toBe(-32601)
    expect(ERROR_CODE.INVALID_PARAMS).toBe(-32602)
    expect(ERROR_CODE.INTERNAL_ERROR).toBe(-32603)
    expect(ERROR_CODE.PROTOCOL_VERSION_MISMATCH).toBe(-32099)
    expect(ERROR_CODE.AUTH_REQUIRED).toBe(-32098)
    expect(ERROR_CODE.CAPABILITY_DENIED).toBe(-32097)
    expect(ERROR_CODE.AGENT_UNHEALTHY).toBe(-32096)
    expect(ERROR_CODE.WORKSPACE_NOT_FOUND).toBe(-32095)
  })
})

describe('JsonRpcRequestEnvelopeSchema', () => {
  it('accepts a minimal valid request', () => {
    expect(
      JsonRpcRequestEnvelopeSchema.safeParse({
        jsonrpc: '2.0',
        id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        method: 'workspace.list',
        params: {},
        protocolVersion: 1,
      }).success,
    ).toBe(true)
  })

  it('rejects non-2.0 jsonrpc', () => {
    expect(
      JsonRpcRequestEnvelopeSchema.safeParse({
        jsonrpc: '1.0',
        id: 'x',
        method: 'workspace.list',
        params: {},
        protocolVersion: 1,
      }).success,
    ).toBe(false)
  })

  it('rejects protocolVersion that is not 1', () => {
    expect(
      JsonRpcRequestEnvelopeSchema.safeParse({
        jsonrpc: '2.0',
        id: 'x',
        method: 'workspace.list',
        params: {},
        protocolVersion: 2,
      }).success,
    ).toBe(false)
  })
})

describe('JsonRpcResponseEnvelopeSchema', () => {
  it('accepts a success response', () => {
    expect(
      JsonRpcResponseEnvelopeSchema.safeParse({
        jsonrpc: '2.0',
        id: 'x',
        result: { ok: true },
      }).success,
    ).toBe(true)
  })

  it('accepts an error response', () => {
    expect(
      JsonRpcResponseEnvelopeSchema.safeParse({
        jsonrpc: '2.0',
        id: 'x',
        error: { code: ERROR_CODE.METHOD_NOT_FOUND, message: 'no such method' },
      }).success,
    ).toBe(true)
  })

  it('rejects when both result and error are present', () => {
    expect(
      JsonRpcResponseEnvelopeSchema.safeParse({
        jsonrpc: '2.0',
        id: 'x',
        result: {},
        error: { code: -32603, message: 'oops' },
      }).success,
    ).toBe(false)
  })

  it('rejects when neither result nor error is present', () => {
    expect(JsonRpcResponseEnvelopeSchema.safeParse({ jsonrpc: '2.0', id: 'x' }).success).toBe(false)
  })
})

describe('JsonRpcErrorSchema', () => {
  it('accepts a minimal error', () => {
    expect(
      JsonRpcErrorSchema.safeParse({ code: ERROR_CODE.INTERNAL_ERROR, message: 'boom' }).success,
    ).toBe(true)
  })

  it('accepts error with data payload', () => {
    expect(
      JsonRpcErrorSchema.safeParse({
        code: ERROR_CODE.INVALID_PARAMS,
        message: 'bad params',
        data: { field: 'workspaceId' },
      }).success,
    ).toBe(true)
  })
})
