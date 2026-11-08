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

describe('Visits filters', () => {
  it('are the three ranges plus «Sample data» at the end', () => {
    expect(VISITS_FILTERS).toEqual([...VISITS_RANGES, SAMPLE_FILTER])
  })

  it('each range requests its report; sample uses month', () => {
    for (const range of VISITS_RANGES) expect(rangeOfFilter(range)).toBe(range)
    expect(rangeOfFilter(SAMPLE_FILTER)).toBe('30d')
    expect(SAMPLE_RANGE).toBe('30d')
  })

  it('client-generated sample satisfies endpoint contract', () => {
    const sample = buildMockReport(SAMPLE_RANGE)
    expect(VisitsReportSchema.safeParse(sample).success).toBe(true)
    expect(sample.sample).toBe(true)
  })
})

describe('data state', () => {
  it('real with GA4 snapshot; sample when server only has mock', () => {
    expect(dataStateOf(realReport(), '30d')).toBe('real')
    expect(dataStateOf(buildMockReport('7d'), '7d')).toBe('sample')
  })

  it('failed when API does not respond or response is unusable', () => {
    const broken = [
      undefined,
      null,
      '<!doctype html>',
      {},
      { ...realReport(), range: '7d' }, // wrong range
      { ...realReport(), sample: 'no' },
      { ...realReport(), generatedAt: 'yesterday' },
      { ...realReport(), kpis: {} },
    ]
    for (const response of broken) {
      expect(isUsableReport(response, '30d')).toBe(false)
      expect(dataStateOf(response, '30d')).toBe('failed')
    }
  })
})

describe('default filter', () => {
  it('1 month with real data', () => {
    expect(defaultVisitsFilter('real')).toBe('30d')
  })

  it('«Sample data» when API failed or only mock', () => {
    expect(defaultVisitsFilter('failed')).toBe(SAMPLE_FILTER)
    expect(defaultVisitsFilter('sample')).toBe(SAMPLE_FILTER)
  })
})

describe('note under filters', () => {
  it('no report, no note', () => {
    expect(visitsNote(undefined, true)).toEqual({ kind: 'none' })
  })

  it('with real data, snapshot time', () => {
    expect(visitsNote(realReport(), true)).toEqual({ kind: 'updated', generatedAt: SNAPSHOT_AT })
  })

  it('sample chosen while real exists, or sample because none', () => {
    expect(visitsNote(buildMockReport('30d'), true)).toEqual({ kind: 'sampleChosen' })
    expect(visitsNote(buildMockReport('30d'), false)).toEqual({ kind: 'sampleFallback' })
  })
})

describe('note copy (ES/EN)', () => {
  const locales = { es: esMessages.visits, en: enMessages.visits }

  it('each state has its text; sample note does not repeat button label', () => {
    for (const visits of Object.values(locales)) {
      expect(visits.range.sample).toBeTruthy()
      for (const kind of ['sampleChosen', 'sampleFallback'] as const) {
        expect(visits.note[kind]).toBeTruthy()
        expect(visits.note[kind]).not.toContain(visits.range.sample)
      }
    }
  })

  it('Profile card: with real data, «{updated} · …»; sample text says mock', () => {
    expect(locales.es.updatedNote).toBe('{updated} · solo agregados, sin IPs ni identificadores')
    expect(locales.en.updatedNote).toBe('{updated} · aggregated only, no IPs or identifiers')
    expect(locales.es.sampleNote).toMatch(/^Datos de ejemplo \(mock\)/)
    expect(locales.en.sampleNote).toMatch(/^Sample data \(mock\)/)
  })
})
