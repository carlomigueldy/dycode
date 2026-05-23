import { describe, expect, it } from 'vitest'
import { AGENT_STATUSES, AgentSchema, AgentStatusSchema } from '../../src/domain/agent.js'

const validAgent = {
  id: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  adapterId: 'claude-code',
  adapterVersion: '2.1.4',
  displayName: 'Claude (backend)',
  capabilities: ['code.read', 'code.write', 'shell.exec'],
  config: { model: 'opus' },
  status: 'idle',
  currentTaskId: null,
}

describe('AgentStatus', () => {
  it('lists all 7 statuses in canonical order', () => {
    expect(AGENT_STATUSES).toEqual([
      'idle',
      'busy',
      'queued',
      'blocked',
      'unhealthy',
      'uninstalled',
      'auth_required',
    ])
  })

  it('accepts every status', () => {
    for (const s of AGENT_STATUSES) {
      expect(AgentStatusSchema.safeParse(s).success).toBe(true)
    }
  })

  it('rejects unknown status', () => {
    expect(AgentStatusSchema.safeParse('running').success).toBe(false)
  })
})

describe('AgentSchema', () => {
  it('accepts a fully-formed agent', () => {
    expect(AgentSchema.safeParse(validAgent).success).toBe(true)
  })

  it('accepts currentTaskId as a TaskId', () => {
    expect(
      AgentSchema.safeParse({
        ...validAgent,
        status: 'busy',
        currentTaskId: 'tk_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      }).success,
    ).toBe(true)
  })

  it('rejects an empty capabilities array? — actually allows it (an agent with no capabilities is valid; just unusable)', () => {
    expect(AgentSchema.safeParse({ ...validAgent, capabilities: [] }).success).toBe(true)
  })

  it('rejects duplicate capabilities', () => {
    expect(
      AgentSchema.safeParse({
        ...validAgent,
        capabilities: ['code.read', 'code.read'],
      }).success,
    ).toBe(false)
  })

  it('rejects unknown capability strings', () => {
    expect(
      AgentSchema.safeParse({ ...validAgent, capabilities: ['code.read', 'fake.cap'] }).success,
    ).toBe(false)
  })

  it('rejects mismatched id prefix', () => {
    expect(
      AgentSchema.safeParse({ ...validAgent, id: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV' }).success,
    ).toBe(false)
  })

  it('defaults config to an empty object when omitted', () => {
    const { config: _omit, ...rest } = validAgent
    expect(AgentSchema.parse(rest).config).toEqual({})
  })
})
