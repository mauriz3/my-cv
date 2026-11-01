import { isVisitsRange } from '~~/lib/visits'
import { fileSnapshotStore } from '~~/lib/visitsFileStore'
import { selectVisitsReport, snapshotSource, type VisitsDataSource } from '~~/lib/visitsSource'

/**
 * `GET /api/visits/:range` (1d · 7d · 30d) en Nuxt: visitas agregadas, sin IPs ni identificadores.
 *
 * Al generar (`nuxt generate`) se prerrenderiza el mock: es el respaldo estático. En Netlify la ruta la sirve
 * la función `netlify/functions/visits.ts` con la instantánea de GA4. En `nuxt dev`, con
 * `VISITS_SNAPSHOT_FILE=.data/visits-snapshot.json` (lo crea `npm run visits:snapshot`) se sirve ese fichero.
 * No definir esa variable al generar: el JSON estático debe seguir siendo el mock.
 */
const snapshotFile = process.env.VISITS_SNAPSHOT_FILE
const sources: VisitsDataSource[] = snapshotFile ? [snapshotSource(fileSnapshotStore(snapshotFile))] : []

export default defineEventHandler(async (event) => {
  const range = getRouterParam(event, 'range')
  if (!isVisitsRange(range)) throw createError({ statusCode: 404, statusMessage: 'Unknown range' })
  return (await selectVisitsReport(range, sources)).report
})
