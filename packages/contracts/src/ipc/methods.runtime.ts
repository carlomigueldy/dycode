import { z } from 'zod'

const DetectedAdapterSchema = z
  .object({
    adapterId: z.string().min(1),
    version: z.string().min(1),
    path: z.string().min(1),
  })
  .strict()

export const runtime_scan_paramsSchema = z.object({}).strict()
export const runtime_scan_resultSchema = z
  .object({ detected: z.array(DetectedAdapterSchema) })
  .strict()

const InstalledAdapterSchema = z
  .object({
    adapterId: z.string().min(1),
    version: z.string().min(1),
    installed: z.boolean(),
  })
  .strict()

export const adapter_list_paramsSchema = z.object({}).strict()
export const adapter_list_resultSchema = z
  .object({ adapters: z.array(InstalledAdapterSchema) })
  .strict()

export const adapter_install_paramsSchema = z.object({ adapterId: z.string().min(1) }).strict()
export const adapter_install_resultSchema = z
  .object({ adapterId: z.string().min(1), version: z.string().min(1) })
  .strict()

export const adapter_uninstall_paramsSchema = adapter_install_paramsSchema
export const adapter_uninstall_resultSchema = z.object({ ok: z.literal(true) }).strict()

export const adapter_configure_paramsSchema = z
  .object({
    adapterId: z.string().min(1),
    config: z.record(z.unknown()),
  })
  .strict()
export const adapter_configure_resultSchema = z.object({ ok: z.literal(true) }).strict()
