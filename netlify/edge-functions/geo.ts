/**
 * `/geo` (Netlify Edge Function): returns the visitor country as `{ "country": "ES" }` or `{ "country": null }`,
 * to decide whether the analytics notice is required (lib/consentRegion.ts). Same origin (CSP connect-src 'self'),
 * stores nothing and no cache: country comes from the IP at Netlify's edge and is not logged.
 * The site stays static; locally (no edge) the route is missing and the client shows the notice.
 *
 * Trust boundary: the country comes only from Netlify's own geolocation (`context.geo`); request headers
 * (`X-Forwarded-For`, `X-Country`, …) are never read here. Netlify may still derive `context.geo` from a
 * client-supplied `X-Forwarded-For`, so a visitor can change their own answer. That only affects the visitor
 * who sends the header (a third-party page cannot set it on someone else's browser), and every failure path
 * (no geo, 429, error, timeout) yields `null` and therefore the notice with analytics denied (fail safe).
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

// Netlify reads `config` statically: literal values only. Rate limit per visitor IP (code-based rule, all plans):
// over the limit Netlify answers 429, the client treats it as unknown country and shows the notice.
export const config = {
  path: '/geo',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
