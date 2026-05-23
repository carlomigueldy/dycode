import { describe, expect, it } from 'vitest'
import {
  adapter_configure_paramsSchema,
  adapter_install_paramsSchema,
  adapter_install_resultSchema,
  adapter_list_paramsSchema,
  adapter_list_resultSchema,
  adapter_uninstall_paramsSchema,
  runtime_scan_paramsSchema,
  runtime_scan_resultSchema,
} from '../../src/ipc/methods.runtime.js'

describe('runtime.scan', () => {
  it('takes empty params and returns a detected adapters summary', () => {
    expect(runtime_scan_paramsSchema.safeParse({}).success).toBe(true)
    expect(
      runtime_scan_resultSchema.safeParse({
        detected: [{ adapterId: 'claude-code', version: '2.1.4', path: '/usr/local/bin/claude' }],
      }).success,
    ).toBe(true)
  })
})

describe('adapter.list', () => {
  it('returns installed adapters', () => {
    expect(adapter_list_paramsSchema.safeParse({}).success).toBe(true)
    expect(
      adapter_list_resultSchema.safeParse({
        adapters: [{ adapterId: 'claude-code', version: '2.1.4', installed: true }],
      }).success,
    ).toBe(true)
  })
})

describe('adapter.install', () => {
  it('takes adapterId, returns the installed version', () => {
    expect(adapter_install_paramsSchema.safeParse({ adapterId: 'codex' }).success).toBe(true)
    expect(
      adapter_install_resultSchema.safeParse({ adapterId: 'codex', version: '0.18.0' }).success,
    ).toBe(true)
  })
})

describe('adapter.uninstall', () => {
  it('takes adapterId, returns ok', () => {
    expect(adapter_uninstall_paramsSchema.safeParse({ adapterId: 'codex' }).success).toBe(true)
  })
})

describe('adapter.configure', () => {
  it('takes adapterId + config object', () => {
    expect(
      adapter_configure_paramsSchema.safeParse({
        adapterId: 'claude-code',
        config: { model: 'opus' },
      }).success,
    ).toBe(true)
  })
})
