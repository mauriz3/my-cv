import { z } from 'zod'
import {
  DEVICE_KEYS,
  HOUR_SLOTS,
  OTHER_COUNTRIES_ISO,
  SOURCE_KEYS,
  WEEK_DAYS,
  groupSmallCountries,
  percentagePointChange,
  relativeChange,
  sum,
  type CountryVisits,
  type VisitsRange,
  type VisitsReport,
} from './visits'

/**
 * Informe de visitas a partir de la GA4 Data API (`runReport`), con el mismo contrato que el mock
 * (`VisitsReportSchema`). Aquí solo hay lógica pura: periodos, peticiones y mapeo de respuestas.
 * La llamada HTTP y el token se inyectan (`createGa4ReportFetcher`), así todo se prueba sin red.
 */

export const GA4_DATA_API_URL = 'https://analyticsdata.googleapis.com/v1beta'

/* ---------- Periodos ---------- */

const MS_PER_DAY = 86_400_000
const HOURS_PER_DAY = 24
const HOURS_PER_SLOT = 3
/** Días del periodo actual por rango. «1d» es el último día completo (el de hoy aún no está procesado en GA4). */
const RANGE_DAYS: Record<VisitsRange, number> = { '1d': 1, '7d': 7, '30d': 30 }

export interface DateRange {
  name: 'current' | 'previous'
  startDate: string
  endDate: string
}

export interface VisitsPeriods {
  current: DateRange
  previous: DateRange
  /** Etiquetas del eje (contrato): días `YYYY-MM-DD` o, en «1d», horas `YYYY-MM-DDTHH`. */
  labels: string[]
  /** Clave de GA4 de cada etiqueta del periodo actual y del anterior (`date` YYYYMMDD o `dateHour` YYYYMMDDHH). */
  currentKeys: string[]
  previousKeys: string[]
}

function isoDay(msUtc: number): string {
  return new Date(msUtc).toISOString().slice(0, 10)
}

function compactDay(day: string): string {
  return day.replaceAll('-', '')
}

function dayList(lastDayMs: number, days: number): string[] {
  return Array.from({ length: days }, (_, index) => isoDay(lastDayMs - (days - 1 - index) * MS_PER_DAY))
}

function hourList(day: string): string[] {
  return Array.from({ length: HOURS_PER_DAY }, (_, hour) => `${day}T${String(hour).padStart(2, '0')}`)
}

/** Periodo actual (acaba ayer, en días UTC) y el anterior de la misma longitud. */
export function visitsPeriods(range: VisitsRange, now: Date): VisitsPeriods {
  const days = RANGE_DAYS[range]
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const lastDayMs = todayMs - MS_PER_DAY
  const currentDays = dayList(lastDayMs, days)
  const previousDays = dayList(lastDayMs - days * MS_PER_DAY, days)
  const span = (name: DateRange['name'], list: string[]): DateRange => ({
    name,
    startDate: list[0] ?? '',
    endDate: list.at(-1) ?? '',
  })
  const byHour = range === '1d'
  const keysOf = (list: string[]) =>
    byHour ? list.flatMap(hourList).map((hour) => compactDay(hour).replace('T', '')) : list.map(compactDay)
  return {
    current: span('current', currentDays),
    previous: span('previous', previousDays),
    labels: byHour ? currentDays.flatMap(hourList) : currentDays,
    currentKeys: keysOf(currentDays),
    previousKeys: keysOf(previousDays),
  }
}

/* ---------- Peticiones (runReport) ---------- */

export const GA4_REPORT_NAMES = ['kpis', 'timeseries', 'devices', 'countries', 'sources', 'pages', 'hours'] as const
export type Ga4ReportName = (typeof GA4_REPORT_NAMES)[number]

export interface RunReportRequest {
  dateRanges: DateRange[]
  dimensions?: { name: string }[]
  metrics: { name: string }[]
  limit?: number
  orderBys?: { metric: { metricName: string }; desc: boolean }[]
}

const SESSIONS = { name: 'sessions' }
const KPI_METRICS = ['sessions', 'totalUsers', 'averageSessionDuration', 'bounceRate'] as const
/** Límites de filas por informe: de sobra para un CV (países del mundo, páginas, 7 × 24 horas). */
const ROW_LIMITS = { countries: 250, sources: 500, pages: 100, hours: 7 * HOURS_PER_DAY, timeseries: 2 * 31 * HOURS_PER_DAY }

const dimensions = (...names: string[]) => names.map((name) => ({ name }))

/** Las 7 peticiones de un rango. Los desgloses usan solo el periodo actual. */
export function buildGa4Requests(periods: VisitsPeriods, range: VisitsRange): Record<Ga4ReportName, RunReportRequest> {
  const both = [periods.current, periods.previous]
  const current = [periods.current]
  return {
    kpis: { dateRanges: both, metrics: KPI_METRICS.map((name) => ({ name })) },
    timeseries: {
      dateRanges: both,
      dimensions: dimensions(range === '1d' ? 'dateHour' : 'date'),
      metrics: [SESSIONS],
      limit: ROW_LIMITS.timeseries,
    },
    devices: { dateRanges: current, dimensions: dimensions('deviceCategory'), metrics: [SESSIONS] },
    countries: { dateRanges: current, dimensions: dimensions('countryId'), metrics: [SESSIONS], limit: ROW_LIMITS.countries },
    sources: {
      dateRanges: current,
      dimensions: dimensions('sessionDefaultChannelGroup', 'sessionSource'),
      metrics: [SESSIONS],
      limit: ROW_LIMITS.sources,
    },
    pages: {
      dateRanges: current,
      dimensions: dimensions('pagePath'),
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: ROW_LIMITS.pages,
    },
    hours: { dateRanges: current, dimensions: dimensions('dayOfWeek', 'hour'), metrics: [SESSIONS], limit: ROW_LIMITS.hours },
  }
}

/* ---------- Respuestas ---------- */

/** Lo que se usa de la respuesta de runReport. Sin filas = sin datos (GA4 omite `rows`). */
export const RunReportResponseSchema = z.object({
  dimensionHeaders: z.array(z.object({ name: z.string() })).default([]),
  metricHeaders: z.array(z.object({ name: z.string() })).default([]),
  rows: z
    .array(
      z.object({
        dimensionValues: z.array(z.object({ value: z.string() })).default([]),
        metricValues: z.array(z.object({ value: z.string() })).default([]),
      }),
    )
    .default([]),
})
export type RunReportResponse = z.infer<typeof RunReportResponseSchema>

/** Filas como objetos `{ dimensión: valor }` y `{ métrica: número }` (por nombre de cabecera, no por posición). */
interface Row {
  dims: Record<string, string>
  metrics: Record<string, number>
}

function rowsOf(response: RunReportResponse): Row[] {
  return response.rows.map((row) => ({
    dims: Object.fromEntries(response.dimensionHeaders.map((header, i) => [header.name, row.dimensionValues[i]?.value ?? ''])),
    metrics: Object.fromEntries(
      response.metricHeaders.map((header, i) => [header.name, Number(row.metricValues[i]?.value ?? 0) || 0]),
    ),
  }))
}

/** Con varios periodos GA4 añade la dimensión `dateRange` con el nombre de cada uno. */
const DATE_RANGE_DIMENSION = 'dateRange'
const inRange = (name: DateRange['name']) => (row: Row) => (row.dims[DATE_RANGE_DIMENSION] ?? name) === name

/** Tasas (rebote) con 2 decimales, como en el contrato. */
const roundShare = (value: number) => Math.round(value * 100) / 100

function mapKpis(response: RunReportResponse): VisitsReport['kpis'] {
  const rows = rowsOf(response)
  const metric = (name: DateRange['name'], key: (typeof KPI_METRICS)[number]) => rows.find(inRange(name))?.metrics[key] ?? 0
  const count = (key: (typeof KPI_METRICS)[number]) => {
    const value = Math.round(metric('current', key))
    const prev = Math.round(metric('previous', key))
    return { value, prev, delta: relativeChange(value, prev) }
  }
  const bounce = { value: roundShare(metric('current', 'bounceRate')), prev: roundShare(metric('previous', 'bounceRate')) }
  return {
    visits: count('sessions'),
    visitors: count('totalUsers'),
    avgDurationSec: count('averageSessionDuration'),
    bounceRate: { ...bounce, deltaPp: percentagePointChange(bounce.value, bounce.prev) },
  }
}

function mapTimeseries(response: RunReportResponse, periods: VisitsPeriods): VisitsReport['timeseries'] {
  const rows = rowsOf(response)
  const series = (name: DateRange['name'], keys: string[]) => {
    const byKey = new Map(
      rows.filter(inRange(name)).map((row) => [row.dims.dateHour ?? row.dims.date ?? '', Math.round(row.metrics.sessions ?? 0)]),
    )
    return keys.map((key) => byKey.get(key) ?? 0)
  }
  return {
    labels: periods.labels,
    current: series('current', periods.currentKeys),
    previous: series('previous', periods.previousKeys),
  }
}

/** Reparto en % enteros que suman 100 (resto mayor). Sin datos, todo a 0. */
export function toPercentShares(values: readonly number[]): number[] {
  const total = sum(values)
  if (total === 0) return values.map(() => 0)
  const exact = values.map((value) => (value / total) * 100)
  const shares = exact.map(Math.floor)
  const byRemainder = exact.map((value, index) => ({ index, remainder: value - Math.floor(value) }))
  byRemainder.sort((a, b) => b.remainder - a.remainder)
  for (const { index } of byRemainder.slice(0, 100 - sum(shares))) shares[index] = (shares[index] ?? 0) + 1
  return shares
}

function sharesByKey<Key extends string>(keys: readonly Key[], counts: Map<Key, number>) {
  const shares = toPercentShares(keys.map((key) => counts.get(key) ?? 0))
  return keys.map((key, index) => ({ key, value: shares[index] ?? 0 }))
}

function addTo<Key>(counts: Map<Key, number>, key: Key, value: number) {
  counts.set(key, (counts.get(key) ?? 0) + value)
}

const isDeviceKey = (value: string): value is (typeof DEVICE_KEYS)[number] => (DEVICE_KEYS as readonly string[]).includes(value)

/** Otras categorías de GA4 (p. ej. «smart tv») no están en el contrato: se descartan. */
function mapDevices(response: RunReportResponse): VisitsReport['devices'] {
  const counts = new Map<(typeof DEVICE_KEYS)[number], number>()
  for (const row of rowsOf(response)) {
    const device = row.dims.deviceCategory ?? ''
    if (isDeviceKey(device)) addTo(counts, device, row.metrics.sessions ?? 0)
  }
  return sharesByKey(DEVICE_KEYS, counts)
}

const LINKEDIN_SOURCE = /linkedin|lnkd\.in/i
const CHANNEL_TO_SOURCE: Record<string, (typeof SOURCE_KEYS)[number]> = {
  'Organic Search': 'organic',
  Direct: 'direct',
  Referral: 'referral',
}

/** Canal de GA4 → fuente del contrato. LinkedIn va aparte por origen (sea social o referral). */
export function sourceKey(channelGroup: string, source: string): (typeof SOURCE_KEYS)[number] {
  if (LINKEDIN_SOURCE.test(source)) return 'linkedin'
  return CHANNEL_TO_SOURCE[channelGroup] ?? 'other'
}

function mapSources(response: RunReportResponse): VisitsReport['sources'] {
  const counts = new Map<(typeof SOURCE_KEYS)[number], number>()
  for (const row of rowsOf(response)) {
    addTo(counts, sourceKey(row.dims.sessionDefaultChannelGroup ?? '', row.dims.sessionSource ?? ''), row.metrics.sessions ?? 0)
  }
  return sharesByKey(SOURCE_KEYS, counts)
}

const ISO_ALPHA2 = /^[A-Z]{2}$/

/** Países (ISO alfa-2) con el mismo agrupado de privacidad que el mock; «(not set)» suma en «Otros». */
function mapCountries(response: RunReportResponse): CountryVisits[] {
  const known: CountryVisits[] = []
  let unknownVisits = 0
  for (const row of rowsOf(response)) {
    const iso = row.dims.countryId ?? ''
    const visits = Math.round(row.metrics.sessions ?? 0)
    if (ISO_ALPHA2.test(iso)) known.push({ iso, visits })
    else unknownVisits += visits
  }
  const grouped = groupSmallCountries(known)
  if (unknownVisits === 0) return grouped
  const other = grouped.find((country) => country.iso === OTHER_COUNTRIES_ISO)
  if (other) other.visits += unknownVisits
  else grouped.push({ iso: OTHER_COUNTRIES_ISO, visits: unknownVisits })
  return grouped
}

/** Páginas que se muestran (como en el mock). */
export const TOP_PAGES = 6
/** Prefijos de idioma de las rutas (estrategia `prefix` de i18n): `/es/projects` y `/en/projects` son la misma página. */
const LOCALE_PREFIX = /^\/(?:en|es)(?=\/|$)/

export function pageWithoutLocale(path: string): string {
  const stripped = path.replace(LOCALE_PREFIX, '')
  const withSlash = stripped.startsWith('/') ? stripped : `/${stripped}`
  return withSlash.length > 1 ? withSlash.replace(/\/$/, '') : '/'
}

function mapPages(response: RunReportResponse): VisitsReport['pages'] {
  const views = new Map<string, number>()
  for (const row of rowsOf(response)) addTo(views, pageWithoutLocale(row.dims.pagePath ?? '/'), row.metrics.screenPageViews ?? 0)
  return [...views]
    .map(([path, count]) => ({ path, views: Math.round(count) }))
    .sort((a, b) => b.views - a.views)
    .slice(0, TOP_PAGES)
}

/** GA4 `dayOfWeek`: 0 = domingo. El contrato empieza en lunes. */
const DAYS_PER_WEEK = 7
const SUNDAY_FIRST_OFFSET = 6

function mapHours(response: RunReportResponse): VisitsReport['hours'] {
  const values = WEEK_DAYS.map(() => HOUR_SLOTS.map(() => 0))
  for (const row of rowsOf(response)) {
    const day = (Number(row.dims.dayOfWeek) + SUNDAY_FIRST_OFFSET) % DAYS_PER_WEEK
    const slot = Math.floor(Number(row.dims.hour) / HOURS_PER_SLOT)
    const cells = values[day]
    if (cells && slot in cells) cells[slot] = (cells[slot] ?? 0) + Math.round(row.metrics.sessions ?? 0)
  }
  return { days: [...WEEK_DAYS], slots: [...HOUR_SLOTS], values }
}

/** Las 7 respuestas de un rango → informe del contrato (aún sin validar: lo valida quien lo guarda o sirve). */
export function mapGa4Report(
  range: VisitsRange,
  periods: VisitsPeriods,
  responses: Record<Ga4ReportName, RunReportResponse>,
  now: Date,
): VisitsReport {
  return {
    range,
    generatedAt: now.toISOString(),
    sample: false,
    kpis: mapKpis(responses.kpis),
    timeseries: mapTimeseries(responses.timeseries, periods),
    devices: mapDevices(responses.devices),
    countries: mapCountries(responses.countries),
    sources: mapSources(responses.sources),
    pages: mapPages(responses.pages),
    hours: mapHours(responses.hours),
  }
}

/* ---------- Cliente ---------- */

export class Ga4Error extends Error {
  override name = 'Ga4Error'
}

export interface Ga4FetcherOptions {
  propertyId: string
  /** Token OAuth (se pide una vez por ejecución). */
  getAccessToken: () => Promise<string>
  fetch: typeof fetch
  now: Date
}

/** Ejecuta un runReport. El error solo lleva el estado HTTP y el código de Google, nunca el token. */
export async function runReport(options: Ga4FetcherOptions, request: RunReportRequest): Promise<RunReportResponse> {
  const response = await options.fetch(`${GA4_DATA_API_URL}/properties/${options.propertyId}:runReport`, {
    method: 'POST',
    headers: { authorization: `Bearer ${await options.getAccessToken()}`, 'content-type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    const status = await response
      .json()
      .then((body: { error?: { status?: string } }) => body.error?.status ?? '')
      .catch(() => '')
    throw new Ga4Error(`GA4 runReport respondió ${response.status} ${status}`.trim())
  }
  return RunReportResponseSchema.parse(await response.json())
}

/** Informe GA4 de un rango: 7 runReport en paralelo y mapeo al contrato. */
export async function fetchGa4Report(range: VisitsRange, options: Ga4FetcherOptions): Promise<VisitsReport> {
  const periods = visitsPeriods(range, options.now)
  const requests = buildGa4Requests(periods, range)
  const responses = await Promise.all(GA4_REPORT_NAMES.map((name) => runReport(options, requests[name])))
  const byName = Object.fromEntries(GA4_REPORT_NAMES.map((name, index) => [name, responses[index]])) as Record<
    Ga4ReportName,
    RunReportResponse
  >
  return mapGa4Report(range, periods, byName, options.now)
}
