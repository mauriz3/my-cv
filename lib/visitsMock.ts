import {
  DEVICE_KEYS,
  HOUR_SLOTS,
  SOURCE_KEYS,
  WEEK_DAYS,
  groupSmallCountries,
  percentagePointChange,
  relativeChange,
  sum,
  type VisitsRange,
  type VisitsReport,
} from './visits'

/**
 * Datos de ejemplo (mock) de la página «Visitas», deterministas: mismo rango → mismo informe.
 * Series de 7 y 30 días tomadas de la especificación (tanda B); la de 1 día, por horas.
 * Se sustituirán por el informe de Google Analytics en el servidor, con el mismo contrato.
 */

/** Fin fijo del periodo de ejemplo: así el JSON generado no cambia entre builds. */
export const MOCK_GENERATED_AT = '2026-10-31T00:00:00Z'
const MOCK_LAST_DAY_UTC = Date.UTC(2026, 9, 30)
const MS_PER_DAY = 86_400_000
const HOURS_PER_DAY = 24

interface RangeMock {
  current: readonly number[]
  previous: readonly number[]
  visitors: { value: number; prev: number }
  avgDurationSec: { value: number; prev: number }
  bounceRate: { value: number; prev: number }
  /** Escala de los desgloses (países, páginas, horas) respecto a los 30 días. */
  breakdownScale: number
}

const RANGE_MOCKS: Record<VisitsRange, RangeMock> = {
  '1d': {
    current: [1, 0, 1, 0, 0, 1, 2, 2, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 2, 2, 1],
    previous: [1, 1, 0, 0, 1, 1, 1, 2, 3, 3, 4, 4, 3, 4, 4, 3, 3, 4, 4, 3, 3, 2, 1, 1],
    visitors: { value: 46, prev: 44 },
    avgDurationSec: { value: 98, prev: 104 },
    bounceRate: { value: 0.43, prev: 0.4 },
    breakdownScale: 0.035,
  },
  '7d': {
    current: [46, 52, 49, 58, 61, 33, 19],
    previous: [42, 47, 50, 51, 55, 36, 22],
    visitors: { value: 251, prev: 244 },
    avgDurationSec: { value: 112, prev: 106 },
    bounceRate: { value: 0.39, prev: 0.41 },
    breakdownScale: 0.22,
  },
  '30d': {
    current: [
      29, 39, 48, 45, 52, 57, 50, 53, 54, 43, 43, 32, 32, 33, 25, 29, 34, 30, 38, 47, 45, 55, 53, 62, 69, 63, 68, 70,
      61, 61,
    ],
    previous: [
      22, 37, 43, 40, 45, 48, 41, 43, 49, 39, 38, 28, 27, 26, 18, 28, 31, 27, 33, 39, 37, 44, 49, 55, 60, 54, 57, 58,
      49, 55,
    ],
    visitors: { value: 932, prev: 863 },
    avgDurationSec: { value: 106, prev: 110 },
    bounceRate: { value: 0.41, prev: 0.44 },
    breakdownScale: 1,
  },
}

/* Desgloses de 30 días (especificación). Dispositivos y fuentes van en %: no se escalan. */
const DEVICE_SHARES: Record<(typeof DEVICE_KEYS)[number], number> = { mobile: 58, desktop: 36, tablet: 6 }
const SOURCE_SHARES: Record<(typeof SOURCE_KEYS)[number], number> = {
  organic: 41,
  direct: 27,
  linkedin: 18,
  referral: 10,
  other: 4,
}
const COUNTRY_VISITS_30D = { ES: 412, US: 236, MX: 118, GB: 97, DE: 84, AR: 61, IN: 52, IT: 49 }
/** Rutas reales del sitio (sin prefijo de idioma). */
const PAGE_VIEWS_30D = {
  '/': 1120,
  '/experience': 684,
  '/projects': 512,
  '/skills': 437,
  '/Resume-Maurizio-Rendon-en.pdf': 268,
  '/education': 190,
}
/** `[día][franja de 3 h]`, lunes a domingo. */
const HOUR_SLOT_VISITS_30D = [
  [6, 6, 5, 27, 34, 24, 40, 19],
  [8, 2, 8, 23, 37, 26, 36, 22],
  [11, 4, 4, 26, 33, 29, 38, 18],
  [7, 7, 6, 22, 36, 25, 40, 20],
  [9, 3, 8, 22, 29, 25, 34, 21],
  [3, 4, 3, 15, 17, 11, 20, 9],
  [5, 1, 5, 10, 18, 12, 14, 11],
]

function isoDay(msUtc: number): string {
  return new Date(msUtc).toISOString().slice(0, 10)
}

/** Etiquetas ISO del periodo actual: horas del último día («1d») o días que acaban en el último día. */
export function mockTimeLabels(range: VisitsRange): string[] {
  if (range === '1d') {
    const day = isoDay(MOCK_LAST_DAY_UTC)
    return Array.from({ length: HOURS_PER_DAY }, (_, hour) => `${day}T${String(hour).padStart(2, '0')}`)
  }
  const days = RANGE_MOCKS[range].current.length
  return Array.from({ length: days }, (_, index) => isoDay(MOCK_LAST_DAY_UTC - (days - 1 - index) * MS_PER_DAY))
}

export function buildMockReport(range: VisitsRange): VisitsReport {
  const mock = RANGE_MOCKS[range]
  const scaled = (value: number) => Math.round(value * mock.breakdownScale)
  const visits = { value: sum(mock.current), prev: sum(mock.previous) }

  return {
    range,
    generatedAt: MOCK_GENERATED_AT,
    sample: true,
    kpis: {
      visits: { ...visits, delta: relativeChange(visits.value, visits.prev) },
      visitors: { ...mock.visitors, delta: relativeChange(mock.visitors.value, mock.visitors.prev) },
      avgDurationSec: {
        ...mock.avgDurationSec,
        delta: relativeChange(mock.avgDurationSec.value, mock.avgDurationSec.prev),
      },
      bounceRate: {
        ...mock.bounceRate,
        deltaPp: percentagePointChange(mock.bounceRate.value, mock.bounceRate.prev),
      },
    },
    timeseries: { labels: mockTimeLabels(range), current: [...mock.current], previous: [...mock.previous] },
    devices: DEVICE_KEYS.map((key) => ({ key, value: DEVICE_SHARES[key] })),
    countries: groupSmallCountries(
      Object.entries(COUNTRY_VISITS_30D).map(([iso, visits]) => ({ iso, visits: scaled(visits) })),
    ),
    sources: SOURCE_KEYS.map((key) => ({ key, value: SOURCE_SHARES[key] })),
    pages: Object.entries(PAGE_VIEWS_30D).map(([path, views]) => ({ path, views: scaled(views) })),
    hours: {
      days: [...WEEK_DAYS],
      slots: [...HOUR_SLOTS],
      values: HOUR_SLOT_VISITS_30D.map((day) => day.map(scaled)),
    },
  }
}
