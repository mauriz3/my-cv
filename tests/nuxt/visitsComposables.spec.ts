import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { formatInteger } from '~~/lib/visits'
import { buildMockReport } from '~~/lib/visitsMock'
import type { VisitsFilter } from '~~/lib/visitsFilter'
import { withSetup } from './helpers'

const realReport = (range: '1d' | '7d' | '30d') => ({ ...buildMockReport(range), sample: false })
/** El informe real tarda un poco: deja ver qué pasa si otra respuesta llega antes. */
const REAL_REPORT_DELAY_MS = 40
registerEndpoint('/api/visits/7d', async () => {
  await new Promise((resolve) => setTimeout(resolve, REAL_REPORT_DELAY_MS))
  return realReport('7d')
})
registerEndpoint('/api/visits/30d', () => ({ range: 'otro' }))
registerEndpoint('/api/visits/1d', () => {
  throw createError({ statusCode: 503, statusMessage: 'Caída' })
})

describe('useVisitsFormat', () => {
  it('formatea números, porcentajes y nombres en el idioma activo', async () => {
    const { result } = await withSetup(() => ({ format: useVisitsFormat(), i18n: useI18n() }))
    const { format } = result
    expect(format.language.value).toBe('en-GB')
    expect(format.integer(1234)).toBe(formatInteger(1234, 'en-GB'))
    expect(format.percent(58)).toBe('58%')
    expect(format.slotLabel('09')).toBe('09h')
    expect(format.countryName('ES')).toBe('Spain')
    expect(format.countryName('OTHER')).toBe('Other')
    expect(format.pageName('/experience')).toBe('Experience')
    expect(format.pageName('/Resume-Maurizio-Rendon-en.pdf')).toBe('Resume (PDF)')
    expect(format.pageName('/desconocida')).toBe('/desconocida')
    await result.i18n.setLocale('es')
    expect(format.countryName('ES')).toBe('España')
    expect(format.pageName('/experience')).toBe('Experiencia')
    await result.i18n.setLocale('en')
  })
})

describe('useVisitsTables', () => {
  it('sin informe no hay tablas; con informe, una por gráfica con los mismos datos', async () => {
    const report = ref<ReturnType<typeof buildMockReport>>()
    const { result: tables } = await withSetup(() => useVisitsTables(report))
    expect(tables.value).toBeUndefined()

    report.value = buildMockReport('7d')
    const value = tables.value!
    expect(Object.keys(value)).toEqual(['timeline', 'devices', 'countries', 'sources', 'pages', 'hours'])
    expect(value.timeline.caption).toBe('Visits over time · 1 week')
    expect(value.timeline.columns).toEqual(['Day', 'This period', 'Previous period'])
    expect(value.timeline.rows).toHaveLength(report.value.timeseries.labels.length)
    expect(value.countries.rows).toHaveLength(report.value.countries.length)
    expect(value.hours.columns).toHaveLength(report.value.hours.slots.length + 1)
    expect(value.hours.rows[0]![0]).toBe('Mon')
  })
})

describe('useVisitsNote', () => {
  it('con datos reales dice cuándo se actualizaron; con datos de ejemplo, de qué tipo son', async () => {
    const report = ref<ReturnType<typeof buildMockReport>>()
    const realDataAvailable = ref(false)
    const { result: note } = await withSetup(() => useVisitsNote(report, realDataAvailable))
    expect(note.value).toEqual({ kind: 'none', updatedAgo: '' })

    report.value = buildMockReport('7d')
    expect(note.value).toEqual({ kind: 'sampleFallback', updatedAgo: '' })
    realDataAvailable.value = true
    expect(note.value.kind).toBe('sampleChosen')

    report.value = { ...buildMockReport('7d'), sample: false, generatedAt: new Date(Date.now() - 2 * 3_600_000).toISOString() }
    expect(note.value.kind).toBe('updated')
    expect(note.value.updatedAgo).toBe('Data updated 2 h ago')
  })
})

describe('useVisits', () => {
  it('pide el informe del filtro al montar y al cambiarlo, y dice de dónde sale', async () => {
    const filter = ref<VisitsFilter>('7d')
    const { result } = await withSetup(() => useVisits(filter))
    await waitUntil(() => result.status.value === 'ready')
    expect(result.status.value).toBe('ready')
    expect(result.dataState.value).toBe('real')
    expect(result.report.value?.range).toBe('7d')

    filter.value = 'sample'
    await waitUntil(() => result.dataState.value === 'sample')
    expect(result.report.value).toEqual(buildMockReport('30d'))
  })

  it('una respuesta que no es un informe del rango, o un error, deja estado de error y conserva el anterior', async () => {
    const filter = ref<VisitsFilter>('7d')
    const { result } = await withSetup(() => useVisits(filter))
    await waitUntil(() => result.status.value === 'ready')
    const previous = result.report.value

    filter.value = '30d'
    await waitUntil(() => result.status.value === 'error')
    expect(result.dataState.value).toBe('failed')
    expect(result.report.value).toBe(previous)
    await result.retry()
    expect(result.status.value).toBe('error')

    filter.value = '7d'
    await waitUntil(() => result.status.value === 'ready')
    expect(result.dataState.value).toBe('real')
  })

  it('si la API falla, estado de error y sin informe', async () => {
    const { result } = await withSetup(() => useVisits(ref<VisitsFilter>('1d')))
    await waitUntil(() => result.status.value === 'error')
    expect(result.dataState.value).toBe('failed')
    expect(result.report.value).toBeUndefined()
  })

  it('si llega tarde la respuesta de un filtro anterior, se descarta', async () => {
    const filter = ref<VisitsFilter>('7d')
    const { result } = await withSetup(() => useVisits(filter))
    filter.value = 'sample'
    await waitUntil(() => result.dataState.value === 'sample')
    await new Promise((resolve) => setTimeout(resolve, REAL_REPORT_DELAY_MS * 2))
    expect(result.dataState.value).toBe('sample')
    expect(result.report.value?.sample).toBe(true)
  })
})

/** Espera a que se cumpla una condición (imports diferidos del mock). */
async function waitUntil(condition: () => boolean, attempts = 50) {
  for (let attempt = 0; attempt < attempts && !condition(); attempt++) await new Promise((resolve) => setTimeout(resolve, 10))
  expect(condition()).toBe(true)
}
