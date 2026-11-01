import { blobSnapshotStore } from '../../lib/visitsBlobStore'
import { createGa4ReportFetcher, readGa4Config } from '../../lib/visitsGa4Config'
import { refreshSnapshot, type RefreshResult, type SnapshotStore } from '../../lib/visitsSnapshot'

/**
 * Función programada (cada 3 h, UTC): pide a la GA4 Data API los rangos 1d/7d/30d y guarda la instantánea
 * en Netlify Blobs. Sin `GA_PROPERTY_ID` / `GA_SERVICE_ACCOUNT_JSON` no hace nada (se sigue sirviendo lo que haya).
 * No se puede llamar por URL: «Run now» en Netlify (Functions → visits-snapshot) para forzarla.
 * Los registros solo llevan rangos y estados HTTP: nunca la clave, el token ni datos de visitas.
 */

export interface SnapshotJobDeps {
  env: Record<string, string | undefined>
  store: SnapshotStore
  fetch: typeof fetch
  now: Date
  log: Pick<Console, 'info' | 'warn' | 'error'>
}

export async function runSnapshotJob(deps: SnapshotJobDeps): Promise<RefreshResult | undefined> {
  let config
  try {
    config = readGa4Config(deps.env)
  } catch (error) {
    deps.log.error(`[visits-snapshot] Configuración no válida: ${error instanceof Error ? error.message : 'error'}`)
    return undefined
  }
  if (!config) {
    deps.log.warn('[visits-snapshot] Sin GA_PROPERTY_ID / GA_SERVICE_ACCOUNT_JSON: no se actualiza la instantánea')
    return undefined
  }
  const result = await refreshSnapshot(deps.store, createGa4ReportFetcher(config, deps.fetch, deps.now), deps.now)
  for (const { range, error } of result.failed) deps.log.error(`[visits-snapshot] ${range}: ${error}`)
  deps.log.info(`[visits-snapshot] actualizados: ${result.updated.join(', ') || 'ninguno'}; guardado: ${result.written}`)
  return result
}

export default async (): Promise<void> => {
  await runSnapshotJob({ env: process.env, store: blobSnapshotStore(), fetch, now: new Date(), log: console })
}

// Netlify lee `config` de forma estática: valores literales. Cada 3 h en punto (UTC).
export const config = { schedule: '0 */3 * * *' }
