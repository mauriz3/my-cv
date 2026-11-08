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
 * The report depends only on the path, but Netlify's default cache key for functions includes the whole query
 * string, so `?anything` would bypass the cache and invoke the function. `Netlify-Vary: query=<name>` keys only on
 * the listed parameter and puts every other query string under one shared cache object; `none` is never read,
 * so `/api/visits/7d?x=1` and `/api/visits/7d` share the cached response.
 */
const CACHE_KEY_WITHOUT_QUERY = 'query=none'
/**
 * Browser always revalidates; Netlify CDN caches 10 min (durable: shared by all edge nodes) and serves stale
 * while refreshing. Snapshot updates every 3 h and each deploy clears the cache.
 */
const CACHE_HEADERS = {
  'cache-control': 'public, max-age=0, must-revalidate',
  'netlify-cdn-cache-control': 'public, durable, max-age=600, stale-while-revalidate=3600',
  'netlify-vary': CACHE_KEY_WITHOUT_QUERY,
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

// Netlify reads `config` statically: literal values only. Rate limit per visitor IP (code-based rule, all plans):
// far above what the page needs (one request per range shown), it caps scripted bursts with 429.
export const config = {
  path: '/api/visits/:range',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
