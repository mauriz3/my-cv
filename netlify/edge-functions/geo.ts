/**
 * `/geo` (Netlify Edge Function): returns the visitor country as `{ "country": "ES" }` or `{ "country": null }`,
 * to decide whether the analytics notice is required (lib/consentRegion.ts). Same origin (CSP connect-src 'self'),
 * stores nothing and no cache: country comes from the IP at Netlify's edge and is not logged.
 * The site stays static; locally (no edge) the route is missing and the client shows the notice.
 */

/** The only Netlify context field used (`context.geo.country.code`, ISO 3166-1 alpha-2). */
export interface GeoContext {
  geo?: { country?: { code?: string } }
}

/** Read-only: any other method gets 405. */
export const GEO_ALLOWED_METHODS = ['GET', 'HEAD'] as const
/**
 * `_headers` rules do not apply to Edge Functions: repeat the ones that apply here.
 * HSTS matches what the rest of the site sends (covers www.mauriziorendon.com and subdomains only).
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
