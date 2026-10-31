import type { VisitsReport } from './visitsSchema'

/*
 * Lógica pura de la página «Visitas». Sin zod en tiempo de ejecución: el esquema (`visitsSchema.ts`)
 * solo lo usa el servidor, así el cliente no lo descarga.
 */

/* ---------- Rangos del filtro ---------- */

/** Rangos del filtro «1 día · 1 semana · 1 mes». */
export const VISITS_RANGES = ['1d', '7d', '30d'] as const
export type VisitsRange = (typeof VISITS_RANGES)[number]
export const DEFAULT_VISITS_RANGE: VisitsRange = '30d'

export function isVisitsRange(value: unknown): value is VisitsRange {
  return VISITS_RANGES.includes(value as VisitsRange)
}

/** Ruta del informe de un rango (mismo origen). */
export function visitsEndpoint(range: VisitsRange): string {
  return `/api/visits/${range}`
}

/* ---------- Valores del informe ---------- */

/** Privacidad: los países con menos visitas se agrupan en «Otros». */
export const MIN_VISITS_PER_COUNTRY = 5
export const OTHER_COUNTRIES_ISO = 'OTHER'

export const DEVICE_KEYS = ['mobile', 'desktop', 'tablet'] as const
export const SOURCE_KEYS = ['organic', 'direct', 'linkedin', 'referral', 'other'] as const
export const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type WeekDay = (typeof WEEK_DAYS)[number]
/** Franjas de 3 h (hora de inicio). */
export const HOUR_SLOTS = ['00', '03', '06', '09', '12', '15', '18', '21'] as const

export type { VisitsReport }
export type VisitsKpis = VisitsReport['kpis']
export type CountryVisits = VisitsReport['countries'][number]

/* ---------- Agregados ---------- */

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

/** Cambio relativo redondeado a 2 decimales (0,12 = +12 %). Sin periodo anterior no hay cambio. */
export function relativeChange(value: number, prev: number): number {
  if (prev === 0) return 0
  return Math.round((value / prev - 1) * 100) / 100
}

/** Diferencia en puntos porcentuales entre dos tasas (0,41 − 0,44 = −3 pp). */
export function percentagePointChange(value: number, prev: number): number {
  return Math.round((value - prev) * 100)
}

/** Primer máximo de una serie (índice y valor), o `undefined` si está vacía. */
export function peakOf(values: readonly number[]): { index: number; value: number } | undefined {
  if (values.length === 0) return undefined
  const value = Math.max(...values)
  return { index: values.indexOf(value), value }
}

/** Privacidad: agrupa en «Otros» los países por debajo del mínimo y ordena de más a menos visitas. */
export function groupSmallCountries(
  countries: readonly CountryVisits[],
  minVisits = MIN_VISITS_PER_COUNTRY,
): CountryVisits[] {
  const shown = countries.filter((country) => country.visits >= minVisits).sort((a, b) => b.visits - a.visits)
  const otherVisits = sum(countries.filter((country) => country.visits < minVisits).map((country) => country.visits))
  return otherVisits > 0 ? [...shown, { iso: OTHER_COUNTRIES_ISO, visits: otherVisits }] : shown
}

/* ---------- Tendencia de los KPI ---------- */

export type KpiKey = keyof VisitsKpis
export type Trend = 'better' | 'worse' | 'flat'

/** En el rebote, bajar es mejorar; en el resto, subir. */
const LOWER_IS_BETTER: ReadonlySet<KpiKey> = new Set(['bounceRate'])

export function kpiTrend(key: KpiKey, change: number): Trend {
  if (change === 0) return 'flat'
  const improved = LOWER_IS_BETTER.has(key) ? change < 0 : change > 0
  return improved ? 'better' : 'worse'
}

/** Sentido del cambio (la flecha), independiente de si es bueno o malo (el color). */
export function changeDirection(change: number): 'up' | 'down' | 'flat' {
  if (change === 0) return 'flat'
  return change > 0 ? 'up' : 'down'
}

/** Cambio de un KPI: relativo para los recuentos, en puntos para el rebote. */
export function kpiChange(kpis: VisitsKpis, key: KpiKey): number {
  const kpi = kpis[key]
  return 'deltaPp' in kpi ? kpi.deltaPp : kpi.delta
}

/* ---------- Formato (independiente del idioma salvo `locale`) ---------- */

const SECONDS_PER_MINUTE = 60

/** «1m 46s», «45s». */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = Math.round(totalSeconds % SECONDS_PER_MINUTE)
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

/** Con separador de miles también en 4 cifras (en español Intl lo omite por defecto: «1420» → «1.420»). */
export function formatInteger(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { useGrouping: 'always' }).format(value)
}

/** 0,41 → «41 %» / «41%» según el idioma. */
export function formatShare(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value)
}

/** Cambio de un KPI con signo: «+12 %» (relativo) o «−3 pp» (puntos). */
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

/** Etiqueta del eje temporal según el rango: hora («14:00»), día de la semana («Mon») o fecha («28 Oct»). */
export function formatTimeLabel(isoLabel: string, range: VisitsRange, locale: string): string {
  if (range === '1d') return `${isoLabel.slice(11, 13)}:00`
  // Mediodía UTC: el día no cambia por la zona horaria del navegador.
  const date = new Date(`${isoLabel.slice(0, 10)}T12:00:00Z`)
  const options: Intl.DateTimeFormatOptions =
    range === '7d' ? { weekday: 'short', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' }
  return new Intl.DateTimeFormat(locale, options).format(date)
}

/** Lunes = 2026-10-26 (UTC): referencia para traducir `mon…sun` con Intl. */
const REFERENCE_MONDAY_UTC = Date.UTC(2026, 9, 26, 12)
const MS_PER_DAY = 86_400_000

export function formatWeekDay(day: WeekDay, locale: string): string {
  const date = new Date(REFERENCE_MONDAY_UTC + WEEK_DAYS.indexOf(day) * MS_PER_DAY)
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(date)
}

/** Nombre del país en el idioma de la página («España», «Spain»); «OTHER» lo traduce quien llama. */
export function formatCountry(iso: string, locale: string): string {
  return new Intl.DisplayNames([locale], { type: 'region' }).of(iso) ?? iso
}

/** Sin visitas en el periodo: la página enseña el estado vacío en lugar de las gráficas. */
export function isEmptyReport(report: VisitsReport): boolean {
  return report.kpis.visits.value === 0
}

/* ---------- Escala secuencial (mapa y mapa de calor) ---------- */

const MIN_HEAT_ALPHA = 0.1

/** Opacidad de la escala secuencial: 0,1 (mínimo) a 1 (máximo). */
export function heatAlpha(value: number, max: number): number {
  if (max <= 0) return MIN_HEAT_ALPHA
  return MIN_HEAT_ALPHA + (1 - MIN_HEAT_ALPHA) * Math.min(value / max, 1)
}

/** `#RRGGBB` + opacidad → `rgba(r, g, b, a)` (Chart.js no entiende `color-mix`). */
export function withAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((start) => Number.parseInt(hex.slice(start, start + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`
}
