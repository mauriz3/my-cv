import { describe, expect, it } from 'vitest'
import {
  GA4_REPORT_NAMES,
  buildGa4Requests,
  fetchGa4Report,
  mapGa4Report,
  pageWithoutLocale,
  sourceKey,
  toPercentShares,
  visitsPeriods,
} from '../../lib/visitsGa4'
import { createGa4ReportFetcher, readGa4Config } from '../../lib/visitsGa4Config'
import { VisitsReportSchema } from '../../lib/visitsSchema'
import { NOW, TEST_PROPERTY_ID, TEST_SERVICE_ACCOUNT_JSON, TEST_TOKEN, fakeGoogleFetch, fakeRunReport, response } from './fixtures/ga4'

describe('visitsPeriods', () => {
  it('7d: los 7 días completos hasta ayer y los 7 anteriores', () => {
    const periods = visitsPeriods('7d', NOW)
    expect(periods.current).toEqual({ name: 'current', startDate: '2026-10-25', endDate: '2026-10-31' })
    expect(periods.previous).toEqual({ name: 'previous', startDate: '2026-10-18', endDate: '2026-10-24' })
    expect(periods.labels).toHaveLength(7)
    expect(periods.labels.at(-1)).toBe('2026-10-31')
    expect(periods.currentKeys[0]).toBe('20261025')
  })

  it('30d: 30 días y el mismo número en el anterior', () => {
    const periods = visitsPeriods('30d', NOW)
    expect(periods.current.startDate).toBe('2026-10-02')
    expect(periods.previous).toEqual({ name: 'previous', startDate: '2026-09-02', endDate: '2026-10-01' })
    expect(periods.previousKeys).toHaveLength(30)
  })

  it('1d: ayer por horas (24 etiquetas `YYYY-MM-DDTHH`) frente a anteayer', () => {
    const periods = visitsPeriods('1d', NOW)
    expect(periods.current).toEqual({ name: 'current', startDate: '2026-10-31', endDate: '2026-10-31' })
    expect(periods.previous.startDate).toBe('2026-10-30')
    expect(periods.labels[0]).toBe('2026-10-31T00')
    expect(periods.labels).toHaveLength(24)
    expect(periods.currentKeys[23]).toBe('2026103123')
    expect(periods.previousKeys[0]).toBe('2026103000')
  })
})

describe('buildGa4Requests', () => {
  it('7 informes; KPI y serie comparan dos periodos con nombre, los desgloses solo el actual', () => {
    const periods = visitsPeriods('7d', NOW)
    const requests = buildGa4Requests(periods, '7d')
    expect(Object.keys(requests)).toEqual([...GA4_REPORT_NAMES])
    expect(requests.kpis.dateRanges.map((range) => range.name)).toEqual(['current', 'previous'])
    expect(requests.kpis.metrics.map((metric) => metric.name)).toEqual(['sessions', 'totalUsers', 'averageSessionDuration', 'bounceRate'])
    expect(requests.timeseries.dimensions).toEqual([{ name: 'date' }])
    expect(requests.countries.dateRanges).toEqual([periods.current])
    expect(requests.pages.orderBys?.[0]).toEqual({ metric: { metricName: 'screenPageViews' }, desc: true })
  })

  it('1d agrupa la serie por hora', () => {
    expect(buildGa4Requests(visitsPeriods('1d', NOW), '1d').timeseries.dimensions).toEqual([{ name: 'dateHour' }])
  })
})

describe('mapeo de respuestas', () => {
  const periods = visitsPeriods('7d', NOW)
  const requests = buildGa4Requests(periods, '7d')
  const responses = Object.fromEntries(GA4_REPORT_NAMES.map((name) => [name, fakeRunReport(requests[name])])) as Parameters<
    typeof mapGa4Report
  >[2]
  const report = mapGa4Report('7d', periods, responses, NOW)

  it('cumple el contrato y no es de ejemplo', () => {
    expect(VisitsReportSchema.safeParse(report).success).toBe(true)
    expect(report.sample).toBe(false)
    expect(report.generatedAt).toBe(NOW.toISOString())
  })

  it('KPI: sesiones, usuarios, duración media (s) y rebote con cambios', () => {
    expect(report.kpis.visits).toEqual({ value: 320, prev: 300, delta: 0.07 })
    expect(report.kpis.visitors).toEqual({ value: 250, prev: 240, delta: 0.04 })
    expect(report.kpis.avgDurationSec.value).toBe(112)
    expect(report.kpis.bounceRate).toEqual({ value: 0.39, prev: 0.41, deltaPp: -2 })
  })

  it('serie: rellena con 0 los días sin filas y alinea el periodo anterior por posición', () => {
    expect(report.timeseries.labels).toEqual(periods.labels)
    expect(report.timeseries.current).toEqual([46, 0, 0, 0, 0, 0, 0])
    expect(report.timeseries.previous).toEqual([42, 0, 0, 0, 0, 0, 0])
  })

  it('dispositivos en % que suman 100, sin categorías fuera del contrato', () => {
    expect(report.devices).toEqual([
      { key: 'mobile', value: 58 },
      { key: 'desktop', value: 36 },
      { key: 'tablet', value: 6 },
    ])
  })

  it('países: los pequeños y «(not set)» van a «Otros»', () => {
    expect(report.countries).toEqual([
      { iso: 'ES', visits: 140 },
      { iso: 'US', visits: 80 },
      { iso: 'OTHER', visits: 5 },
    ])
  })

  it('fuentes: LinkedIn por origen, el resto por canal', () => {
    const shares = Object.fromEntries(report.sources.map((source) => [source.key, source.value]))
    expect(shares).toEqual({ organic: 41, direct: 28, linkedin: 18, referral: 9, other: 4 })
  })

  it('páginas: sin prefijo de idioma, sumadas y las 6 primeras', () => {
    expect(report.pages).toEqual([
      { path: '/', views: 500 },
      { path: '/experience', views: 200 },
      { path: '/projects', views: 120 },
      { path: '/skills', views: 90 },
      { path: '/visits', views: 40 },
      { path: '/education', views: 30 },
    ])
  })

  it('horas: lunes primero y franjas de 3 h', () => {
    expect(report.hours.values[6]?.[7]).toBe(5) // domingo 23 h
    expect(report.hours.values[0]?.[0]).toBe(5) // lunes 00 h + 02 h
    expect(report.hours.values[3]?.[4]).toBe(7) // jueves 13 h
  })

  it('sin filas (propiedad sin visitas): todo a 0 y sigue cumpliendo el contrato', () => {
    const empty = response([], [], [])
    const blank = Object.fromEntries(GA4_REPORT_NAMES.map((name) => [name, empty])) as typeof responses
    const emptyReport = mapGa4Report('30d', visitsPeriods('30d', NOW), blank, NOW)
    expect(VisitsReportSchema.safeParse(emptyReport).success).toBe(true)
    expect(emptyReport.kpis.visits.value).toBe(0)
    expect(emptyReport.countries).toEqual([])
  })
})

describe('utilidades', () => {
  it('toPercentShares reparte el resto para sumar 100', () => {
    expect(toPercentShares([1, 1, 1])).toEqual([34, 33, 33])
    expect(toPercentShares([0, 0])).toEqual([0, 0])
  })

  it('sourceKey', () => {
    expect(sourceKey('Organic Social', 'linkedin.com')).toBe('linkedin')
    expect(sourceKey('Organic Search', 'google')).toBe('organic')
    expect(sourceKey('Paid Search', 'google')).toBe('other')
  })

  it('pageWithoutLocale', () => {
    expect(pageWithoutLocale('/es')).toBe('/')
    expect(pageWithoutLocale('/en/projects/')).toBe('/projects')
    expect(pageWithoutLocale('/Resume-Maurizio-Rendon-en.pdf')).toBe('/Resume-Maurizio-Rendon-en.pdf')
    expect(pageWithoutLocale('/english')).toBe('/english')
  })
})

describe('cliente GA4', () => {
  it('pide un solo token y hace 7 runReport por rango a la propiedad configurada', async () => {
    const google = fakeGoogleFetch()
    const config = readGa4Config({ GA_PROPERTY_ID: TEST_PROPERTY_ID, GA_SERVICE_ACCOUNT_JSON: TEST_SERVICE_ACCOUNT_JSON })
    if (!config) throw new Error('config')
    const fetchReport = createGa4ReportFetcher(config, google.fetch, NOW)
    const [week, day] = await Promise.all([fetchReport('7d'), fetchReport('1d')])
    expect(VisitsReportSchema.safeParse(week).success).toBe(true)
    expect(day.timeseries.current[9]).toBe(4)
    const tokenCalls = google.calls.filter((call) => call.url.includes('oauth2'))
    const reportCalls = google.calls.filter((call) => call.url.endsWith(':runReport'))
    expect(tokenCalls).toHaveLength(1)
    expect(reportCalls).toHaveLength(14)
    expect(reportCalls[0]?.url).toBe(`https://analyticsdata.googleapis.com/v1beta/properties/${TEST_PROPERTY_ID}:runReport`)
    expect((reportCalls[0]?.init?.headers as Record<string, string>).authorization).toBe(`Bearer ${TEST_TOKEN}`)
  })

  it('un error de la API lleva el estado, no el token', async () => {
    const google = fakeGoogleFetch({ failRunReport: () => 403 })
    const options = { propertyId: TEST_PROPERTY_ID, getAccessToken: async () => TEST_TOKEN, fetch: google.fetch, now: NOW }
    const error = await fetchGa4Report('7d', options).catch((caught: Error) => caught)
    expect(String(error)).toContain('403 PERMISSION_DENIED')
    expect(String(error)).not.toContain(TEST_TOKEN)
  })
})

describe('readGa4Config', () => {
  it('sin variables no hay configuración (se sigue con la instantánea o el mock)', () => {
    expect(readGa4Config({})).toBeUndefined()
    expect(readGa4Config({ GA_PROPERTY_ID: TEST_PROPERTY_ID })).toBeUndefined()
  })

  it('rechaza un ID de propiedad que no sea numérico', () => {
    expect(() => readGa4Config({ GA_PROPERTY_ID: 'G-9HF9362QE9', GA_SERVICE_ACCOUNT_JSON: TEST_SERVICE_ACCOUNT_JSON })).toThrow('numérico')
  })
})
