/**
 * `/geo` (Netlify Edge Function): devuelve el país de la visita, `{ "country": "ES" }` o `{ "country": null }`,
 * para decidir si hace falta el aviso de analítica (lib/consentRegion.ts). Mismo origen (CSP connect-src 'self'),
 * sin guardar nada y sin caché: el país sale de la IP en el borde de Netlify y no se registra.
 * La web sigue siendo estática; en local (sin borde) la ruta no existe y el cliente muestra el aviso.
 */

/** Lo único que se usa del contexto de Netlify (`context.geo.country.code`, ISO 3166-1 alfa-2). */
export interface GeoContext {
  geo?: { country?: { code?: string } }
}

/** Solo lectura: cualquier otro método recibe 405. */
export const GEO_ALLOWED_METHODS = ['GET', 'HEAD'] as const
/**
 * Las cabeceras de `_headers` no llegan a las Edge Functions: se repiten aquí las que aplican.
 * HSTS es el mismo valor que ya envía todo el sitio (solo cubre www.mauriziorendon.com y sus subdominios).
 */
const SECURITY_HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
}
const METHOD_NOT_ALLOWED = 405

export default function geo(request: Request, context: GeoContext): Response {
  if (!(GEO_ALLOWED_METHODS as readonly string[]).includes(request.method)) {
    return new Response(null, {
      status: METHOD_NOT_ALLOWED,
      headers: { ...SECURITY_HEADERS, allow: GEO_ALLOWED_METHODS.join(', ') },
    })
  }
  return Response.json({ country: context.geo?.country?.code ?? null }, { headers: SECURITY_HEADERS })
}

export const config = { path: '/geo' }
