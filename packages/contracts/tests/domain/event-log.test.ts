import { describe, expect, it } from 'vitest'
import {
  ADAPTER_EVENT_KINDS,
  AdapterEventKindSchema,
  EventLogEntrySchema,
} from '../../src/domain/event-log.js'

const validEntry = {
  id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
  ts: 1_716_500_000_000,
  workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  taskId: 'tk_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  agentId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  type: 'output',
  payload: { chunk: 'hello\n' },
}

describe('AdapterEventKind', () => {
  it('lists the 7 spec §5.2 event kinds', () => {
    expect(ADAPTER_EVENT_KINDS).toEqual([
      'output',
      'tool_call',
      'tool_result',
      'progress',
      'verify_request',
      'done',
      'error',
    ])
  })

  it('accepts each kind', () => {
    for (const k of ADAPTER_EVENT_KINDS) {
      expect(AdapterEventKindSchema.safeParse(k).success).toBe(true)
    }
  })

  it('rejects unknown kind', () => {
    expect(AdapterEventKindSchema.safeParse('weird').success).toBe(false)
  })
})

describe('EventLogEntrySchema', () => {
  it('accepts a fully-formed entry', () => {
    expect(EventLogEntrySchema.safeParse(validEntry).success).toBe(true)
  })

  it('accepts taskId = null (workspace-scoped events like runtime detection)', () => {
    expect(EventLogEntrySchema.safeParse({ ...validEntry, taskId: null }).success).toBe(true)
  })

  it('accepts agentId = null (system events)', () => {
    expect(EventLogEntrySchema.safeParse({ ...validEntry, agentId: null }).success).toBe(true)
  })

  it('rejects when id is not a ULID', () => {
    expect(EventLogEntrySchema.safeParse({ ...validEntry, id: 'not-ulid' }).success).toBe(false)
  })

  it('rejects negative ts', () => {
    expect(EventLogEntrySchema.safeParse({ ...validEntry, ts: -1 }).success).toBe(false)
  })

  it('rejects unknown event type', () => {
    expect(EventLogEntrySchema.safeParse({ ...validEntry, type: 'panic' }).success).toBe(false)
  })

  it('payload is a passthrough JSON object (any shape)', () => {
    expect(
      EventLogEntrySchema.safeParse({ ...validEntry, payload: { whatever: ['a', 1, null] } })
        .success,
    ).toBe(true)
  })
})
