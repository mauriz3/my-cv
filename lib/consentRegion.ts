/**
 * ¿Hace falta el aviso de analítica? Solo en la UE/EEE, Reino Unido y Suiza (decisión de Maurizio).
 * Fuera de esa zona, Consent Mode se concede sin aviso. Si no se sabe el país (local, error, tiempo agotado),
 * se muestra el aviso. Lógica pura, sin Vue ni DOM.
 */
import type { ConsentChoice } from './analytics'

/** Endpoint de mismo origen servido por la Edge Function `netlify/edge-functions/geo.ts`. */
export const GEO_ENDPOINT = '/geo'
/** Si `/geo` no responde a tiempo, se trata como país desconocido (se muestra el aviso). */
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
/** EEE fuera de la UE. */
const EEA_EXTRA_COUNTRIES = ['IS', 'LI', 'NO'] as const

/** UE27 + IS, LI, NO + Reino Unido + Suiza (ISO 3166-1 alfa-2). */
export const CONSENT_BANNER_COUNTRIES: ReadonlySet<string> = new Set([
  ...EU_COUNTRIES,
  ...EEA_EXTRA_COUNTRIES,
  'GB',
  'CH',
])

const COUNTRY_CODE = /^[A-Z]{2}$/

/** País de la respuesta de `/geo`, o `null` si no viene o no es un código válido. */
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
 * Qué hacer al cargar, sin elección guardada todavía:
 * en la zona (o país desconocido) → mostrar el aviso; fuera → conceder sin aviso (sin guardarlo: se decide en cada visita).
 */
export type ConsentStartAction = 'keep-stored' | 'show-banner' | 'grant-without-banner'

export function consentStartAction(stored: ConsentChoice | null, country: string | null): ConsentStartAction {
  if (stored !== null) return 'keep-stored'
  return requiresConsentBanner(country) ? 'show-banner' : 'grant-without-banner'
}

/** Pide el país a `/geo`; cualquier fallo (red, HTTP, JSON, tiempo) da `null`. */
export async function fetchVisitorCountry(fetchFn: typeof fetch, timeoutMs = GEO_TIMEOUT_MS): Promise<string | null> {
  try {
    const response = await fetchFn(GEO_ENDPOINT, { cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) return null
    return parseGeoCountry(await response.json())
  } catch {
    return null
  }
}
