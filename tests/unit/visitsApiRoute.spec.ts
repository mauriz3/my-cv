import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp, createError, createRouter, defineEventHandler, getRouterParam, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildMockReport } from '../../lib/visitsMock'
import { VISITS_SNAPSHOT_VERSION } from '../../lib/visitsSnapshot'

const ROUTE = '/api/visits/:range'
/** Ruta en variable: usa auto-imports de Nitro que el typecheck de los tests no conoce (aquí se simulan con h3). */
const ROUTE_MODULE = '../../server/api/visits/[range].get'
const ORIGIN = 'http://localhost'

/** Carga la ruta de Nitro con las utilidades de h3 que Nitro auto-importa y la monta en una app h3. */
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

describe('ruta Nitro GET /api/visits/:range', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('sin instantánea local responde el mock del rango (lo que se prerrenderiza)', async () => {
    const response = await (await visitsRoute())('/api/visits/30d')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(buildMockReport('30d'))
  })

  it('con VISITS_SNAPSHOT_FILE sirve el informe de ese fichero', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'visits-route-')), 'snapshot.json')
    const report = { ...buildMockReport('7d'), sample: false }
    writeFileSync(file, JSON.stringify({ version: VISITS_SNAPSHOT_VERSION, updatedAt: report.generatedAt, reports: { '7d': report } }))
    const response = await (await visitsRoute(file))('/api/visits/7d')
    expect((await response.json()).sample).toBe(false)
  })

  it('404 en rangos desconocidos', async () => {
    const response = await (await visitsRoute())('/api/visits/1y')
    expect(response.status).toBe(404)
  })
})
