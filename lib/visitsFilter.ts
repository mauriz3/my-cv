import { DEFAULT_VISITS_RANGE, VISITS_RANGES, type VisitsRange, type VisitsReport } from './visits'

/**
 * Filtro de la página «Visitas»: los 3 rangos reales más «Datos de ejemplo» (el mock, para ver la página con
 * muchos datos). Lógica pura: qué filtro se elige por defecto, qué estado tienen los datos y qué nota se enseña.
 */

export const SAMPLE_FILTER = 'sample'
export const VISITS_FILTERS = [...VISITS_RANGES, SAMPLE_FILTER] as const
export type VisitsFilter = (typeof VISITS_FILTERS)[number]

/** El ejemplo enseña el mes: es el rango con más datos. */
export const SAMPLE_RANGE: VisitsRange = '30d'

/** Rango del informe que pide un filtro. */
export function rangeOfFilter(filter: VisitsFilter): VisitsRange {
  return filter === SAMPLE_FILTER ? SAMPLE_RANGE : filter
}

/**
 * Comprobación mínima del contrato en el cliente (sin zod: el servidor ya valida con `visitsSchema.ts`).
 * Basta para no pintar una respuesta rota (HTML de error, JSON de otro rango, sin KPI…).
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

/** De dónde vienen los datos de una respuesta: GA4 (`real`), el mock del servidor (`sample`) o nada útil (`failed`). */
export type VisitsDataState = 'real' | 'sample' | 'failed'

export function dataStateOf(response: unknown, range: VisitsRange): VisitsDataState {
  if (!isUsableReport(response, range)) return 'failed'
  return response.sample ? 'sample' : 'real'
}

/** Con datos reales, 1 mes; si la API falla o solo tiene el mock, «Datos de ejemplo». */
export function defaultVisitsFilter(state: VisitsDataState): VisitsFilter {
  return state === 'real' ? DEFAULT_VISITS_RANGE : SAMPLE_FILTER
}

/**
 * Nota bajo los filtros:
 * - `updated`: datos reales → «Datos actualizados hace X» (con `generatedAt`).
 * - `sampleChosen`: hay datos reales, pero se ha elegido «Datos de ejemplo».
 * - `sampleFallback`: no hay datos reales (API caída o solo el mock): se ven datos de ejemplo.
 * - `none`: aún no hay informe.
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
