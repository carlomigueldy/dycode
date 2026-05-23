import { describe, expect, it } from 'vitest'
import { WorkspaceSchema } from '../../src/domain/workspace.js'

const validWorkspace = {
  id: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  name: 'dycode',
  rootPath: '/Users/me/projects/dycode',
  settings: { defaultBranch: 'main' },
  createdAt: 1_716_500_000_000,
  lastActiveAt: 1_716_500_100_000,
}

describe('WorkspaceSchema', () => {
  it('accepts a fully-formed workspace', () => {
    const result = WorkspaceSchema.safeParse(validWorkspace)
    expect(result.success).toBe(true)
  })

  it('accepts settings with optional instructionsPath', () => {
    expect(
      WorkspaceSchema.safeParse({
        ...validWorkspace,
        settings: { instructionsPath: 'CLAUDE.md' },
      }).success,
    ).toBe(true)
  })

  it('rejects a malformed id', () => {
    expect(WorkspaceSchema.safeParse({ ...validWorkspace, id: 'not-a-ws-id' }).success).toBe(false)
  })

  it('rejects when name is empty', () => {
    expect(WorkspaceSchema.safeParse({ ...validWorkspace, name: '' }).success).toBe(false)
  })

  it('rejects relative rootPath', () => {
    expect(WorkspaceSchema.safeParse({ ...validWorkspace, rootPath: './rel' }).success).toBe(false)
  })

  it('rejects negative timestamps', () => {
    expect(WorkspaceSchema.safeParse({ ...validWorkspace, createdAt: -1 }).success).toBe(false)
  })

  it('defaults settings to an empty object when omitted', () => {
    const { settings: _omit, ...rest } = validWorkspace
    const parsed = WorkspaceSchema.parse(rest)
    expect(parsed.settings).toEqual({})
  })
})
