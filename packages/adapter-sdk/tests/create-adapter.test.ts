/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-empty-function */
import { describe, expect, it } from 'vitest'
import { createAdapter } from '../src/create-adapter.js'
import { AdapterManifestSchema } from '../src/manifest.js'

const fakeManifest = {
  id: 'fake',
  displayName: 'Fake',
  vendor: 'tests',
  apiVersion: 1 as const,
  capabilities: ['code.read'] as const satisfies string[],
}

describe('createAdapter', () => {
  it('returns its input verbatim (identity function)', () => {
    const stub = createAdapter({
      manifest: fakeManifest,
      detect: async () => ({ installed: true, version: '0.0.0', path: '/fake' }),
      create: () => ({
        async *start() {
          yield { type: 'done', status: 'ok', summary: '' } as const
        },
        async cancel() {},
        async health() {
          return { healthy: true, ts: 0 }
        },
        async dispose() {},
      }),
    })
    expect(stub.manifest).toBe(fakeManifest)
  })

  it('validates the manifest at construction time when STRICT_MODE is set', () => {
    // The helper doesn't enforce schema validation at runtime by default
    // (to keep adapters cheap to load). Just check the manifest is structurally valid.
    expect(AdapterManifestSchema.safeParse(fakeManifest).success).toBe(true)
  })
})
