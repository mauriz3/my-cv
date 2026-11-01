import { fetchAccessToken, parseServiceAccount, type ServiceAccount } from './googleServiceAccount'
import type { VisitsRange } from './visits'
import { fetchGa4Report } from './visitsGa4'

/**
 * Configuración de GA4 desde variables de entorno (solo en el servidor: Netlify o local).
 * `GA_PROPERTY_ID`: ID numérico de la propiedad. `GA_SERVICE_ACCOUNT_JSON`: JSON de la clave de la cuenta de servicio.
 */
export const GA_PROPERTY_ID_ENV = 'GA_PROPERTY_ID'
export const GA_SERVICE_ACCOUNT_ENV = 'GA_SERVICE_ACCOUNT_JSON'
const PROPERTY_ID = /^\d+$/

export interface Ga4Config {
  propertyId: string
  serviceAccount: ServiceAccount
}

/** `undefined` si falta alguna variable (entonces se sigue con la instantánea anterior o el mock). Lanza si están mal formadas. */
export function readGa4Config(env: Record<string, string | undefined>): Ga4Config | undefined {
  const propertyId = env[GA_PROPERTY_ID_ENV]?.trim()
  const serviceAccountJson = env[GA_SERVICE_ACCOUNT_ENV]
  if (!propertyId || !serviceAccountJson) return undefined
  if (!PROPERTY_ID.test(propertyId)) throw new Error(`${GA_PROPERTY_ID_ENV} debe ser el ID numérico de la propiedad`)
  return { propertyId, serviceAccount: parseServiceAccount(serviceAccountJson) }
}

/** `(rango) → informe GA4` con un solo token OAuth por ejecución. */
export function createGa4ReportFetcher(config: Ga4Config, fetchFn: typeof fetch, now: Date) {
  let token: Promise<string> | undefined
  const getAccessToken = () => (token ??= fetchAccessToken(config.serviceAccount, fetchFn, now))
  return (range: VisitsRange) => fetchGa4Report(range, { propertyId: config.propertyId, getAccessToken, fetch: fetchFn, now })
}
