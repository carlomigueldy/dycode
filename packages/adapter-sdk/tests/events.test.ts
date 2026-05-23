import { ADAPTER_EVENT_KINDS } from '@dycode/contracts'
import { describe, expect, it } from 'vitest'
import { AdapterEventSchema } from '../src/events.js'

describe('AdapterEventSchema', () => {
  it('accepts an output event', () => {
    expect(AdapterEventSchema.safeParse({ type: 'output', chunk: 'hello' }).success).toBe(true)
  })

  it('accepts a tool_call event', () => {
    expect(
      AdapterEventSchema.safeParse({ type: 'tool_call', name: 'read_file', input: { path: 'x' } })
        .success,
    ).toBe(true)
  })

  it('accepts a tool_result event', () => {
    expect(
      AdapterEventSchema.safeParse({
        type: 'tool_result',
        name: 'read_file',
        out: { content: 'x' },
      }).success,
    ).toBe(true)
  })

  it('accepts a progress event (with or without ratio/note)', () => {
    expect(AdapterEventSchema.safeParse({ type: 'progress' }).success).toBe(true)
    expect(AdapterEventSchema.safeParse({ type: 'progress', ratio: 0.5 }).success).toBe(true)
    expect(AdapterEventSchema.safeParse({ type: 'progress', note: 'almost there' }).success).toBe(
      true,
    )
  })

  it('rejects ratio > 1 or < 0', () => {
    expect(AdapterEventSchema.safeParse({ type: 'progress', ratio: 1.5 }).success).toBe(false)
    expect(AdapterEventSchema.safeParse({ type: 'progress', ratio: -0.1 }).success).toBe(false)
  })

  it('accepts verify_request, done, error', () => {
    expect(AdapterEventSchema.safeParse({ type: 'verify_request', cmd: 'pnpm test' }).success).toBe(
      true,
    )
    expect(
      AdapterEventSchema.safeParse({ type: 'done', status: 'ok', summary: 'done' }).success,
    ).toBe(true)
    expect(
      AdapterEventSchema.safeParse({ type: 'done', status: 'error', summary: 'failed' }).success,
    ).toBe(true)
    expect(AdapterEventSchema.safeParse({ type: 'error', message: 'oops' }).success).toBe(true)
  })

  it('rejects unknown event type', () => {
    expect(AdapterEventSchema.safeParse({ type: 'panic' }).success).toBe(false)
  })

  it('rejects done with status that is not ok|error', () => {
    expect(
      AdapterEventSchema.safeParse({ type: 'done', status: 'maybe', summary: '?' }).success,
    ).toBe(false)
  })
})

describe('AdapterEvent ↔ contracts.ADAPTER_EVENT_KINDS alignment', () => {
  it('every contracts kind has an AdapterEvent variant', () => {
    for (const kind of ADAPTER_EVENT_KINDS) {
      // Build a minimal-valid event for each kind to assert the discriminator covers it.
      const probe = (() => {
        switch (kind) {
          case 'output':
            return { type: 'output', chunk: '' }
          case 'tool_call':
            return { type: 'tool_call', name: 'x', input: {} }
          case 'tool_result':
            return { type: 'tool_result', name: 'x', out: {} }
          case 'progress':
            return { type: 'progress' }
          case 'verify_request':
            return { type: 'verify_request', cmd: 'x' }
          case 'done':
            return { type: 'done', status: 'ok', summary: '' }
          case 'error':
            return { type: 'error', message: 'x' }
        }
      })()
      expect(AdapterEventSchema.safeParse(probe).success).toBe(true)
    }
  })

  it('AdapterEvent has no kinds beyond ADAPTER_EVENT_KINDS', () => {
    const knownKinds = new Set<string>(ADAPTER_EVENT_KINDS)
    const sdkVariants = AdapterEventSchema.options.map((o) => o.shape.type.value)
    for (const v of sdkVariants) expect(knownKinds.has(v)).toBe(true)
    expect(sdkVariants.length).toBe(ADAPTER_EVENT_KINDS.length)
  })
})
