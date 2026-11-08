import { describe, expect, it, vi } from 'vitest'
import { buildMockReport } from '../../lib/visitsMock'
import { VISITS_SNAPSHOT_VERSION, type SnapshotStore, type VisitsSnapshot } from '../../lib/visitsSnapshot'
import { VisitsReportSchema } from '../../lib/visitsSchema'
import { VISITS_SOURCE_HEADER, config as visitsConfig, createVisitsHandler } from '../../netlify/functions/visits'
import { config as snapshotConfig, runSnapshotJob } from '../../netlify/functions/visits-snapshot'
import { NOW, TEST_PROPERTY_ID, TEST_SERVICE_ACCOUNT, TEST_SERVICE_ACCOUNT_JSON, TEST_TOKEN, fakeGoogleFetch } from './fixtures/ga4'

function memoryStore(initial?: unknown): SnapshotStore & { value: () => unknown } {
  let value = initial
  return { value: () => value, read: async () => value, write: async (snapshot: VisitsSnapshot) => void (value = snapshot) }
}

const request = (method = 'GET') => new Request('https://example.test/api/visits/7d', { method })
const silentLog = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })

describe('function /api/visits/:range', () => {
  it('served at same path as prerendered JSON', () => {
    expect(visitsConfig.path).toBe('/api/visits/:range')
  })

  it('without snapshot returns mock, short CDN cache, and security headers', async () => {
    const response = await createVisitsHandler(memoryStore())(request(), { params: { range: '7d' } })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(buildMockReport('7d'))
    expect(response.headers.get(VISITS_SOURCE_HEADER)).toBe('mock')
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.headers.get('netlify-cdn-cache-control')).toContain('max-age=600')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('with snapshot returns real report', async () => {
    const report = { ...buildMockReport('7d'), sample: false, generatedAt: NOW.toISOString() }
    const store = memoryStore({ version: VISITS_SNAPSHOT_VERSION, updatedAt: NOW.toISOString(), reports: { '7d': report } })
    const response = await createVisitsHandler(store)(request(), { params: { range: '7d' } })
    expect(response.headers.get(VISITS_SOURCE_HEADER)).toBe('snapshot')
    expect((await response.json()).sample).toBe(false)
  })

  it('404 for unknown ranges and 405 for non-read methods', async () => {
    const handler = createVisitsHandler(memoryStore())
    expect((await handler(request(), { params: { range: '90d' } })).status).toBe(404)
    const post = await handler(request('POST'), { params: { range: '7d' } })
    expect(post.status).toBe(405)
    expect(post.headers.get('allow')).toBe('GET, HEAD')
  })
})

describe('scheduled function visits-snapshot', () => {
  it('every 3 h', () => {
    expect(snapshotConfig.schedule).toBe('0 */3 * * *')
  })

  it('from simulated GA4 to snapshot, without logging key or token', async () => {
    const store = memoryStore()
    const google = fakeGoogleFetch()
    const log = silentLog()
    const env = { GA_PROPERTY_ID: TEST_PROPERTY_ID, GA_SERVICE_ACCOUNT_JSON: TEST_SERVICE_ACCOUNT_JSON }
    const result = await runSnapshotJob({ env, store, fetch: google.fetch, now: NOW, log })
    expect(result?.updated).toEqual(['1d', '7d', '30d'])
    const saved = store.value() as VisitsSnapshot
    for (const report of Object.values(saved.reports)) expect(VisitsReportSchema.safeParse(report).success).toBe(true)
    const logged = JSON.stringify([log.info.mock.calls, log.warn.mock.calls, log.error.mock.calls])
    expect(logged).not.toContain(TEST_TOKEN)
    expect(logged).not.toContain('PRIVATE KEY')
    expect(logged).not.toContain(TEST_SERVICE_ACCOUNT.client_email)
  })

  it('without GA env vars, does nothing', async () => {
    const store = memoryStore()
    const log = silentLog()
    expect(await runSnapshotJob({ env: {}, store, fetch: fakeGoogleFetch().fetch, now: NOW, log })).toBeUndefined()
    expect(store.value()).toBeUndefined()
    expect(log.warn).toHaveBeenCalledOnce()
  })

  it('when API denies permission, logs status and does not write', async () => {
    const store = memoryStore()
    const log = silentLog()
    const env = { GA_PROPERTY_ID: TEST_PROPERTY_ID, GA_SERVICE_ACCOUNT_JSON: TEST_SERVICE_ACCOUNT_JSON }
    const result = await runSnapshotJob({ env, store, fetch: fakeGoogleFetch({ failRunReport: () => 403 }).fetch, now: NOW, log })
    expect(result?.written).toBe(false)
    expect(String(log.error.mock.calls[0]?.[0])).toContain('403')
  })
})

describe('scheduled function entry (Netlify)', () => {
  it('without GA4 credentials does not touch snapshot and only warns', async () => {
    vi.stubEnv('GA_PROPERTY_ID', '')
    vi.stubEnv('GA_SERVICE_ACCOUNT_JSON', '')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { default: scheduledFunction } = await import('../../netlify/functions/visits-snapshot')
    await scheduledFunction()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('GA_PROPERTY_ID'))
    warn.mockRestore()
    vi.unstubAllEnvs()
  })
})
