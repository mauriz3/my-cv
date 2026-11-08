/**
 * Is the analytics notice required? Only in the EU/EEA, UK, and Switzerland (Maurizio’s decision).
 * Outside that zone, Consent Mode is granted without a banner. If the country is unknown (local, error, timeout),
 * show the banner. Pure logic, no Vue or DOM.
 */
import type { ConsentChoice } from './analytics'

/** Same-origin endpoint served by Edge Function `netlify/edge-functions/geo.ts`. */
export const GEO_ENDPOINT = '/geo'
/** If `/geo` does not respond in time, treat as unknown country (show banner). */
export const GEO_TIMEOUT_MS = 3000

const EU_COUNTRIES = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
] as const
/** EEA outside the EU. */
const EEA_EXTRA_COUNTRIES = ['IS', 'LI', 'NO'] as const

/** EU27 + IS, LI, NO + United Kingdom + Switzerland (ISO 3166-1 alpha-2). */
export const CONSENT_BANNER_COUNTRIES: ReadonlySet<string> = new Set([
  ...EU_COUNTRIES,
  ...EEA_EXTRA_COUNTRIES,
  'GB',
  'CH',
])

const COUNTRY_CODE = /^[A-Z]{2}$/

/** Country from `/geo` response, or `null` if missing or not a valid code. */
export function parseGeoCountry(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('country' in body)) return null
  const { country } = body as { country: unknown }
  if (typeof country !== 'string') return null
  const code = country.toUpperCase()
  return COUNTRY_CODE.test(code) ? code : null
}

export function requiresConsentBanner(country: string | null): boolean {
  return country === null || CONSENT_BANNER_COUNTRIES.has(country)
}

/**
 * What to do on load with no stored choice yet:
 * in-zone (or unknown country) → show banner; outside → grant without banner (not stored: decided each visit).
 */
export type ConsentStartAction = 'keep-stored' | 'show-banner' | 'grant-without-banner'

export function consentStartAction(stored: ConsentChoice | null, country: string | null): ConsentStartAction {
  if (stored !== null) return 'keep-stored'
  return requiresConsentBanner(country) ? 'show-banner' : 'grant-without-banner'
}

/** Fetches country from `/geo`; any failure (network, HTTP, JSON, timeout) returns `null`. */
export async function fetchVisitorCountry(fetchFn: typeof fetch, timeoutMs = GEO_TIMEOUT_MS): Promise<string | null> {
  try {
    const response = await fetchFn(GEO_ENDPOINT, { cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) return null
    return parseGeoCountry(await response.json())
  } catch {
    return null
  }
}
