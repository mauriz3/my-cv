import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp, createError, createRouter, defineEventHandler, getRouterParam, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildMockReport } from '../../lib/visitsMock'
import { VISITS_SNAPSHOT_VERSION } from '../../lib/visitsSnapshot'

const ROUTE = '/api/visits/:range'
/** Dynamic route: Nitro auto-imports that unit typecheck does not know (simulated here with h3). */
const ROUTE_MODULE = '../../server/api/visits/[range].get'
const ORIGIN = 'http://localhost'

/** Loads the Nitro route with h3 utilities Nitro auto-imports and mounts it on an h3 app. */
async function visitsRoute(snapshotFile?: string) {
  vi.resetModules()
  vi.stubGlobal('defineEventHandler', defineEventHandler)
  vi.stubGlobal('getRouterParam', getRouterParam)
  vi.stubGlobal('createError', createError)
  vi.stubEnv('VISITS_SNAPSHOT_FILE', snapshotFile ?? '')
  const { default: handler } = (await import(/* @vite-ignore */ ROUTE_MODULE)) as { default: Parameters<ReturnType<typeof createRouter>['get']>[1] }
  const app = createApp().use(createRouter().get(ROUTE, handler))
  const handle = toWebHandler(app)
  return (path: string) => handle(new Request(`${ORIGIN}${path}`))
}

describe('Nitro GET /api/visits/:range', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('without local snapshot returns range mock (what prerender uses)', async () => {
    const response = await (await visitsRoute())('/api/visits/30d')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(buildMockReport('30d'))
  })

  it('with VISITS_SNAPSHOT_FILE serves report from that file', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'visits-route-')), 'snapshot.json')
    const report = { ...buildMockReport('7d'), sample: false }
    writeFileSync(file, JSON.stringify({ version: VISITS_SNAPSHOT_VERSION, updatedAt: report.generatedAt, reports: { '7d': report } }))
    const response = await (await visitsRoute(file))('/api/visits/7d')
    expect((await response.json()).sample).toBe(false)
  })

  it('404 for unknown ranges', async () => {
    const response = await (await visitsRoute())('/api/visits/1y')
    expect(response.status).toBe(404)
  })
})
