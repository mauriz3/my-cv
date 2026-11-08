import { isVisitsRange } from '../../lib/visits'
import { blobSnapshotStore } from '../../lib/visitsBlobStore'
import type { SnapshotStore } from '../../lib/visitsSnapshot'
import { mockSource, selectVisitsReport, snapshotSource } from '../../lib/visitsSource'

/**
 * `GET /api/visits/:range` on Netlify: GA4 snapshot (Netlify Blobs), or the mock if missing or invalid.
 * Overrides prerendered JSON (static fallback when the function is absent, e.g. locally).
 * Same origin: CSP (`connect-src 'self'`) and the client (`useVisits`) stay unchanged.
 */

/** `_headers` rules do not reach functions: repeat the ones that apply to JSON. */
const BASE_HEADERS = {
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
}
/**
 * Browser always revalidates; Netlify CDN caches 10 min and serves stale while refreshing.
 * Snapshot updates every 3 h and each deploy clears the cache.
 */
const CACHE_HEADERS = {
  'cache-control': 'public, max-age=0, must-revalidate',
  'netlify-cdn-cache-control': 'public, max-age=600, stale-while-revalidate=3600',
}
const ALLOWED_METHODS = ['GET', 'HEAD']
const NOT_FOUND = 404
const METHOD_NOT_ALLOWED = 405
/** Diagnostic header (no sensitive data): which source produced the report. Checked on deploy. */
export const VISITS_SOURCE_HEADER = 'x-visits-source'

interface FunctionContext {
  params: Record<string, string | undefined>
}

export function createVisitsHandler(store: SnapshotStore) {
  const sources = [snapshotSource(store), mockSource]
  return async (request: Request, context: FunctionContext): Promise<Response> => {
    if (!ALLOWED_METHODS.includes(request.method)) {
      return new Response(null, { status: METHOD_NOT_ALLOWED, headers: { ...BASE_HEADERS, allow: ALLOWED_METHODS.join(', ') } })
    }
    const range = context.params.range
    if (!isVisitsRange(range)) return Response.json({ error: 'Unknown range' }, { status: NOT_FOUND, headers: BASE_HEADERS })
    const { report, source } = await selectVisitsReport(range, sources)
    return Response.json(report, { headers: { ...BASE_HEADERS, ...CACHE_HEADERS, [VISITS_SOURCE_HEADER]: source } })
  }
}

export default createVisitsHandler(blobSnapshotStore())

// Netlify reads `config` statically: literal values only.
export const config = { path: '/api/visits/:range' }
