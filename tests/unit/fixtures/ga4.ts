import { generateKeyPairSync } from 'node:crypto'
import type { RunReportRequest, RunReportResponse } from '../../../lib/visitsGa4'

/** Simulated GA4 Data API responses (same format as runReport) and a test service account. */

export const NOW = new Date('2026-11-01T10:30:00Z')

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
export const TEST_PUBLIC_KEY = publicKey
export const TEST_SERVICE_ACCOUNT = {
  client_email: 'visits@my-cv-test.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
}
export const TEST_SERVICE_ACCOUNT_JSON = JSON.stringify({ type: 'service_account', ...TEST_SERVICE_ACCOUNT })
export const TEST_PROPERTY_ID = '123456789'
export const TEST_TOKEN = 'test-access-token'

type Cell = string | number
export function response(dimensions: string[], metrics: string[], rows: [Cell[], Cell[]][]): RunReportResponse {
  return {
    dimensionHeaders: dimensions.map((name) => ({ name })),
    metricHeaders: metrics.map((name) => ({ name })),
    rows: rows.map(([dims, values]) => ({
      dimensionValues: dims.map((value) => ({ value: String(value) })),
      metricValues: values.map((value) => ({ value: String(value) })),
    })),
  }
}

/** Simulated response from requested dimensions (as GA4 would with 7-day data). */
export function fakeRunReport(request: RunReportRequest): RunReportResponse {
  const dims = (request.dimensions ?? []).map((d) => d.name)
  const twoRanges = request.dateRanges.length > 1
  const withRange = twoRanges ? [...dims, 'dateRange'] : dims
  const metrics = request.metrics.map((m) => m.name)
  switch (dims.join(',')) {
    case '':
      return response(withRange, metrics, [
        [['current'], [320, 250, '112.4', '0.3912']],
        [['previous'], [300, 240, '106', '0.41']],
      ])
    case 'date': {
      const current = request.dateRanges[0]!.startDate.replaceAll('-', '')
      const previous = request.dateRanges[1]!.startDate.replaceAll('-', '')
      return response(withRange, metrics, [
        [[current, 'current'], [46]],
        [[previous, 'previous'], [42]],
      ])
    }
    case 'dateHour': {
      const day = request.dateRanges[0]!.startDate.replaceAll('-', '')
      return response(withRange, metrics, [[[`${day}09`, 'current'], [4]]])
    }
    case 'deviceCategory':
      return response(dims, metrics, [
        [['mobile'], [181]],
        [['desktop'], [112]],
        [['tablet'], [19]],
        [['smart tv'], [8]],
      ])
    case 'countryId':
      return response(dims, metrics, [
        [['ES'], [140]],
        [['US'], [80]],
        [['DE'], [3]],
        [['(not set)'], [2]],
      ])
    case 'sessionDefaultChannelGroup,sessionSource':
      return response(dims, metrics, [
        [['Organic Search', 'google'], [130]],
        [['Direct', '(direct)'], [90]],
        [['Organic Social', 'linkedin.com'], [50]],
        [['Referral', 'lnkd.in'], [8]],
        [['Referral', 'github.com'], [30]],
        [['Unassigned', '(not set)'], [12]],
      ])
    case 'pagePath':
      return response(dims, metrics, [
        [['/es/'], [300]],
        [['/en/'], [200]],
        [['/es/experience'], [150]],
        [['/en/experience/'], [50]],
        [['/es/projects'], [120]],
        [['/en/skills'], [90]],
        [['/es/visits'], [40]],
        [['/es/education'], [30]],
        [['/en/buy-cheap-pills.example'], [999]],
        [['/es/visits?utm_source=spam'], [25]],
      ])
    case 'dayOfWeek,hour':
      return response(dims, metrics, [
        [['0', '23'], [5]],
        [['1', '00'], [2]],
        [['1', '02'], [3]],
        [['4', '13'], [7]],
      ])
    default:
      throw new Error(`Unexpected request: ${dims.join(',')}`)
  }
}

/** Simulated `fetch`: Google OAuth token and runReport. Records requests for inspection. */
export function fakeGoogleFetch(options: { failRunReport?: (request: RunReportRequest) => number | undefined } = {}) {
  const calls: { url: string; init?: RequestInit }[] = []
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init })
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: TEST_TOKEN, expires_in: 3599 })
    if (url.endsWith(':runReport')) {
      const request = JSON.parse(String(init?.body)) as RunReportRequest
      const failure = options.failRunReport?.(request)
      if (failure) return Response.json({ error: { code: failure, status: 'PERMISSION_DENIED' } }, { status: failure })
      return Response.json(fakeRunReport(request))
    }
    return new Response(null, { status: 404 })
  }) as typeof fetch
  return { fetch: fetchFn, calls }
}
