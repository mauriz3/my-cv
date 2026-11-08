import { DEFAULT_VISITS_RANGE, VISITS_RANGES, type VisitsRange, type VisitsReport } from './visits'

/**
 * Visits page filter: the three real ranges plus «Sample data» (the mock, to view the page with
 * rich data). Pure logic: default filter, data state, and which note to show.
 */

export const SAMPLE_FILTER = 'sample'
export const VISITS_FILTERS = [...VISITS_RANGES, SAMPLE_FILTER] as const
export type VisitsFilter = (typeof VISITS_FILTERS)[number]

/** Sample shows the month: the range with the most data. */
export const SAMPLE_RANGE: VisitsRange = '30d'

/** Report range requested by a filter. */
export function rangeOfFilter(filter: VisitsFilter): VisitsRange {
  return filter === SAMPLE_FILTER ? SAMPLE_RANGE : filter
}

/**
 * Minimal client-side contract check (no zod: the server already validates with `visitsSchema.ts`).
 * Enough to avoid rendering a broken response (error HTML, wrong range JSON, missing KPIs…).
 */
export function isUsableReport(value: unknown, range: VisitsRange): value is VisitsReport {
  if (typeof value !== 'object' || value === null) return false
  const report = value as Partial<VisitsReport>
  return (
    report.range === range &&
    typeof report.sample === 'boolean' &&
    typeof report.generatedAt === 'string' &&
    !Number.isNaN(Date.parse(report.generatedAt)) &&
    typeof report.kpis?.visits?.value === 'number'
  )
}

/** Where response data comes from: GA4 (`real`), server mock (`sample`), or nothing useful (`failed`). */
export type VisitsDataState = 'real' | 'sample' | 'failed'

export function dataStateOf(response: unknown, range: VisitsRange): VisitsDataState {
  if (!isUsableReport(response, range)) return 'failed'
  return response.sample ? 'sample' : 'real'
}

/** With real data, 1 month; if the API fails or only has mock, «Sample data». */
export function defaultVisitsFilter(state: VisitsDataState): VisitsFilter {
  return state === 'real' ? DEFAULT_VISITS_RANGE : SAMPLE_FILTER
}

/**
 * Note under the filters:
 * - `updated`: real data → «Data updated X ago» (with `generatedAt`).
 * - `sampleChosen`: real data exists but «Sample data» was chosen.
 * - `sampleFallback`: no real data (API down or mock only): sample data is shown.
 * - `none`: no report yet.
 */
export type VisitsNote =
  | { kind: 'none' }
  | { kind: 'updated'; generatedAt: string }
  | { kind: 'sampleChosen' }
  | { kind: 'sampleFallback' }

export function visitsNote(report: VisitsReport | undefined, realDataAvailable: boolean): VisitsNote {
  if (!report) return { kind: 'none' }
  if (!report.sample) return { kind: 'updated', generatedAt: report.generatedAt }
  return { kind: realDataAvailable ? 'sampleChosen' : 'sampleFallback' }
}
