import { describe, expect, it } from 'vitest'
import { DEFAULT_VISITS_RANGE, VISITS_RANGES } from '../../lib/visits'
import {
  SAMPLE_FILTER,
  SAMPLE_RANGE,
  VISITS_FILTERS,
  dataStateOf,
  defaultVisitsFilter,
  isUsableReport,
  rangeOfFilter,
  visitsNote,
} from '../../lib/visitsFilter'
import { buildMockReport } from '../../lib/visitsMock'
import { VisitsReportSchema } from '../../lib/visitsSchema'
import enMessages from '../../i18n/locales/en.json'
import esMessages from '../../i18n/locales/es.json'

const SNAPSHOT_AT = '2026-11-01T09:00:00.000Z'
const realReport = (range = DEFAULT_VISITS_RANGE) => ({ ...buildMockReport(range), sample: false, generatedAt: SNAPSHOT_AT })

describe('filtros de Visitas', () => {
  it('son los 3 rangos y, al final, «Datos de ejemplo»', () => {
    expect(VISITS_FILTERS).toEqual([...VISITS_RANGES, SAMPLE_FILTER])
  })

  it('cada rango pide su informe; el ejemplo, el del mes', () => {
    for (const range of VISITS_RANGES) expect(rangeOfFilter(range)).toBe(range)
    expect(rangeOfFilter(SAMPLE_FILTER)).toBe('30d')
    expect(SAMPLE_RANGE).toBe('30d')
  })

  it('el ejemplo generado en el cliente cumple el contrato del endpoint', () => {
    const sample = buildMockReport(SAMPLE_RANGE)
    expect(VisitsReportSchema.safeParse(sample).success).toBe(true)
    expect(sample.sample).toBe(true)
  })
})

describe('estado de los datos', () => {
  it('real con una instantánea de GA4; ejemplo si el servidor solo tiene el mock', () => {
    expect(dataStateOf(realReport(), '30d')).toBe('real')
    expect(dataStateOf(buildMockReport('7d'), '7d')).toBe('sample')
  })

  it('fallo si la API no responde o la respuesta no sirve', () => {
    const broken = [
      undefined,
      null,
      '<!doctype html>',
      {},
      { ...realReport(), range: '7d' }, // otro rango
      { ...realReport(), sample: 'no' },
      { ...realReport(), generatedAt: 'ayer' },
      { ...realReport(), kpis: {} },
    ]
    for (const response of broken) {
      expect(isUsableReport(response, '30d')).toBe(false)
      expect(dataStateOf(response, '30d')).toBe('failed')
    }
  })
})

describe('filtro por defecto', () => {
  it('1 mes con datos reales', () => {
    expect(defaultVisitsFilter('real')).toBe('30d')
  })

  it('«Datos de ejemplo» si la API falla o solo hay mock', () => {
    expect(defaultVisitsFilter('failed')).toBe(SAMPLE_FILTER)
    expect(defaultVisitsFilter('sample')).toBe(SAMPLE_FILTER)
  })
})

describe('nota bajo los filtros', () => {
  it('sin informe, nada', () => {
    expect(visitsNote(undefined, true)).toEqual({ kind: 'none' })
  })

  it('con datos reales, la hora de la instantánea', () => {
    expect(visitsNote(realReport(), true)).toEqual({ kind: 'updated', generatedAt: SNAPSHOT_AT })
  })

  it('ejemplo elegido habiendo datos reales, o ejemplo porque no los hay', () => {
    expect(visitsNote(buildMockReport('30d'), true)).toEqual({ kind: 'sampleChosen' })
    expect(visitsNote(buildMockReport('30d'), false)).toEqual({ kind: 'sampleFallback' })
  })
})

describe('textos de la nota (ES/EN)', () => {
  const locales = { es: esMessages.visits, en: enMessages.visits }

  it('cada estado tiene su texto, y la nota de ejemplo no repite la etiqueta del botón', () => {
    for (const visits of Object.values(locales)) {
      expect(visits.range.sample).toBeTruthy()
      for (const kind of ['sampleChosen', 'sampleFallback'] as const) {
        expect(visits.note[kind]).toBeTruthy()
        expect(visits.note[kind]).not.toContain(visits.range.sample)
      }
    }
  })

  it('tarjeta del Inicio: con datos reales, «{updated} · …»; el texto de ejemplo dice que es mock', () => {
    expect(locales.es.updatedNote).toBe('{updated} · solo agregados, sin IPs ni identificadores')
    expect(locales.en.updatedNote).toBe('{updated} · aggregated only, no IPs or identifiers')
    expect(locales.es.sampleNote).toMatch(/^Datos de ejemplo \(mock\)/)
    expect(locales.en.sampleNote).toMatch(/^Sample data \(mock\)/)
  })
})
