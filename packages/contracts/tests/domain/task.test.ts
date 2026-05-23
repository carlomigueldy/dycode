import { describe, expect, it } from 'vitest'
import {
  REVIEW_DIMENSIONS,
  ReviewVerdictSchema,
  TASK_STATES,
  TaskEvidenceSchema,
  TaskSchema,
  TaskStateSchema,
} from '../../src/domain/task.js'

const validTask = {
  id: 'tk_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  workspaceId: 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  squadId: 'sq_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  assigneeId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  reviewerId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW',
  parentTaskId: null,
  title: 'Implement /api/users POST',
  behavior: 'POST /api/users with valid body returns 201',
  verification: 'pnpm --filter @dycode/api test users.spec',
  state: 'active',
  reviewVerdict: null,
  scope: { paths: ['packages/api/users'], touchedFiles: [] },
  evidence: [],
  createdAt: 1_716_500_000_000,
  startedAt: 1_716_500_100_000,
  completedAt: null,
}

describe('TaskState', () => {
  it('lists the 4 states in canonical order', () => {
    expect(TASK_STATES).toEqual(['not_started', 'active', 'passing', 'blocked'])
  })
  it('accepts each state', () => {
    for (const s of TASK_STATES) expect(TaskStateSchema.safeParse(s).success).toBe(true)
  })
  it('rejects unknown state', () => {
    expect(TaskStateSchema.safeParse('done').success).toBe(false)
  })
})

describe('ReviewVerdict', () => {
  it('exposes the 4 dimensions in canonical order', () => {
    expect(REVIEW_DIMENSIONS).toEqual([
      'consistency',
      'scalability',
      'maintainability',
      'correctness',
    ])
  })

  it('accepts a 10/10 verdict', () => {
    expect(
      ReviewVerdictSchema.safeParse({
        score: 10,
        notes: 'lgtm',
        reviewerId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW',
      }).success,
    ).toBe(true)
  })

  it('rejects non-integer score', () => {
    expect(
      ReviewVerdictSchema.safeParse({
        score: 9.5,
        notes: 'almost',
        reviewerId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW',
      }).success,
    ).toBe(false)
  })

  it('rejects out-of-range score', () => {
    expect(
      ReviewVerdictSchema.safeParse({
        score: 11,
        notes: 'overflow',
        reviewerId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW',
      }).success,
    ).toBe(false)
    expect(
      ReviewVerdictSchema.safeParse({
        score: -1,
        notes: 'underflow',
        reviewerId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW',
      }).success,
    ).toBe(false)
  })
})

describe('TaskEvidence', () => {
  const reviewerId = 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW'
  it('accepts a commit evidence', () => {
    expect(
      TaskEvidenceSchema.safeParse({
        kind: 'commit',
        sha: 'abc123',
        message: 'feat: implement users POST',
        ts: 1_716_500_000_000,
      }).success,
    ).toBe(true)
  })
  it('accepts a verify_run evidence', () => {
    expect(
      TaskEvidenceSchema.safeParse({
        kind: 'verify_run',
        cmd: 'pnpm test',
        exitCode: 0,
        logRef: '/tmp/log',
        ts: 1_716_500_000_000,
      }).success,
    ).toBe(true)
  })
  it('accepts a review evidence', () => {
    expect(
      TaskEvidenceSchema.safeParse({
        kind: 'review',
        reviewerId,
        score: 10,
        notes: 'ok',
        ts: 1_716_500_000_000,
      }).success,
    ).toBe(true)
  })
  it('accepts a handoff evidence', () => {
    expect(
      TaskEvidenceSchema.safeParse({
        kind: 'handoff',
        fromAgentId: 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        toAgentId: reviewerId,
        ts: 1_716_500_000_000,
      }).success,
    ).toBe(true)
  })
  it('rejects unknown kind', () => {
    expect(TaskEvidenceSchema.safeParse({ kind: 'fart', ts: 1 }).success).toBe(false)
  })
})

describe('TaskSchema', () => {
  it('accepts a fully-formed task', () => {
    expect(TaskSchema.safeParse(validTask).success).toBe(true)
  })
  it('accepts squadId = null (pool task)', () => {
    expect(TaskSchema.safeParse({ ...validTask, squadId: null }).success).toBe(true)
  })
  it('rejects assignee === reviewer', () => {
    expect(
      TaskSchema.safeParse({
        ...validTask,
        reviewerId: validTask.assigneeId,
      }).success,
    ).toBe(false)
  })
  it('accepts null assignee + null reviewer (un-assigned task)', () => {
    expect(TaskSchema.safeParse({ ...validTask, assigneeId: null, reviewerId: null }).success).toBe(
      true,
    )
  })
  it('rejects empty title', () => {
    expect(TaskSchema.safeParse({ ...validTask, title: '' }).success).toBe(false)
  })
  it('rejects empty verification', () => {
    expect(TaskSchema.safeParse({ ...validTask, verification: '' }).success).toBe(false)
  })
})
