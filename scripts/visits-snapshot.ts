/**
 * Local GA4 snapshot test without Netlify: `npm run visits:snapshot`.
 * With GA_PROPERTY_ID and GA_SERVICE_ACCOUNT_JSON in the environment, fetches all 3 ranges from the Data API and writes
 * `.data/visits-snapshot.json` (gitignored). Then: `VISITS_SNAPSHOT_FILE=.data/visits-snapshot.json npm run dev`.
 * Prints ranges, visit totals, and errors only: never the key or token.
 */
import { fileSnapshotStore, LOCAL_SNAPSHOT_FILE } from '../lib/visitsFileStore'
import { runSnapshotJob } from '../netlify/functions/visits-snapshot'
import { validSnapshotReports } from '../lib/visitsSnapshot'

const store = fileSnapshotStore(LOCAL_SNAPSHOT_FILE)
const result = await runSnapshotJob({ env: process.env, store, fetch, now: new Date(), log: console })
if (!result?.written) process.exit(1)
for (const [range, report] of Object.entries(validSnapshotReports(await store.read()))) {
  console.log(`${range}: ${report.kpis.visits.value} visits (${report.timeseries.labels[0]} → ${report.timeseries.labels.at(-1)})`)
}
console.log(`Saved to ${LOCAL_SNAPSHOT_FILE}`)
