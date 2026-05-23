import { describe, expect, it } from 'vitest'
import {
  pool_list_paramsSchema,
  pool_list_resultSchema,
  pool_promote_paramsSchema,
  pool_release_paramsSchema,
  squad_addMember_paramsSchema,
  squad_create_paramsSchema,
  squad_create_resultSchema,
  squad_delete_paramsSchema,
  squad_removeMember_paramsSchema,
  squad_rename_paramsSchema,
  squad_setLeader_paramsSchema,
} from '../../src/ipc/methods.fleet.js'

const workspaceId = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const squadId = 'sq_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const agentId = 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV'

describe('squad.create', () => {
  it('takes workspaceId + name, returns the new squad', () => {
    expect(squad_create_paramsSchema.safeParse({ workspaceId, name: 'backend' }).success).toBe(true)
    expect(
      squad_create_resultSchema.safeParse({
        squad: {
          id: squadId,
          workspaceId,
          name: 'backend',
          leaderAgentId: null,
          memberAgentIds: [],
          createdAt: 0,
        },
      }).success,
    ).toBe(true)
  })
})

describe('squad.delete / rename / addMember / removeMember / setLeader', () => {
  it('all squad.* methods take squadId and the relevant payload', () => {
    expect(squad_delete_paramsSchema.safeParse({ squadId }).success).toBe(true)
    expect(squad_rename_paramsSchema.safeParse({ squadId, name: 'frontend' }).success).toBe(true)
    expect(squad_addMember_paramsSchema.safeParse({ squadId, agentId }).success).toBe(true)
    expect(squad_removeMember_paramsSchema.safeParse({ squadId, agentId }).success).toBe(true)
    expect(squad_setLeader_paramsSchema.safeParse({ squadId, agentId }).success).toBe(true)
    // setLeader can also clear with null
    expect(squad_setLeader_paramsSchema.safeParse({ squadId, agentId: null }).success).toBe(true)
  })
})

describe('pool.list', () => {
  it('returns agents currently in the pool (not in any squad)', () => {
    expect(pool_list_paramsSchema.safeParse({ workspaceId }).success).toBe(true)
    expect(
      pool_list_resultSchema.safeParse({
        agentIds: [agentId],
      }).success,
    ).toBe(true)
  })
})

describe('pool.promote / pool.release', () => {
  it('promote takes squadId + agentId, release takes agentId', () => {
    expect(pool_promote_paramsSchema.safeParse({ squadId, agentId }).success).toBe(true)
    expect(pool_release_paramsSchema.safeParse({ agentId }).success).toBe(true)
  })
})
