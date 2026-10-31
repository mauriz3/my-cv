import { z } from 'zod'
import { DEVICE_KEYS, HOUR_SLOTS, SOURCE_KEYS, VISITS_RANGES, WEEK_DAYS } from './visits'

/**
 * Contrato del endpoint `GET /api/visits/:range` (mock hoy, Google Analytics mañana).
 * Lo valida el servidor antes de responder; el cliente solo importa el tipo.
 */
const Count = z.number().int().nonnegative()
const Share = z.number().min(0).max(1)

const CountKpi = z.object({ value: Count, prev: Count, delta: z.number() })

const BreakdownItem = <Keys extends readonly [string, ...string[]]>(keys: Keys) =>
  z.object({ key: z.enum(keys), value: Count })

export const VisitsReportSchema = z
  .object({
    range: z.enum(VISITS_RANGES),
    generatedAt: z.iso.datetime(),
    /** `true` mientras los datos sean de ejemplo (mock). */
    sample: z.boolean(),
    kpis: z.object({
      visits: CountKpi,
      visitors: CountKpi,
      avgDurationSec: CountKpi,
      bounceRate: z.object({ value: Share, prev: Share, deltaPp: z.number() }),
    }),
    /** `labels`: fechas ISO (`YYYY-MM-DD`) o, en «1d», horas ISO (`YYYY-MM-DDTHH`). */
    timeseries: z.object({ labels: z.array(z.string()), current: z.array(Count), previous: z.array(Count) }),
    /** Reparto en % (suma 100). */
    devices: z.array(BreakdownItem(DEVICE_KEYS)),
    countries: z.array(z.object({ iso: z.string().regex(/^([A-Z]{2}|OTHER)$/), visits: Count })),
    /** Reparto en % (suma 100). */
    sources: z.array(BreakdownItem(SOURCE_KEYS)),
    pages: z.array(z.object({ path: z.string().startsWith('/'), views: Count })),
    hours: z.object({
      days: z.array(z.enum(WEEK_DAYS)),
      slots: z.array(z.enum(HOUR_SLOTS)),
      /** `values[día][franja]` */
      values: z.array(z.array(Count)),
    }),
  })
  .strict()

export type VisitsReport = z.infer<typeof VisitsReportSchema>
