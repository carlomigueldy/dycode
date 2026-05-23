import { describe, expect, it } from 'vitest'
import { SquadSchema } from '../../src/domain/squad.js'

const validSquad = {
  id: 'sq_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  name: 'backend',
  leaderAgentId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  memberAgentIds: ['ag_01ARZ3NDEKTSV4RRFFQ69G5FAV', 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW'],
  createdAt: 1_716_500_000_000,
}

describe('SquadSchema', () => {
  it('accepts a fully-formed squad', () => {
    expect(SquadSchema.safeParse(validSquad).success).toBe(true)
  })

  it('accepts leaderAgentId = null (squad with no leader yet)', () => {
    expect(SquadSchema.safeParse({ ...validSquad, leaderAgentId: null }).success).toBe(true)
  })

  it('accepts an empty memberAgentIds array (newly-created squad)', () => {
    expect(SquadSchema.safeParse({ ...validSquad, memberAgentIds: [] }).success).toBe(true)
  })

  it('rejects when leaderAgentId is set but not in memberAgentIds', () => {
    expect(
      SquadSchema.safeParse({
        ...validSquad,
        leaderAgentId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAX',
        memberAgentIds: ['ag_01ARZ3NDEKTSV4RRFFQ69G5FAV'],
      }).success,
    ).toBe(false)
  })

  it('rejects duplicate members', () => {
    expect(
      SquadSchema.safeParse({
        ...validSquad,
        memberAgentIds: ['ag_01ARZ3NDEKTSV4RRFFQ69G5FAV', 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV'],
      }).success,
    ).toBe(false)
  })

  it('rejects empty squad name', () => {
    expect(SquadSchema.safeParse({ ...validSquad, name: '' }).success).toBe(false)
  })
})
