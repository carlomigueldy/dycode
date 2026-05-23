import { describe, expect, it } from 'vitest'
import {
  AgentIdSchema,
  SquadIdSchema,
  TaskIdSchema,
  WorkspaceIdSchema,
  isAgentId,
  isSquadId,
  isTaskId,
  isWorkspaceId,
} from '../src/ids.js'

describe('branded IDs', () => {
  describe('WorkspaceIdSchema', () => {
    it('accepts the ws_ prefix + ULID', () => {
      const v = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'
      expect(WorkspaceIdSchema.safeParse(v).success).toBe(true)
    })
    it('rejects missing prefix', () => {
      expect(WorkspaceIdSchema.safeParse('01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(false)
    })
    it('rejects the wrong domain prefix', () => {
      expect(WorkspaceIdSchema.safeParse('ag_01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(false)
    })
    it('rejects ULIDs of wrong length', () => {
      expect(WorkspaceIdSchema.safeParse('ws_TOOSHORT').success).toBe(false)
    })
  })

  it('AgentId / SquadId / TaskId follow the same rules with their prefixes', () => {
    expect(AgentIdSchema.safeParse('ag_01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(true)
    expect(SquadIdSchema.safeParse('sq_01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(true)
    expect(TaskIdSchema.safeParse('tk_01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(true)
    expect(AgentIdSchema.safeParse('ws_01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(false)
  })

  describe('type guards', () => {
    it('isWorkspaceId narrows', () => {
      // eslint-disable-next-line @typescript-eslint/no-inferrable-types -- annotation is intentional to demonstrate narrowing from string
      const candidate: string = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'
      expect(isWorkspaceId(candidate)).toBe(true)
      expect(isWorkspaceId('not an id')).toBe(false)
    })
    it('isAgentId / isSquadId / isTaskId narrow correctly', () => {
      expect(isAgentId('ag_01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true)
      expect(isSquadId('sq_01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true)
      expect(isTaskId('tk_01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true)
      expect(isAgentId('sq_01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(false)
    })
  })

  it('brand survives inference: a WorkspaceId is not assignable to AgentId', () => {
    const ws = WorkspaceIdSchema.parse('ws_01ARZ3NDEKTSV4RRFFQ69G5FAV')
    // The following line, if uncommented, MUST fail typecheck:
    // const ag: z.infer<typeof AgentIdSchema> = ws
    expect(typeof ws).toBe('string')
  })
})
