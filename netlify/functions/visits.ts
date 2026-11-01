import { isVisitsRange } from '../../lib/visits'
import { blobSnapshotStore } from '../../lib/visitsBlobStore'
import type { SnapshotStore } from '../../lib/visitsSnapshot'
import { mockSource, selectVisitsReport, snapshotSource } from '../../lib/visitsSource'

/**
 * `GET /api/visits/:range` en Netlify: la instantánea de GA4 (Netlify Blobs) o, si no hay o no es válida, el mock.
 * Tapa al JSON prerrenderizado (que queda como respaldo estático si la función no existe, p. ej. en local).
 * Mismo origen: la CSP (`connect-src 'self'`) no cambia y el cliente (`useVisits`) tampoco.
 */

/** Las cabeceras de `_headers` no llegan a las funciones: se repiten las que aplican a un JSON. */
const BASE_HEADERS = {
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
}
/**
 * El navegador revalida siempre; la CDN de Netlify guarda 10 min y sirve la copia anterior mientras renueva.
 * La instantánea cambia cada 3 h y cada despliegue vacía la caché.
 */
const CACHE_HEADERS = {
  'cache-control': 'public, max-age=0, must-revalidate',
  'netlify-cdn-cache-control': 'public, max-age=600, stale-while-revalidate=3600',
}
const ALLOWED_METHODS = ['GET', 'HEAD']
const NOT_FOUND = 404
const METHOD_NOT_ALLOWED = 405
/** Cabecera de diagnóstico (sin datos sensibles): de qué fuente salió el informe. La comprueba el deploy. */
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

// Netlify lee `config` de forma estática: valores literales.
export const config = { path: '/api/visits/:range' }
