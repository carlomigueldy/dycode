import { describe, expect, it } from 'vitest'
import { SDK_VERSION } from '../src/index.js'

describe('SDK_VERSION', () => {
  it('exports a non-empty semver string', () => {
    expect(typeof SDK_VERSION).toBe('string')
    expect(SDK_VERSION.length).toBeGreaterThan(0)
  })

  it('matches a basic semver shape', () => {
    expect(SDK_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/)
  })

  it('starts at major version 0 for pre-1.0 surface', () => {
    const major = Number.parseInt(SDK_VERSION.split('.')[0] ?? '', 10)
    expect(major).toBe(0)
  })
})
