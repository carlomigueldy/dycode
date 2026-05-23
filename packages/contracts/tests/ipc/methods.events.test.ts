import { describe, expect, it } from 'vitest'
import {
  events_query_paramsSchema,
  events_query_resultSchema,
  events_subscribe_paramsSchema,
  events_subscribe_resultSchema,
  events_unsubscribe_paramsSchema,
} from '../../src/ipc/methods.events.js'

const workspaceId = 'ws_01ARZ3NDEKTSV4RRFFQ69G5FAV'

describe('events.subscribe', () => {
  it('takes optional filter, returns a subscription handle', () => {
    expect(events_subscribe_paramsSchema.safeParse({}).success).toBe(true)
    expect(events_subscribe_paramsSchema.safeParse({ filter: { workspaceId } }).success).toBe(true)
    expect(
      events_subscribe_resultSchema.safeParse({ subscriptionId: 'sub_01ARZ3NDEKTSV4RRFFQ69G5FAV' })
        .success,
    ).toBe(true)
  })
})

describe('events.unsubscribe', () => {
  it('takes subscriptionId', () => {
    expect(events_unsubscribe_paramsSchema.safeParse({ subscriptionId: 'sub_x' }).success).toBe(
      true,
    )
  })
})

describe('events.query', () => {
  it('takes filter + paging cursor, returns events + nextCursor', () => {
    expect(events_query_paramsSchema.safeParse({ workspaceId }).success).toBe(true)
    expect(events_query_paramsSchema.safeParse({ workspaceId, limit: 100 }).success).toBe(true)
    expect(events_query_resultSchema.safeParse({ events: [], nextCursor: null }).success).toBe(true)
  })

  it('rejects limit > 1000', () => {
    expect(events_query_paramsSchema.safeParse({ workspaceId, limit: 5000 }).success).toBe(false)
  })
})
