import { describe, expect, it } from 'vitest'
import { METHOD_NAMES, MethodNameSchema } from '../../src/ipc/methods.js'

describe('MethodName', () => {
  it('lists every spec §6.2 method', () => {
    expect(METHOD_NAMES).toEqual([
      // workspaces
      'workspace.list',
      'workspace.add',
      'workspace.activate',
      'workspace.remove',
      // runtime + adapters
      'runtime.scan',
      'adapter.list',
      'adapter.install',
      'adapter.uninstall',
      'adapter.configure',
      // fleet
      'squad.create',
      'squad.delete',
      'squad.rename',
      'squad.addMember',
      'squad.removeMember',
      'squad.setLeader',
      'pool.list',
      'pool.promote',
      'pool.release',
      // tasks
      'task.create',
      'task.cancel',
      'task.list',
      'task.get',
      'task.assign',
      'task.requestReview',
      'task.submitReviewVerdict',
      'task.run',
      'task.replay',
      // events
      'events.subscribe',
      'events.unsubscribe',
      'events.query',
    ])
  })

  it('accepts every listed method', () => {
    for (const m of METHOD_NAMES) {
      expect(MethodNameSchema.safeParse(m).success).toBe(true)
    }
  })

  it('rejects unknown method', () => {
    expect(MethodNameSchema.safeParse('admin.shutdown').success).toBe(false)
  })
})
