import { describe, expect, it } from 'vitest'
import {
  task_assign_paramsSchema,
  task_cancel_paramsSchema,
  task_create_paramsSchema,
  task_create_resultSchema,
  task_get_paramsSchema,
  task_list_paramsSchema,
  task_list_resultSchema,
  task_replay_paramsSchema,
  task_replay_resultSchema,
  task_requestReview_paramsSchema,
  task_run_paramsSchema,
  task_submitReviewVerdict_paramsSchema,
} from '../../src/ipc/methods.task.js'

const workspaceId = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const squadId = 'sq_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const agentA = 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAV'
const agentB = 'ag_01ARZ3NDEKTSV4RRFFQ69G5FAW'
const taskId = 'tk_01ARZ3NDEKTSV4RRFFQ69G5FAV'

describe('task.create', () => {
  it('takes workspaceId + (optional squadId|parent) + behavior + verification', () => {
    expect(
      task_create_paramsSchema.safeParse({
        workspaceId,
        squadId,
        parentTaskId: null,
        title: 'POST /api/users',
        behavior: 'returns 201 on valid body',
        verification: 'pnpm test users',
        scope: { paths: ['packages/api'], touchedFiles: [] },
      }).success,
    ).toBe(true)
    expect(
      task_create_resultSchema.safeParse({
        taskId,
      }).success,
    ).toBe(true)
  })

  it('squadId may be null (pool task)', () => {
    expect(
      task_create_paramsSchema.safeParse({
        workspaceId,
        squadId: null,
        parentTaskId: null,
        title: 'pool task',
        behavior: 'b',
        verification: 'v',
        scope: { paths: [], touchedFiles: [] },
      }).success,
    ).toBe(true)
  })
})

describe('task.cancel / list / get', () => {
  it('cancel/get take taskId, list takes workspaceId + optional state filter', () => {
    expect(task_cancel_paramsSchema.safeParse({ taskId, reason: 'changed mind' }).success).toBe(
      true,
    )
    expect(task_get_paramsSchema.safeParse({ taskId }).success).toBe(true)
    expect(task_list_paramsSchema.safeParse({ workspaceId }).success).toBe(true)
    expect(task_list_paramsSchema.safeParse({ workspaceId, state: 'active' }).success).toBe(true)
    expect(task_list_paramsSchema.safeParse({ workspaceId, state: 'fake' }).success).toBe(false)
  })

  it('task.list returns an array of taskIds (light) and optionally a paging cursor', () => {
    expect(task_list_resultSchema.safeParse({ taskIds: [taskId] }).success).toBe(true)
  })
})

describe('task.assign / requestReview / submitReviewVerdict / run / replay', () => {
  it('assign + requestReview enforce worker/checker separation at schema level', () => {
    expect(
      task_assign_paramsSchema.safeParse({ taskId, assigneeId: agentA, reviewerId: agentB })
        .success,
    ).toBe(true)
    expect(
      task_assign_paramsSchema.safeParse({ taskId, assigneeId: agentA, reviewerId: agentA })
        .success,
    ).toBe(false)
    expect(task_requestReview_paramsSchema.safeParse({ taskId, reviewerId: agentB }).success).toBe(
      true,
    )
  })

  it('submitReviewVerdict accepts a complete verdict', () => {
    expect(
      task_submitReviewVerdict_paramsSchema.safeParse({
        taskId,
        verdict: { score: 10, notes: 'lgtm', reviewerId: agentB },
      }).success,
    ).toBe(true)
  })

  it('task.run kicks off execution and returns the run-id', () => {
    expect(task_run_paramsSchema.safeParse({ taskId }).success).toBe(true)
  })

  it('task.replay returns the event-log slice for a task', () => {
    expect(task_replay_paramsSchema.safeParse({ taskId }).success).toBe(true)
    expect(
      task_replay_resultSchema.safeParse({
        events: [
          {
            id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            ts: 0,
            workspaceId,
            taskId,
            agentId: agentA,
            type: 'output',
            payload: { chunk: 'hi' },
          },
        ],
      }).success,
    ).toBe(true)
  })
})
