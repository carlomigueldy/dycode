import type { AdapterPlugin } from './plugin.js'

/**
 * Identity helper for adapter authors. Returns the input verbatim, but with
 * full type inference of the AdapterPlugin contract.
 *
 * Usage:
 *
 *   import { createAdapter } from '@dycode/adapter-sdk'
 *
 *   export default createAdapter({
 *     manifest: { id: 'my-cli', ... },
 *     detect: async () => ({ installed: true, version: '1.0.0' }),
 *     create: (opts) => ({
 *       async *start(prompt, ctx) {
 *         yield { type: 'output', chunk: prompt.text }
 *         yield { type: 'done', status: 'ok', summary: '' }
 *       },
 *       async cancel() {},
 *       async health() { return { healthy: true, ts: Date.now() } },
 *       async dispose() {},
 *     }),
 *   })
 */
export function createAdapter(plugin: AdapterPlugin): AdapterPlugin {
  return plugin
}
