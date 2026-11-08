import { isVisitsRange } from '~~/lib/visits'
import { fileSnapshotStore } from '~~/lib/visitsFileStore'
import { selectVisitsReport, snapshotSource, type VisitsDataSource } from '~~/lib/visitsSource'

/**
 * `GET /api/visits/:range` (1d · 7d · 30d) in Nuxt: aggregated visits, no IPs or identifiers.
 *
 * On generate (`nuxt generate`) the mock is prerendered: static fallback. On Netlify the route is served by
 * `netlify/functions/visits.ts` with the GA4 snapshot. In `nuxt dev`, with
 * `VISITS_SNAPSHOT_FILE=.data/visits-snapshot.json` (created by `npm run visits:snapshot`) that file is served.
 * Do not set that variable when generating: static JSON must stay the mock.
 */
const snapshotFile = process.env.VISITS_SNAPSHOT_FILE
const sources: VisitsDataSource[] = snapshotFile ? [snapshotSource(fileSnapshotStore(snapshotFile))] : []

export default defineEventHandler(async (event) => {
  const range = getRouterParam(event, 'range')
  if (!isVisitsRange(range)) throw createError({ statusCode: 404, statusMessage: 'Unknown range' })
  return (await selectVisitsReport(range, sources)).report
})
