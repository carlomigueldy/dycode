import { describe, expect, it } from 'vitest'
import { CONTRACTS_VERSION } from '../src/index.js'

describe('CONTRACTS_VERSION', () => {
  it('exports a non-empty semver string', () => {
    expect(typeof CONTRACTS_VERSION).toBe('string')
    expect(CONTRACTS_VERSION.length).toBeGreaterThan(0)
  })

  it('matches a basic semver shape', () => {
    expect(CONTRACTS_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/)
  })

  it('starts at major version 0 for pre-1.0 contract', () => {
    const major = Number.parseInt(CONTRACTS_VERSION.split('.')[0] ?? '', 10)
    expect(major).toBe(0)
  })
})
