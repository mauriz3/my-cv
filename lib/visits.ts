import type { VisitsReport } from './visitsSchema'

/*
 * Pure logic for the Visits page. No zod at runtime: the schema (`visitsSchema.ts`)
 * is server-only so the client does not download it.
 */

/* ---------- Filter ranges ---------- */

/** Filter ranges «1 day · 1 week · 1 month». */
export const VISITS_RANGES = ['1d', '7d', '30d'] as const
export type VisitsRange = (typeof VISITS_RANGES)[number]
export const DEFAULT_VISITS_RANGE: VisitsRange = '30d'

export function isVisitsRange(value: unknown): value is VisitsRange {
  return VISITS_RANGES.includes(value as VisitsRange)
}

/** Report URL for a range (same origin). */
export function visitsEndpoint(range: VisitsRange): string {
  return `/api/visits/${range}`
}

/* ---------- Report values ---------- */

/** Privacy: countries below the visit threshold roll into «Other». */
export const MIN_VISITS_PER_COUNTRY = 5
export const OTHER_COUNTRIES_ISO = 'OTHER'

export const DEVICE_KEYS = ['mobile', 'desktop', 'tablet'] as const
export const SOURCE_KEYS = ['organic', 'direct', 'linkedin', 'referral', 'other'] as const
export const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type WeekDay = (typeof WEEK_DAYS)[number]
/** 3-hour slots (start hour). */
export const HOUR_SLOTS = ['00', '03', '06', '09', '12', '15', '18', '21'] as const

/**
 * Allowlist of site paths (locale prefix removed) the «Most viewed pages» chart may show:
 * navigation pages, privacy, and the resume PDFs. Any other GA4 `pagePath` (spam hits, typos, old URLs)
 * is dropped, so free text from requests never reaches the public report.
 * Kept in sync with navigation, privacy, and resume links by tests/unit/visits.spec.ts.
 */
export const REPORTED_PAGE_PATHS = [
  '/',
  '/skills',
  '/experience',
  '/projects',
  '/education',
  '/visits',
  '/privacy',
  '/Resume-Maurizio-Rendon-en.pdf',
  '/Resume-Maurizio-Rendon-es.pdf',
] as const
export type ReportedPagePath = (typeof REPORTED_PAGE_PATHS)[number]

export function isReportedPagePath(path: string): path is ReportedPagePath {
  return (REPORTED_PAGE_PATHS as readonly string[]).includes(path)
}

export type { VisitsReport }
export type VisitsKpis = VisitsReport['kpis']
export type CountryVisits = VisitsReport['countries'][number]

/* ---------- Aggregates ---------- */

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

/** Relative change rounded to 2 decimals (0.12 = +12%). No prior period → no change. */
export function relativeChange(value: number, prev: number): number {
  if (prev === 0) return 0
  return Math.round((value / prev - 1) * 100) / 100
}

/** Percentage-point difference between two rates (0.41 − 0.44 = −3 pp). */
export function percentagePointChange(value: number, prev: number): number {
  return Math.round((value - prev) * 100)
}

/** First maximum in a series (index and value), or `undefined` if empty. */
export function peakOf(values: readonly number[]): { index: number; value: number } | undefined {
  if (values.length === 0) return undefined
  const value = Math.max(...values)
  return { index: values.indexOf(value), value }
}

/** Privacy: roll sub-threshold countries into «Other» and sort by visits descending. */
export function groupSmallCountries(
  countries: readonly CountryVisits[],
  minVisits = MIN_VISITS_PER_COUNTRY,
): CountryVisits[] {
  const shown = countries.filter((country) => country.visits >= minVisits).sort((a, b) => b.visits - a.visits)
  const otherVisits = sum(countries.filter((country) => country.visits < minVisits).map((country) => country.visits))
  return otherVisits > 0 ? [...shown, { iso: OTHER_COUNTRIES_ISO, visits: otherVisits }] : shown
}

/* ---------- KPI trends ---------- */

export type KpiKey = keyof VisitsKpis
export type Trend = 'better' | 'worse' | 'flat'

/** For bounce rate, down is better; for the rest, up is better. */
const LOWER_IS_BETTER: ReadonlySet<KpiKey> = new Set(['bounceRate'])

export function kpiTrend(key: KpiKey, change: number): Trend {
  if (change === 0) return 'flat'
  const improved = LOWER_IS_BETTER.has(key) ? change < 0 : change > 0
  return improved ? 'better' : 'worse'
}

/** Direction of change (the arrow), independent of good/bad (the color). */
export function changeDirection(change: number): 'up' | 'down' | 'flat' {
  if (change === 0) return 'flat'
  return change > 0 ? 'up' : 'down'
}

/** KPI change: relative for counts, points for bounce rate. */
export function kpiChange(kpis: VisitsKpis, key: KpiKey): number {
  const kpi = kpis[key]
  return 'deltaPp' in kpi ? kpi.deltaPp : kpi.delta
}

/* ---------- Formatting (locale-independent except `locale`) ---------- */

const SECONDS_PER_MINUTE = 60

/** «1m 46s», «45s». */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = Math.round(totalSeconds % SECONDS_PER_MINUTE)
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

/** Thousands separator even for 4 digits (Spanish Intl omits by default: «1420» → «1.420»). */
export function formatInteger(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { useGrouping: 'always' }).format(value)
}

/** 0.41 → «41 %» / «41%» per locale. */
export function formatShare(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value)
}

/** KPI change with sign: «+12 %» (relative) or «−3 pp» (points). */
export function formatKpiChange(key: KpiKey, change: number, locale: string): string {
  if (key === 'bounceRate') {
    const points = new Intl.NumberFormat(locale, { signDisplay: 'exceptZero' }).format(change)
    return `${points} pp`
  }
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
    signDisplay: 'exceptZero',
  }).format(change)
}

/** Time axis label by range: hour («14:00»), weekday («Mon»), or date («28 Oct»). */
export function formatTimeLabel(isoLabel: string, range: VisitsRange, locale: string): string {
  if (range === '1d') return `${isoLabel.slice(11, 13)}:00`
  // Noon UTC: the calendar day does not shift with the browser time zone.
  const date = new Date(`${isoLabel.slice(0, 10)}T12:00:00Z`)
  const options: Intl.DateTimeFormatOptions =
    range === '7d' ? { weekday: 'short', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' }
  return new Intl.DateTimeFormat(locale, options).format(date)
}

/** Monday = 2026-10-26 (UTC): reference to format `mon…sun` with Intl. */
const REFERENCE_MONDAY_UTC = Date.UTC(2026, 9, 26, 12)
const MS_PER_DAY = 86_400_000

export function formatWeekDay(day: WeekDay, locale: string): string {
  const date = new Date(REFERENCE_MONDAY_UTC + WEEK_DAYS.indexOf(day) * MS_PER_DAY)
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(date)
}

/** Country name in the page language (e.g. Spain / España); caller translates «OTHER». */
export function formatCountry(iso: string, locale: string): string {
  return new Intl.DisplayNames([locale], { type: 'region' }).of(iso) ?? iso
}

/** No visits in the period: the page shows the empty state instead of charts. */
export function isEmptyReport(report: VisitsReport): boolean {
  return report.kpis.visits.value === 0
}

/* ---------- Sequential scale (bubble map and heatmap) ---------- */

const MIN_HEAT_ALPHA = 0.1

/** Sequential scale opacity: 0.1 (min) to 1 (max). */
export function heatAlpha(value: number, max: number): number {
  if (max <= 0) return MIN_HEAT_ALPHA
  return MIN_HEAT_ALPHA + (1 - MIN_HEAT_ALPHA) * Math.min(value / max, 1)
}

/** `#RRGGBB` + opacity → `rgba(r, g, b, a)` (Chart.js does not understand `color-mix`). */
export function withAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((start) => Number.parseInt(hex.slice(start, start + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`
}
