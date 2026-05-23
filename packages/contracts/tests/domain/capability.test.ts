import { describe, expect, it } from 'vitest'
import { CAPABILITIES, CapabilitySchema } from '../../src/domain/capability.js'

describe('Capability', () => {
  it('lists every spec §5.1 capability', () => {
    expect(CAPABILITIES).toEqual([
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
    ])
  })

  it('accepts every listed capability', () => {
    for (const cap of CAPABILITIES) {
      expect(CapabilitySchema.safeParse(cap).success).toBe(true)
    }
  })

  it('rejects unknown capabilities', () => {
    expect(CapabilitySchema.safeParse('admin.everything').success).toBe(false)
    expect(CapabilitySchema.safeParse('').success).toBe(false)
  })
})
