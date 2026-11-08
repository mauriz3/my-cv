import { z } from './zod'
import { DEVICE_KEYS, HOUR_SLOTS, REPORTED_PAGE_PATHS, SOURCE_KEYS, VISITS_RANGES, WEEK_DAYS } from './visits'

/**
 * Contract for `GET /api/visits/:range` (GA4 snapshot or mock).
 * Validated on the server before save and response; the client only imports the type.
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
    /** `true` if data is sample (mock). `generatedAt` is the GA4 snapshot time. */
    sample: z.boolean(),
    kpis: z.object({
      visits: CountKpi,
      visitors: CountKpi,
      avgDurationSec: CountKpi,
      bounceRate: z.object({ value: Share, prev: Share, deltaPp: z.number() }),
    }),
    /** `labels`: ISO dates (`YYYY-MM-DD`) or, for «1d», ISO hours (`YYYY-MM-DDTHH`). */
    timeseries: z.object({ labels: z.array(z.string()), current: z.array(Count), previous: z.array(Count) }),
    /** Share in % (sums to 100). */
    devices: z.array(BreakdownItem(DEVICE_KEYS)),
    countries: z.array(z.object({ iso: z.string().regex(/^([A-Z]{2}|OTHER)$/), visits: Count })),
    /** Share in % (sums to 100). */
    sources: z.array(BreakdownItem(SOURCE_KEYS)),
    /** Only allowlisted site paths: a snapshot carrying anything else is rejected. */
    pages: z.array(z.object({ path: z.enum(REPORTED_PAGE_PATHS), views: Count })),
    hours: z.object({
      days: z.array(z.enum(WEEK_DAYS)),
      slots: z.array(z.enum(HOUR_SLOTS)),
      /** `values[day][slot]` */
      values: z.array(z.array(Count)),
    }),
  })
  .strict()

export type VisitsReport = z.infer<typeof VisitsReportSchema>
