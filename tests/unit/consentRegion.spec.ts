import { describe, expect, it } from 'vitest'
import geo, { config as geoConfig } from '../../netlify/edge-functions/geo'
import {
  CONSENT_BANNER_COUNTRIES,
  GEO_ENDPOINT,
  consentStartAction,
  fetchVisitorCountry,
  parseGeoCountry,
  requiresConsentBanner,
} from '../../lib/consentRegion'

const EU27 = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' ')

describe('analytics notice region', () => {
  it('EU27 + IS, LI, NO + GB + CH, and nothing else', () => {
    expect(EU27).toHaveLength(27)
    expect([...CONSENT_BANNER_COUNTRIES].sort()).toEqual([...EU27, 'IS', 'LI', 'NO', 'GB', 'CH'].sort())
  })

  it('notice in region and when country unknown; none outside', () => {
    for (const country of ['ES', 'DE', 'NO', 'GB', 'CH', null]) expect(requiresConsentBanner(country)).toBe(true)
    for (const country of ['US', 'MX', 'AR', 'JP', 'TR']) expect(requiresConsentBanner(country)).toBe(false)
  })

  it('stored choice wins; otherwise country decides', () => {
    expect(consentStartAction('denied', 'US')).toBe('keep-stored')
    expect(consentStartAction('granted', 'ES')).toBe('keep-stored')
    expect(consentStartAction(null, 'ES')).toBe('show-banner')
    expect(consentStartAction(null, null)).toBe('show-banner')
    expect(consentStartAction(null, 'US')).toBe('grant-without-banner')
  })
})

describe('/geo response', () => {
  it('only accepts a two-letter ISO code', () => {
    expect(parseGeoCountry({ country: 'es' })).toBe('ES')
    expect(parseGeoCountry({ country: 'US' })).toBe('US')
    expect(parseGeoCountry({ country: null })).toBeNull()
    expect(parseGeoCountry({ country: 'Spain' })).toBeNull()
    expect(parseGeoCountry({})).toBeNull()
    expect(parseGeoCountry('ES')).toBeNull()
    expect(parseGeoCountry(null)).toBeNull()
  })

  it('any request failure yields unknown country (and thus notice)', async () => {
    const failing = [
      () => Promise.reject(new TypeError('offline')),
      () => Promise.resolve(new Response('not found', { status: 404 })),
      () => Promise.resolve(new Response('rate limited', { status: 429 })),
      () => Promise.resolve(new Response('<html>', { status: 200 })),
    ]
    for (const fetchFn of failing) expect(await fetchVisitorCountry(fetchFn as typeof fetch)).toBeNull()
  })

  it('requests /geo with no cache and reads country', async () => {
    const calls: [unknown, RequestInit | undefined][] = []
    const fetchFn = (async (url: unknown, init?: RequestInit) => {
      calls.push([url, init])
      return Response.json({ country: 'MX' })
    }) as typeof fetch
    expect(await fetchVisitorCountry(fetchFn)).toBe('MX')
    expect(calls[0]?.[0]).toBe(GEO_ENDPOINT)
    expect(calls[0]?.[1]?.cache).toBe('no-store')
  })
})

describe('Edge Function /geo', () => {
  it('returns Netlify country with no cache, and null when missing', async () => {
    const withCountry = geo(new Request('https://example.test/geo'), { geo: { country: { code: 'FR' } } })
    expect(await withCountry.json()).toEqual({ country: 'FR' })
    expect(withCountry.headers.get('cache-control')).toBe('no-store')
    expect(withCountry.headers.get('content-type')).toContain('application/json')

    const withoutCountry = geo(new Request('https://example.test/geo'), {})
    expect(await withoutCountry.json()).toEqual({ country: null })
  })

  it('includes HSTS (_headers rules do not apply to the Edge Function)', () => {
    const response = geo(new Request('https://example.test/geo'), {})
    expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains')
  })

  it('allows GET and HEAD and responds 405 with Allow for the rest', () => {
    expect(geo(new Request('https://example.test/geo', { method: 'HEAD' }), {}).status).toBe(200)
    const post = geo(new Request('https://example.test/geo', { method: 'POST' }), {})
    expect(post.status).toBe(405)
    expect(post.headers.get('allow')).toBe('GET, HEAD')
    expect(post.headers.get('cache-control')).toBe('no-store')
  })

  it('trusts only Netlify geolocation, never client headers', async () => {
    const spoofed = new Request('https://example.test/geo', {
      headers: { 'x-forwarded-for': '8.8.8.8', 'x-country': 'US', 'x-nf-geo': 'US', 'cf-ipcountry': 'US' },
    })
    expect(await geo(spoofed, { geo: { country: { code: 'ES' } } }).json()).toEqual({ country: 'ES' })
    expect(await geo(spoofed, {}).json()).toEqual({ country: null })
  })

  it('is served on the same origin the client uses, with a per-IP rate limit', () => {
    expect(geoConfig.path).toBe(GEO_ENDPOINT)
    expect(geoConfig.rateLimit).toEqual({ windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] })
  })
})
