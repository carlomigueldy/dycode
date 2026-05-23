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
