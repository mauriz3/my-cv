import { blobSnapshotStore } from '../../lib/visitsBlobStore'
import { createGa4ReportFetcher, readGa4Config } from '../../lib/visitsGa4Config'
import { refreshSnapshot, type RefreshResult, type SnapshotStore } from '../../lib/visitsSnapshot'

/**
 * Scheduled function (every 3 h, UTC): fetches GA4 Data API ranges 1d/7d/30d and stores the snapshot
 * in Netlify Blobs. Without `GA_PROPERTY_ID` / `GA_SERVICE_ACCOUNT_JSON` it does nothing (existing data keeps serving).
 * Not callable by URL: use «Run now» in Netlify (Functions → visits-snapshot) to force a run.
 * Logs include ranges and HTTP status only: never the key, token, or visit data.
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
    deps.log.error(`[visits-snapshot] Invalid configuration: ${error instanceof Error ? error.message : 'error'}`)
    return undefined
  }
  if (!config) {
    deps.log.warn('[visits-snapshot] Missing GA_PROPERTY_ID / GA_SERVICE_ACCOUNT_JSON: snapshot not updated')
    return undefined
  }
  const result = await refreshSnapshot(deps.store, createGa4ReportFetcher(config, deps.fetch, deps.now), deps.now)
  for (const { range, error } of result.failed) deps.log.error(`[visits-snapshot] ${range}: ${error}`)
  deps.log.info(`[visits-snapshot] updated: ${result.updated.join(', ') || 'none'}; written: ${result.written}`)
  return result
}

export default async (): Promise<void> => {
  await runSnapshotJob({ env: process.env, store: blobSnapshotStore(), fetch, now: new Date(), log: console })
}

// Netlify reads `config` statically: literal values only. Every 3 h on the hour (UTC).
export const config = { schedule: '0 */3 * * *' }
