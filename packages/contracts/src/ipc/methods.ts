import { z } from 'zod'

/**
 * Canonical list of all RPC methods. Order groups methods by area for readability;
 * tools that iterate (e.g., docs generators) rely on this order.
 *
 * To add a method:
 *  1. Add the literal to METHOD_NAMES (preserving area grouping).
 *  2. Add a method-specific schema in ipc/methods.<area>.ts.
 *  3. Add a method-specific test in tests/ipc/methods.<area>.test.ts.
 *  4. Bump CONTRACTS_VERSION minor.
 */
export const METHOD_NAMES = [
  // workspaces
  'workspace.list',
  'workspace.add',
  'workspace.activate',
  'workspace.remove',
  // runtime + adapters
  'runtime.scan',
  'adapter.list',
  'adapter.install',
  'adapter.uninstall',
  'adapter.configure',
  // fleet
  'squad.create',
  'squad.delete',
  'squad.rename',
  'squad.addMember',
  'squad.removeMember',
  'squad.setLeader',
  'pool.list',
  'pool.promote',
  'pool.release',
  // tasks
  'task.create',
  'task.cancel',
  'task.list',
  'task.get',
  'task.assign',
  'task.requestReview',
  'task.submitReviewVerdict',
  'task.run',
  'task.replay',
  // events
  'events.subscribe',
  'events.unsubscribe',
  'events.query',
] as const

export const MethodNameSchema = z.enum(METHOD_NAMES)
export type MethodName = z.infer<typeof MethodNameSchema>
