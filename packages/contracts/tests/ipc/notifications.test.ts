import { describe, expect, it } from 'vitest'
import { NotificationSchema } from '../../src/ipc/notifications.js'

const workspaceId = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const taskId = 'tk_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const agentId = 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV'

describe('Notification', () => {
  it('accepts event.appended', () => {
    expect(
      NotificationSchema.safeParse({
        jsonrpc: '2.0',
        method: 'event.appended',
        params: {
          id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
          ts: 0,
          workspaceId,
          taskId: null,
          agentId: null,
          type: 'output',
          payload: { chunk: 'hi' },
        },
      }).success,
    ).toBe(true)
  })

  it('accepts task.stateChanged', () => {
    expect(
      NotificationSchema.safeParse({
        jsonrpc: '2.0',
        method: 'task.stateChanged',
        params: { taskId, from: 'active', to: 'passing' },
      }).success,
    ).toBe(true)
  })

  it('accepts agent.statusChanged', () => {
    expect(
      NotificationSchema.safeParse({
        jsonrpc: '2.0',
        method: 'agent.statusChanged',
        params: { agentId, status: 'busy' },
      }).success,
    ).toBe(true)
  })

  it('accepts squad.changed', () => {
    expect(
      NotificationSchema.safeParse({
        jsonrpc: '2.0',
        method: 'squad.changed',
        params: { squadId: 'sq_01ARZ3NDEKTSV4RRFFQ69G5FAV' },
      }).success,
    ).toBe(true)
  })

  it('accepts runtime.detected', () => {
    expect(
      NotificationSchema.safeParse({
        jsonrpc: '2.0',
        method: 'runtime.detected',
        params: { newAdapters: ['claude-code', 'codex'] },
      }).success,
    ).toBe(true)
  })

  it('rejects unknown method', () => {
    expect(
      NotificationSchema.safeParse({
        jsonrpc: '2.0',
        method: 'task.unknownThing',
        params: {},
      }).success,
    ).toBe(false)
  })
})
