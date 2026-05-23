import { describe, expect, it } from 'vitest'
import {
  workspace_activate_paramsSchema,
  workspace_activate_resultSchema,
  workspace_add_paramsSchema,
  workspace_add_resultSchema,
  workspace_list_paramsSchema,
  workspace_list_resultSchema,
  workspace_remove_paramsSchema,
  workspace_remove_resultSchema,
} from '../../src/ipc/methods.workspace.js'

describe('workspace.list', () => {
  it('takes empty params and returns a workspaces array', () => {
    expect(workspace_list_paramsSchema.safeParse({}).success).toBe(true)
    expect(
      workspace_list_resultSchema.safeParse({
        workspaces: [
          {
            id: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            name: 'demo',
            rootPath: '/tmp/demo',
            settings: {},
            createdAt: 0,
            lastActiveAt: 0,
          },
        ],
      }).success,
    ).toBe(true)
  })
})

describe('workspace.add', () => {
  it('takes name + rootPath, returns the new workspace', () => {
    expect(
      workspace_add_paramsSchema.safeParse({ name: 'demo', rootPath: '/tmp/demo' }).success,
    ).toBe(true)
    expect(
      workspace_add_resultSchema.safeParse({
        workspace: {
          id: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
          name: 'demo',
          rootPath: '/tmp/demo',
          settings: {},
          createdAt: 0,
          lastActiveAt: 0,
        },
      }).success,
    ).toBe(true)
  })

  it('rejects relative rootPath', () => {
    expect(workspace_add_paramsSchema.safeParse({ name: 'x', rootPath: 'rel/path' }).success).toBe(
      false,
    )
  })
})

describe('workspace.activate', () => {
  it('takes workspaceId, returns ok', () => {
    expect(
      workspace_activate_paramsSchema.safeParse({ workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV' })
        .success,
    ).toBe(true)
    expect(workspace_activate_resultSchema.safeParse({ ok: true }).success).toBe(true)
  })
})

describe('workspace.remove', () => {
  it('takes workspaceId, returns ok', () => {
    expect(
      workspace_remove_paramsSchema.safeParse({ workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV' })
        .success,
    ).toBe(true)
    expect(workspace_remove_resultSchema.safeParse({ ok: true }).success).toBe(true)
  })
})
