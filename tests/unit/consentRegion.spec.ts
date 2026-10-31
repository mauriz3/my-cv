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

describe('zona con aviso de analítica', () => {
  it('UE27 + IS, LI, NO + GB + CH, y nada más', () => {
    expect(EU27).toHaveLength(27)
    expect([...CONSENT_BANNER_COUNTRIES].sort()).toEqual([...EU27, 'IS', 'LI', 'NO', 'GB', 'CH'].sort())
  })

  it('aviso en la zona y con país desconocido; fuera, no', () => {
    for (const country of ['ES', 'DE', 'NO', 'GB', 'CH', null]) expect(requiresConsentBanner(country)).toBe(true)
    for (const country of ['US', 'MX', 'AR', 'JP', 'TR']) expect(requiresConsentBanner(country)).toBe(false)
  })

  it('la elección guardada manda; si no hay, decide el país', () => {
    expect(consentStartAction('denied', 'US')).toBe('keep-stored')
    expect(consentStartAction('granted', 'ES')).toBe('keep-stored')
    expect(consentStartAction(null, 'ES')).toBe('show-banner')
    expect(consentStartAction(null, null)).toBe('show-banner')
    expect(consentStartAction(null, 'US')).toBe('grant-without-banner')
  })
})

describe('respuesta de /geo', () => {
  it('solo acepta un código ISO de dos letras', () => {
    expect(parseGeoCountry({ country: 'es' })).toBe('ES')
    expect(parseGeoCountry({ country: 'US' })).toBe('US')
    expect(parseGeoCountry({ country: null })).toBeNull()
    expect(parseGeoCountry({ country: 'Spain' })).toBeNull()
    expect(parseGeoCountry({})).toBeNull()
    expect(parseGeoCountry('ES')).toBeNull()
    expect(parseGeoCountry(null)).toBeNull()
  })

  it('cualquier fallo de la petición da país desconocido (y por tanto aviso)', async () => {
    const failing = [
      () => Promise.reject(new TypeError('offline')),
      () => Promise.resolve(new Response('not found', { status: 404 })),
      () => Promise.resolve(new Response('<html>', { status: 200 })),
    ]
    for (const fetchFn of failing) expect(await fetchVisitorCountry(fetchFn as typeof fetch)).toBeNull()
  })

  it('pide /geo sin caché y lee el país', async () => {
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
  it('devuelve el país de Netlify sin caché, y null si no lo hay', async () => {
    const withCountry = geo(new Request('https://example.test/geo'), { geo: { country: { code: 'FR' } } })
    expect(await withCountry.json()).toEqual({ country: 'FR' })
    expect(withCountry.headers.get('cache-control')).toBe('no-store')
    expect(withCountry.headers.get('content-type')).toContain('application/json')

    const withoutCountry = geo(new Request('https://example.test/geo'), {})
    expect(await withoutCountry.json()).toEqual({ country: null })
  })

  it('se sirve en el mismo origen que usa el cliente', () => {
    expect(geoConfig.path).toBe(GEO_ENDPOINT)
  })
})
