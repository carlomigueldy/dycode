import { describe, expect, it } from 'vitest'
import { AdapterManifestSchema } from '../src/manifest.js'

const validManifest = {
  id: 'claude-code',
  displayName: 'Claude Code',
  vendor: 'anthropic',
  apiVersion: 1,
  capabilities: ['code.read', 'code.write', 'shell.exec', 'longrunning'],
  iconUrl: 'https://example.com/icon.png',
}

describe('AdapterManifestSchema', () => {
  it('accepts a fully-formed manifest', () => {
    expect(AdapterManifestSchema.safeParse(validManifest).success).toBe(true)
  })

  it('accepts a manifest without optional iconUrl', () => {
    const { iconUrl: _omit, ...rest } = validManifest
    expect(AdapterManifestSchema.safeParse(rest).success).toBe(true)
  })

  it('rejects apiVersion that is not 1', () => {
    expect(AdapterManifestSchema.safeParse({ ...validManifest, apiVersion: 2 }).success).toBe(false)
  })

  it('rejects duplicate capabilities', () => {
    expect(
      AdapterManifestSchema.safeParse({
        ...validManifest,
        capabilities: ['code.read', 'code.read'],
      }).success,
    ).toBe(false)
  })

  it('rejects unknown capability', () => {
    expect(
      AdapterManifestSchema.safeParse({
        ...validManifest,
        capabilities: ['code.read', 'do.anything'],
      }).success,
    ).toBe(false)
  })

  it('rejects empty id', () => {
    expect(AdapterManifestSchema.safeParse({ ...validManifest, id: '' }).success).toBe(false)
  })

  it('rejects iconUrl that is not a URL', () => {
    expect(
      AdapterManifestSchema.safeParse({ ...validManifest, iconUrl: 'not-a-url' }).success,
    ).toBe(false)
  })
})
