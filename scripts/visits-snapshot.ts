/**
 * Prueba local de la instantánea de GA4, sin Netlify: `npm run visits:snapshot`.
 * Con GA_PROPERTY_ID y GA_SERVICE_ACCOUNT_JSON en el entorno pide los 3 rangos a la Data API y escribe
 * `.data/visits-snapshot.json` (ignorado por git). Después: `VISITS_SNAPSHOT_FILE=.data/visits-snapshot.json npm run dev`.
 * Solo imprime rangos, totales de visitas y errores: nunca la clave ni el token.
 */
import { fileSnapshotStore, LOCAL_SNAPSHOT_FILE } from '../lib/visitsFileStore'
import { runSnapshotJob } from '../netlify/functions/visits-snapshot'
import { validSnapshotReports } from '../lib/visitsSnapshot'

const store = fileSnapshotStore(LOCAL_SNAPSHOT_FILE)
const result = await runSnapshotJob({ env: process.env, store, fetch, now: new Date(), log: console })
if (!result?.written) process.exit(1)
for (const [range, report] of Object.entries(validSnapshotReports(await store.read()))) {
  console.log(`${range}: ${report.kpis.visits.value} visitas (${report.timeseries.labels[0]} → ${report.timeseries.labels.at(-1)})`)
}
console.log(`Guardado en ${LOCAL_SNAPSHOT_FILE}`)
